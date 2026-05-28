import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type VenueRow = Database['public']['Tables']['venues']['Row'];
type EventRow = Database['public']['Tables']['events']['Row'];

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
        .select('*')
        .eq('is_active', true)
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
        .select('*')
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
