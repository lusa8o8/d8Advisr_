import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PartnerEvent, ListingStatus } from '@/lib/types';

export interface PartnerProfile {
  id: string;
  name: string;
  partner_type: 'venue' | 'organizer' | 'both';
  city: string;
  contact: string;
  status: ListingStatus;
}

function dbEventToPartnerEvent(row: Record<string, unknown>): PartnerEvent {
  const spotsTotal = Number(row.spots_total ?? 0);
  const spotsFilled = Number(row.spots_filled ?? 0);
  const isFree = Boolean(row.is_free);
  const pricePp = Number(row.price_pp ?? 0);
  const currency = String(row.currency ?? 'K');

  return {
    id: String(row.id),
    name: String(row.title),
    emoji: String(row.emoji ?? '📅'),
    frequency: (row.frequency as PartnerEvent['frequency']) ?? 'one-off',
    nextOccurrence: String(row.next_occurrence ?? ''),
    spotsTotal,
    spotsFilled,
    interestCount: spotsTotal === 0 ? spotsFilled : undefined,
    price: isFree ? 'Free' : `${currency}${pricePp}/pp`,
    isFree,
    status: (row.event_status as PartnerEvent['status']) ?? 'live',
    category: String(row.category ?? ''),
  };
}

export function usePartner() {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [events, setEvents] = useState<PartnerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: app, error: appErr } = await supabase
        .from('partner_applications')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (appErr) throw appErr;
      if (app) {
        setProfile({
          id: app.id,
          name: app.name,
          partner_type: app.partner_type,
          city: app.city,
          contact: app.contact,
          status: app.status as ListingStatus,
        });
      }

      const { data: evts, error: evtErr } = await supabase
        .from('events')
        .select('*')
        .eq('partner_id', user.id)
        .order('created_at', { ascending: false });

      if (evtErr) throw evtErr;
      setEvents((evts ?? []).map(dbEventToPartnerEvent));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load partner data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyAsPartner = useCallback(async (data: {
    name: string;
    partner_type: 'venue' | 'organizer' | 'both';
    city: string;
    contact: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('partner_applications')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('partner_applications')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('partner_applications')
        .insert({ ...data, user_id: user.id, status: 'pending' });
      if (error) throw error;
    }
    await load();
  }, [load]);

  const saveEvent = useCallback(async (eventData: {
    title: string;
    category: string;
    description?: string;
    frequency: string;
    weekday?: string;
    date?: string;
    time: string;
    price: string;
    isFree: boolean;
    hasCapacity: boolean;
    capacity?: string;
    emoji?: string;
    publishNow: boolean;
  }, editId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: app } = await supabase
      .from('partner_applications')
      .select('city')
      .eq('user_id', user.id)
      .maybeSingle();

    const city = app?.city?.split(',')[0]?.trim() ?? 'Lusaka';
    const spotsTotal = eventData.hasCapacity ? (parseInt(eventData.capacity ?? '0') || 0) : 0;
    const pricePp = eventData.isFree ? 0 : parseFloat(eventData.price.replace(/[^0-9.]/g, '')) || 0;

    let nextOccurrence = '';
    if (eventData.frequency === 'weekly' && eventData.weekday) {
      nextOccurrence = `${eventData.weekday}s · ${eventData.time}`;
    } else if (eventData.frequency === 'one-off' && eventData.date) {
      nextOccurrence = `${eventData.date} · ${eventData.time}`;
    } else if (eventData.frequency === 'monthly') {
      nextOccurrence = `Monthly · ${eventData.time}`;
    } else if (eventData.frequency === 'annual' && eventData.date) {
      nextOccurrence = `${eventData.date} · ${eventData.time}`;
    }

    const now = new Date().toISOString();
    const startsAt = eventData.date ? new Date(`${eventData.date}T${eventData.time}`).toISOString() : now;

    const payload = {
      title: eventData.title,
      category: eventData.category,
      description: eventData.description ?? null,
      frequency: eventData.frequency,
      weekday: eventData.weekday ?? null,
      next_occurrence: nextOccurrence,
      spots_total: spotsTotal,
      spots_filled: 0,
      price_pp: pricePp,
      is_free: eventData.isFree,
      emoji: eventData.emoji ?? '📅',
      event_status: eventData.publishNow ? 'live' : 'draft',
      partner_id: user.id,
      city,
      currency: city === 'Lusaka' ? 'K' : '₦',
      starts_at: startsAt,
      vibes: [],
      updated_at: now,
    };

    if (editId) {
      const { error } = await supabase.from('events').update(payload).eq('id', editId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('events').insert({ ...payload, created_at: now });
      if (error) throw error;
    }
    await load();
  }, [load]);

  const toggleEventStatus = useCallback(async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'live' ? 'paused' : 'live';
    const { error } = await supabase
      .from('events')
      .update({ event_status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status: newStatus as PartnerEvent['status'] } : e));
  }, []);

  const publishEvent = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('events')
      .update({ event_status: 'live', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'live' } : e));
  }, []);

  const saveVenue = useCallback(async (venueData: {
    name: string;
    category: string;
    description?: string;
    address: string;
    area?: string;
    phone?: string;
    website?: string;
    openHours: Record<string, string>;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: app } = await supabase
      .from('partner_applications')
      .select('city')
      .eq('user_id', user.id)
      .maybeSingle();

    const city = app?.city?.split(',')[0]?.trim() ?? 'Lusaka';

    const { data: existing } = await supabase
      .from('venues')
      .select('id')
      .eq('partner_id', user.id)
      .maybeSingle();

    const payload = {
      name: venueData.name,
      category: venueData.category,
      description: venueData.description ?? null,
      address: venueData.address,
      area: venueData.area ?? null,
      city,
      open_hours: venueData.openHours,
      partner_id: user.id,
      is_active: true,
      vibes: [],
      images: [],
      review_count: 0,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase.from('venues').update(payload).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('venues').insert({ ...payload, tier: 'Verified', created_at: new Date().toISOString() });
      if (error) throw error;
    }
  }, []);

  return { profile, events, loading, error, reload: load, applyAsPartner, saveEvent, toggleEventStatus, publishEvent, saveVenue };
}
