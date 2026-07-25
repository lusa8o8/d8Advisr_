import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@workspace/d8-core/supabase';
import type { DemandSignal, PartnerEvent, ListingStatus, PartnerReviewInsight, PartnerVenueListing, PartnerVenueOption, VenuePlacementRequest } from '@workspace/d8-core/types';
import { canManageEvents, canManageVenues, type PartnerType } from '@workspace/d8-core/partner-capabilities';

export interface PartnerProfile {
  id: string;
  name: string;
  partner_type: PartnerType;
  city: string;
  contact: string;
  status: ListingStatus;
}

interface DemandSummaryRow {
  signal_type: string;
  event_id: string | null;
  venue_id: string | null;
  label: string;
  count: number;
}

interface ReviewSummaryRow {
  venue_id: string;
  venue_name: string;
  review_count: number;
  avg_vibe: number | null;
  avg_value: number | null;
  avg_rating: number | null;
}

interface VenuePlacementRequestRow {
  id: string;
  title: string;
  category: string | null;
  starts_at: string | null;
  event_status: string | null;
  venue_id: string;
  venue_page_status: string;
  partner_id: string | null;
  created_at: string | null;
  venues?: { name?: string | null } | { name?: string | null }[] | null;
}

function dbEventToPartnerEvent(row: Record<string, unknown>): PartnerEvent {
  const spotsTotal = Number(row.spots_total ?? 0);
  const spotsFilled = Number(row.spots_filled ?? 0);
  const isFree = Boolean(row.is_free);
  const pricePp = Number(row.price_pp ?? 0);
  const currency = String(row.currency ?? 'ZMW');

  let priceStr = 'Free';
  if (!isFree) {
    if (currency === 'ZMW' || currency === 'K') {
      priceStr = `K${pricePp}/pp`;
    } else {
      priceStr = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency === '₦' ? 'NGN' : currency,
        maximumFractionDigits: 0
      }).format(pricePp) + '/pp';
    }
  }

  return {
    id: String(row.id),
    name: String(row.title),
    emoji: String(row.emoji ?? '📅'),
    frequency: (row.frequency as PartnerEvent['frequency']) ?? 'one-off',
    nextOccurrence: String(row.next_occurrence ?? ''),
    spotsTotal,
    spotsFilled,
    interestCount: spotsTotal === 0 ? spotsFilled : undefined,
    price: priceStr,
    isFree,
    status: (row.event_status as PartnerEvent['status']) ?? 'live',
    category: String(row.category ?? ''),
    coverImage: row.cover_image ? String(row.cover_image) : null,
    images: Array.isArray(row.images) ? row.images.map(String) : (row.cover_image ? [String(row.cover_image)] : []),
    locationKind: row.event_location_kind as PartnerEvent['locationKind'],
    venueId: row.venue_id ? String(row.venue_id) : null,
    venuePageStatus: row.venue_page_status as PartnerEvent['venuePageStatus'],
    externalLocationName: row.external_location_name ? String(row.external_location_name) : null,
    externalLocationAddress: row.external_location_address ? String(row.external_location_address) : null,
  };
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function parseTimeParts(time: string) {
  const [hours, minutes] = time.split(':').map(part => Number.parseInt(part, 10));
  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

function buildNextStartsAt(eventData: {
  frequency: string;
  weekday?: string;
  date?: string;
  time: string;
}) {
  const now = new Date();
  const { hours, minutes } = parseTimeParts(eventData.time);

  if (eventData.frequency === 'one-off' && eventData.date) {
    const exact = new Date(`${eventData.date}T${eventData.time}`);
    if (!Number.isNaN(exact.getTime())) return exact.toISOString();
  }

  if (eventData.frequency === 'weekly' && eventData.weekday && eventData.weekday in WEEKDAY_INDEX) {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    const daysUntil = (WEEKDAY_INDEX[eventData.weekday] - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + daysUntil);
    if (next <= now) next.setDate(next.getDate() + 7);
    return next.toISOString();
  }

  if (eventData.frequency === 'monthly') {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) next.setMonth(next.getMonth() + 1);
    return next.toISOString();
  }

  if (eventData.frequency === 'annual' && eventData.date) {
    const annual = new Date(`${eventData.date}T${eventData.time}`);
    if (!Number.isNaN(annual.getTime())) {
      if (annual <= now) annual.setFullYear(annual.getFullYear() + 1);
      return annual.toISOString();
    }
  }

  const fallback = new Date(now);
  fallback.setHours(hours, minutes, 0, 0);
  if (fallback <= now) fallback.setDate(fallback.getDate() + 1);
  return fallback.toISOString();
}

function demandSignalCopy(row: DemandSummaryRow): DemandSignal {
  const count = Number(row.count ?? 0);

  switch (row.signal_type) {
    case 'event_add_to_plan':
      return {
        eventId: row.event_id,
        label: `${row.label} added to plans`,
        count,
        context: 'users added this event to a plan',
      };
    case 'event_reminder_enabled':
      return {
        eventId: row.event_id,
        label: `${row.label} reminders`,
        count,
        context: 'users asked to be reminded',
      };
    case 'event_view':
      return {
        eventId: row.event_id,
        label: `${row.label} views`,
        count,
        context: 'users opened this event',
      };
    case 'venue_add_to_plan':
      return {
        eventId: null,
        label: `${row.label} added to plans`,
        count,
        context: 'users built plans around this venue',
      };
    case 'venue_saved':
      return {
        eventId: null,
        label: `${row.label} saves`,
        count,
        context: 'users saved this venue',
      };
    case 'venue_view':
    default:
      return {
        eventId: null,
        label: `${row.label} views`,
        count,
        context: 'users opened this venue',
      };
  }
}

function reviewInsightCopy(row: ReviewSummaryRow): PartnerReviewInsight {
  return {
    venueId: row.venue_id,
    venueName: row.venue_name,
    reviewCount: Number(row.review_count ?? 0),
    avgVibe: row.avg_vibe === null ? null : Number(row.avg_vibe),
    avgValue: row.avg_value === null ? null : Number(row.avg_value),
    avgRating: row.avg_rating === null ? null : Number(row.avg_rating),
  };
}

function venueNameFromRequest(row: VenuePlacementRequestRow) {
  const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues;
  return venue?.name ?? 'Venue';
}

function venuePlacementRequestCopy(row: VenuePlacementRequestRow): VenuePlacementRequest {
  return {
    eventId: row.id,
    eventName: row.title,
    eventCategory: row.category ?? 'Event',
    eventStartsAt: row.starts_at ?? row.created_at ?? '',
    eventStatus: (row.event_status as VenuePlacementRequest['eventStatus']) ?? 'draft',
    venueId: row.venue_id,
    venueName: venueNameFromRequest(row),
    organizerId: row.partner_id,
    organizerName: 'Event organiser',
    status: row.venue_page_status as VenuePlacementRequest['status'],
    createdAt: row.created_at ?? '',
  };
}

function logPartnerIssue(message: string, detail?: unknown) {
  if (!import.meta.env.DEV) return;
  if (detail === undefined) {
    console.warn(`[D8 partner] ${message}`);
  } else {
    console.warn(`[D8 partner] ${message}`, detail);
  }
}

export function usePartner() {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [events, setEvents] = useState<PartnerEvent[]>([]);
  const [venueListing, setVenueListing] = useState<PartnerVenueListing | null>(null);
  const [venueOptions, setVenueOptions] = useState<PartnerVenueOption[]>([]);
  const [venuePlacementRequests, setVenuePlacementRequests] = useState<VenuePlacementRequest[]>([]);
  const [demandSignals, setDemandSignals] = useState<DemandSignal[]>([]);
  const [reviewInsights, setReviewInsights] = useState<PartnerReviewInsight[]>([]);
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
      } else {
        setProfile(null);
        setVenueListing(null);
      }

      const { data: evts, error: evtErr } = await supabase
        .from('events')
        .select('*')
        .eq('partner_id', user.id)
        .order('created_at', { ascending: false });

      if (evtErr) throw evtErr;
      setEvents((evts ?? []).map(dbEventToPartnerEvent));

      if (app) {
        const { data: ownedVenue, error: ownedVenueErr } = await supabase
          .from('venues')
          .select('id,name,category,description,address,area,open_hours,cover_image,images,listing_status,verification_status,reverification_reason,is_active')
          .eq('partner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ownedVenueErr) {
          setVenueListing(null);
          logPartnerIssue('Could not load owned venue listing status', ownedVenueErr.message);
        } else {
          setVenueListing(ownedVenue ? {
            id: ownedVenue.id,
            name: ownedVenue.name,
            status: ownedVenue.listing_status,
            verificationStatus: ownedVenue.verification_status,
            reverificationReason: ownedVenue.reverification_reason,
            isActive: ownedVenue.is_active,
            category: ownedVenue.category,
            description: ownedVenue.description,
            address: ownedVenue.address,
            area: ownedVenue.area,
            openHours: ownedVenue.open_hours as Record<string, string> | null,
            coverImage: ownedVenue.cover_image,
            images: ownedVenue.images ?? [],
          } : null);
        }

        const appCity = app.city?.split(',')[0]?.trim();
        const venueQuery = supabase
          .from('venues')
          .select('id,name,city,area,partner_id')
          .eq('is_active', true)
          .eq('listing_status', 'live')
          .order('name', { ascending: true });

        if (appCity) venueQuery.eq('city', appCity);

        const { data: venueRows, error: venueErr } = await venueQuery;
        if (venueErr) {
          setVenueOptions([]);
          logPartnerIssue('Could not load D8 venue options for event location linking', venueErr.message);
        } else {
          const nextVenueOptions = (venueRows ?? []).map(row => ({
            id: row.id,
            name: row.name,
            city: row.city,
            area: row.area,
            partnerId: row.partner_id,
            isOwnedByCurrentPartner: row.partner_id === user.id,
          }));
          setVenueOptions(nextVenueOptions);

          const ownedVenueIds = nextVenueOptions
            .filter(venue => venue.isOwnedByCurrentPartner)
            .map(venue => venue.id);

          if (ownedVenueIds.length === 0) {
            setVenuePlacementRequests([]);
          } else {
            const { data: placementRows, error: placementErr } = await supabase
              .from('events')
              .select('id,title,category,starts_at,event_status,venue_id,venue_page_status,partner_id,created_at,venues(id,name)')
              .in('venue_id', ownedVenueIds)
              .eq('venue_page_status', 'requested')
              .order('created_at', { ascending: false });

            if (placementErr) {
              setVenuePlacementRequests([]);
              logPartnerIssue('Could not load venue page placement requests', placementErr.message);
            } else {
              setVenuePlacementRequests(((placementRows ?? []) as VenuePlacementRequestRow[]).map(venuePlacementRequestCopy));
            }
          }
        }
      }

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: demandRows, error: demandErr } = await supabase.rpc('get_partner_demand_summary', {
        p_since: since,
      });

      if (demandErr) {
        setDemandSignals([]);
        logPartnerIssue('Could not load demand summary', demandErr.message);
      } else {
        setDemandSignals(((demandRows ?? []) as DemandSummaryRow[]).map(demandSignalCopy).slice(0, 3));
      }

      const { data: reviewRows, error: reviewErr } = await supabase.rpc('get_partner_review_summary', {
        p_since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (reviewErr) {
        setReviewInsights([]);
        logPartnerIssue('Could not load review summary', reviewErr.message);
      } else {
        setReviewInsights(((reviewRows ?? []) as ReviewSummaryRow[]).map(reviewInsightCopy).slice(0, 3));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load partner data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyAsPartner = useCallback(async (data: {
    name: string;
    partner_type: PartnerType;
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

  const updateVenuePlacementStatus = useCallback(async (
    eventId: string,
    status: 'approved' | 'rejected' | 'hidden',
  ) => {
    const previous = venuePlacementRequests;
    setVenuePlacementRequests(current => current.filter(request => request.eventId !== eventId));

    const { error } = await supabase.rpc('set_event_venue_page_status', {
      p_event_id: eventId,
      p_status: status,
    });

    if (error) {
      setVenuePlacementRequests(previous);
      throw error;
    }

    setEvents(current =>
      current.map(event =>
        event.id === eventId
          ? { ...event, venuePageStatus: status }
          : event
      )
    );
  }, [venuePlacementRequests]);

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
    locationKind?: 'owned_venue' | 'existing_venue' | 'external' | 'undisclosed';
    venueId?: string;
    externalLocationName?: string;
    externalLocationAddress?: string;
    coverImage?: string | null;
    images?: string[];
  }, editId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: app } = await supabase
      .from('partner_applications')
      .select('city,status,partner_type')
      .eq('user_id', user.id)
      .maybeSingle();

    if (app?.status !== 'live') {
      throw new Error('Partner application must be approved before publishing events');
    }
    if (!canManageEvents(app.partner_type as PartnerType)) {
      throw new Error('Your partner type is not allowed to create events');
    }

    const city = app?.city?.split(',')[0]?.trim() ?? 'Lusaka';
    const selectedVenue = eventData.venueId
      ? venueOptions.find(venue => venue.id === eventData.venueId)
      : null;
    const hasLinkedVenue = Boolean(selectedVenue);
    const locationKind = hasLinkedVenue
      ? 'd8_venue'
      : eventData.locationKind === 'external'
        ? 'external'
        : 'undisclosed';
    const venuePageStatus = hasLinkedVenue && selectedVenue?.isOwnedByCurrentPartner
      ? 'approved'
      : hasLinkedVenue
        ? 'requested'
        : 'hidden';
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
    const startsAt = buildNextStartsAt(eventData);

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
      cover_image: eventData.coverImage ?? eventData.images?.[0] ?? null,
      images: eventData.images ?? [],
      event_status: eventData.publishNow ? 'live' : 'draft',
      event_location_kind: locationKind,
      venue_id: selectedVenue?.id ?? null,
      external_location_name: locationKind === 'external' ? eventData.externalLocationName?.trim() || null : null,
      external_location_address: locationKind === 'external' ? eventData.externalLocationAddress?.trim() || null : null,
      venue_page_status: venuePageStatus,
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
  }, [load, venueOptions]);

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
    coverImage?: string | null;
    images?: string[];
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: app } = await supabase
      .from('partner_applications')
      .select('city,status,partner_type')
      .eq('user_id', user.id)
      .maybeSingle();

    if (app?.status !== 'live') {
      throw new Error('Partner application must be approved before managing venues');
    }
    if (!canManageVenues(app.partner_type as PartnerType)) {
      throw new Error('Your partner type is not allowed to manage venues');
    }

    const city = app?.city?.split(',')[0]?.trim() ?? 'Lusaka';

    const { data: existing } = await supabase
      .from('venues')
      .select('id')
      .eq('partner_id', user.id)
      .maybeSingle();

    const insertPayload = {
      name: venueData.name,
      category: venueData.category,
      description: venueData.description ?? null,
      address: venueData.address,
      area: venueData.area ?? null,
      city,
      open_hours: venueData.openHours,
      partner_id: user.id,
      vibes: [],
      cover_image: venueData.coverImage ?? venueData.images?.[0] ?? null,
      images: venueData.images ?? [],
      review_count: 0,
      updated_at: new Date().toISOString(),
    };
    const updatePayload = {
      name: venueData.name,
      category: venueData.category,
      description: venueData.description ?? null,
      address: venueData.address,
      area: venueData.area ?? null,
      city,
      open_hours: venueData.openHours,
      vibes: [],
      cover_image: venueData.coverImage ?? venueData.images?.[0] ?? null,
      images: venueData.images ?? [],
      review_count: 0,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase.from('venues').update(updatePayload).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('venues').insert({ ...insertPayload, created_at: new Date().toISOString() });
      if (error) throw error;
    }
    await load();
  }, [load]);

  return { profile, events, venueListing, venueOptions, venuePlacementRequests, demandSignals, reviewInsights, loading, error, reload: load, applyAsPartner, saveEvent, toggleEventStatus, publishEvent, saveVenue, updateVenuePlacementStatus };
}
