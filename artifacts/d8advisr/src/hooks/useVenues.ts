import { useState, useEffect } from 'react';
import { EVENT_CLIENT_SELECT, VENUE_CLIENT_SELECT, supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type VenueRow = Omit<Database['public']['Tables']['venues']['Row'], 'created_by'>;
type EventRow = Omit<Database['public']['Tables']['events']['Row'], 'created_by'>;

function logDataIssue(scope: string, message: string, detail?: unknown) {
  if (!import.meta.env.DEV) return;
  if (detail === undefined) {
    console.warn(`[D8 data:${scope}] ${message}`);
  } else {
    console.warn(`[D8 data:${scope}] ${message}`, detail);
  }
}

export function useVenues(city?: string) {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function loadVenues() {
      const query = supabase
        .from('venues')
        .select(VENUE_CLIENT_SELECT)
        .eq('is_active', true)
        .eq('listing_status', 'live')
        .order('rating', { ascending: false });

      if (city) query.eq('city', city);

      try {
        const { data, error } = await query;
        if (!active) return;
        if (error) {
          setError(error.message);
          logDataIssue('venues', 'Supabase query failed', { city, error: error.message });
        } else {
          const rows = data ?? [];
          setError(null);
          setVenues(rows);
          if (rows.length === 0) {
            logDataIssue('venues', 'No active venues matched the home filter', { city });
          }
        }
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Unknown venue query failure';
        setError(message);
        logDataIssue('venues', 'Supabase query threw before completion', { city, error: message });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadVenues();

    return () => { active = false; };
  }, [city]);

  return { venues, loading, error };
}

export function useEvents(city?: string, limit = 10) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const now = new Date().toISOString();
    setLoading(true);

    async function loadEvents() {
      const query = supabase
        .from('events')
        .select(EVENT_CLIENT_SELECT)
        .eq('event_status', 'live')
        .gte('starts_at', now)
        .order('is_featured', { ascending: false })
        .order('starts_at', { ascending: true })
        .limit(limit);

      if (city) query.eq('city', city);

      try {
        const { data, error } = await query;
        if (!active) return;
        if (error) {
          setError(error.message);
          logDataIssue('events', 'Supabase query failed', { city, from: now, limit, error: error.message });
        } else {
          const rows = data ?? [];
          setError(null);
          setEvents(rows);
          if (rows.length === 0) {
            logDataIssue('events', 'No upcoming live events matched the home filter', { city, from: now, limit });
          }
        }
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Unknown event query failure';
        setError(message);
        logDataIssue('events', 'Supabase query threw before completion', { city, from: now, limit, error: message });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadEvents();

    return () => { active = false; };
  }, [city, limit]);

  return { events, loading, error };
}

export function useVenueEvents(venueId?: string, limit = 10) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const now = new Date().toISOString();
    setLoading(true);

    async function loadVenueEvents() {
      if (!venueId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(venueId)) {
        setEvents([]);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('events')
          .select(EVENT_CLIENT_SELECT)
          .eq('venue_id', venueId)
          .eq('event_status', 'live')
          .eq('venue_page_status', 'approved')
          .gte('starts_at', now)
          .order('starts_at', { ascending: true })
          .limit(limit);

        if (!active) return;
        if (error) {
          setError(error.message);
          logDataIssue('venue-events', 'Supabase query failed', { venueId, from: now, limit, error: error.message });
        } else {
          setError(null);
          setEvents(data ?? []);
        }
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Unknown venue event query failure';
        setError(message);
        logDataIssue('venue-events', 'Supabase query threw before completion', { venueId, from: now, limit, error: message });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadVenueEvents();

    return () => { active = false; };
  }, [venueId, limit]);

  return { events, loading, error };
}
