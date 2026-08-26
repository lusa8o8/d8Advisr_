import { supabase } from '@/lib/supabase';
import type { PublicEventAction, PublicEventSource } from './eventTrust';

export type PublicEventTrust = {
  sources: PublicEventSource[];
  actions: PublicEventAction[];
  attribution: {
    attributionType: 'd8advisr' | 'partner';
    displayName: string;
  } | null;
};

const EMPTY_TRUST: PublicEventTrust = { sources: [], actions: [], attribution: null };

export async function loadPublicEventTrust(eventId: string): Promise<PublicEventTrust> {
  const [sourceResult, actionResult, attributionResult] = await Promise.all([
    supabase
      .from('event_sources')
      .select('id,publisher_name,source_title,url,is_primary,last_checked_at,created_at')
      .eq('event_id', eventId),
    supabase
      .from('event_action_links')
      .select('id,provider_name,label,url,status,is_primary,last_checked_at,created_at')
      .eq('event_id', eventId),
    supabase.rpc('get_public_event_listing_attribution', { p_event_id: eventId }),
  ]);

  // Provenance is supplementary. A transient child-table failure must not make
  // an otherwise public event page disappear.
  const attributionRow = !attributionResult.error && Array.isArray(attributionResult.data)
    ? attributionResult.data[0] as { attribution_type?: string; display_name?: string } | undefined
    : undefined;
  let attribution: PublicEventTrust['attribution'] = null;
  if (attributionRow?.display_name
    && (attributionRow.attribution_type === 'd8advisr' || attributionRow.attribution_type === 'partner')) {
    attribution = {
      attributionType: attributionRow.attribution_type,
      displayName: attributionRow.display_name,
    };
  }

  return {
    sources: sourceResult.error ? EMPTY_TRUST.sources : (sourceResult.data ?? []) as PublicEventSource[],
    actions: actionResult.error ? EMPTY_TRUST.actions : (actionResult.data ?? []) as PublicEventAction[],
    attribution,
  };
}
