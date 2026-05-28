import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type DemandSignalType =
  | 'event_view'
  | 'venue_view'
  | 'event_add_to_plan'
  | 'venue_add_to_plan'
  | 'event_reminder_enabled'
  | 'venue_saved';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined) {
  return Boolean(value && UUID_RE.test(value));
}

function logDemandIssue(message: string, detail?: unknown) {
  if (!import.meta.env.DEV) return;
  if (detail === undefined) {
    console.warn(`[D8 demand] ${message}`);
  } else {
    console.warn(`[D8 demand] ${message}`, detail);
  }
}

export function useDemandSignals() {
  const record = useCallback(async (
    signalType: DemandSignalType,
    target: { eventId?: string | null; venueId?: string | null },
    metadata: Record<string, unknown> = {},
  ) => {
    const eventId = isUuid(target.eventId) ? target.eventId : null;
    const venueId = isUuid(target.venueId) ? target.venueId : null;

    if (!eventId && !venueId) {
      logDemandIssue('Skipped signal with non-persisted target', { signalType, target });
      return;
    }

    const { error } = await supabase.rpc('record_demand_signal', {
      p_signal_type: signalType,
      p_event_id: eventId,
      p_venue_id: venueId,
      p_metadata: metadata,
    });

    if (error) {
      logDemandIssue('Could not record signal', { signalType, target, error: error.message });
    }
  }, []);

  return {
    recordEventView: (eventId?: string | null) => record('event_view', { eventId }),
    recordVenueView: (venueId?: string | null) => record('venue_view', { venueId }),
    recordEventAddToPlan: (eventId?: string | null) => record('event_add_to_plan', { eventId }),
    recordVenueAddToPlan: (venueId?: string | null) => record('venue_add_to_plan', { venueId }),
    recordEventReminderEnabled: (eventId?: string | null) => record('event_reminder_enabled', { eventId }),
    recordVenueSaved: (venueId?: string | null) => record('venue_saved', { venueId }),
  };
}
