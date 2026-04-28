import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type VenueRow = Database['public']['Tables']['venues']['Row'];
type EventRow = Database['public']['Tables']['events']['Row'];

export function useVenues(city?: string) {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const query = supabase
      .from('venues')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false });

    if (city) query.eq('city', city);

    query.then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else setVenues(data ?? []);
      setLoading(false);
    });

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
    setLoading(true);
    const query = supabase
      .from('events')
      .select('*')
      .gte('starts_at', new Date().toISOString())
      .order('is_featured', { ascending: false })
      .order('starts_at', { ascending: true })
      .limit(limit);

    if (city) query.eq('city', city);

    query.then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else setEvents(data ?? []);
      setLoading(false);
    });

    return () => { active = false; };
  }, [city, limit]);

  return { events, loading, error };
}
