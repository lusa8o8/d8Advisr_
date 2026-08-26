import { supabase } from '@/lib/supabase';
import type { PublicEventAction, PublicEventSource } from './eventTrust';

export type PublicEventTrust = {
  sources: PublicEventSource[];
  actions: PublicEventAction[];
};

const EMPTY_TRUST: PublicEventTrust = { sources: [], actions: [] };

export async function loadPublicEventTrust(eventId: string): Promise<PublicEventTrust> {
  const [sourceResult, actionResult] = await Promise.all([
    supabase
      .from('event_sources')
      .select('id,publisher_name,source_title,url,is_primary,last_checked_at,created_at')
      .eq('event_id', eventId),
    supabase
      .from('event_action_links')
      .select('id,provider_name,label,url,status,is_primary,last_checked_at,created_at')
      .eq('event_id', eventId),
  ]);

  // Provenance is supplementary. A transient child-table failure must not make
  // an otherwise public event page disappear.
  if (sourceResult.error || actionResult.error) return EMPTY_TRUST;

  return {
    sources: (sourceResult.data ?? []) as PublicEventSource[],
    actions: (actionResult.data ?? []) as PublicEventAction[],
  };
}
