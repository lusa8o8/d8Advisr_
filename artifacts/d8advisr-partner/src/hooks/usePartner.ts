import { useCallback, useEffect, useState } from 'react';
import type { DemandSignal, PartnerEvent, PartnerEventVenueWorkflow, PartnerReviewInsight, PartnerVenueListing, PartnerVenueOption } from '@workspace/d8-core/types';
import type { PartnerType } from '@workspace/d8-core/partner-capabilities';
import { fetchPartnerApplication, getAuthenticatedPartnerUserId, getOptionalPartnerUserId, savePartnerApplication } from '@/features/partner/partnerApplicationData';
import { cancelPartnerEvent, fetchPartnerEvents, savePartnerEvent, setPartnerEventStatus, type EventRevisionConfirmation, type PartnerEventInput } from '@/features/partner/partnerEventData';
import { fetchPartnerDemandSignals } from '@/features/partner/partnerDemandData';
import { fetchPartnerReviewInsights } from '@/features/partner/partnerReviewData';
import { partnerProfileFromRow, type PartnerProfile } from '@/features/partner/partnerModels';
import {
  decidePartnerEventVenuePlacement,
  fetchOwnedVenue,
  fetchPartnerEventVenueWorkflows,
  fetchVenueOptions,
  reportPartnerEventVenueAttribution,
  resubmitPartnerEventVenuePlacement,
  respondToPartnerEventVenueDispute,
  savePartnerVenue,
  type PartnerVenueInput,
} from '@/features/partner/partnerVenueData';

export type { PartnerProfile } from '@/features/partner/partnerModels';

function logPartnerIssue(message: string, detail?: unknown) {
  if (!import.meta.env.DEV) return;
  if (detail === undefined) console.warn(`[D8 partner] ${message}`);
  else console.warn(`[D8 partner] ${message}`, detail);
}

function partnerErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function usePartner() {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [events, setEvents] = useState<PartnerEvent[]>([]);
  const [venueListing, setVenueListing] = useState<PartnerVenueListing | null>(null);
  const [venueOptions, setVenueOptions] = useState<PartnerVenueOption[]>([]);
  const [eventVenueWorkflows, setEventVenueWorkflows] = useState<PartnerEventVenueWorkflow[]>([]);
  const [demandSignals, setDemandSignals] = useState<DemandSignal[]>([]);
  const [reviewInsights, setReviewInsights] = useState<PartnerReviewInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = await getOptionalPartnerUserId();
      if (!userId) return;
      const application = await fetchPartnerApplication(userId);
      if (application) setProfile(partnerProfileFromRow(application));
      else {
        setProfile(null);
        setVenueListing(null);
      }

      setEvents(await fetchPartnerEvents(userId));

      if (application) {
        try {
          setVenueListing(await fetchOwnedVenue(userId));
        } catch (venueError) {
          setVenueListing(null);
          logPartnerIssue('Could not load owned venue listing status', partnerErrorMessage(venueError));
        }

        try {
          const options = await fetchVenueOptions(userId, application.city);
          setVenueOptions(options);
        } catch (venueOptionsError) {
          setVenueOptions([]);
          logPartnerIssue('Could not load D8 venue options for event location linking', partnerErrorMessage(venueOptionsError));
        }
      }

      try {
        setEventVenueWorkflows(await fetchPartnerEventVenueWorkflows());
      } catch (workflowError) {
        setEventVenueWorkflows([]);
        logPartnerIssue('Could not load event venue workflows', partnerErrorMessage(workflowError));
      }

      try {
        setDemandSignals(await fetchPartnerDemandSignals());
      } catch (demandError) {
        setDemandSignals([]);
        logPartnerIssue('Could not load demand summary', partnerErrorMessage(demandError));
      }
      try {
        setReviewInsights(await fetchPartnerReviewInsights());
      } catch (reviewError) {
        setReviewInsights([]);
        logPartnerIssue('Could not load review summary', partnerErrorMessage(reviewError));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load partner data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const applyAsPartner = useCallback(async (data: { name: string; partner_type: PartnerType; region_id: string; contact: string }) => {
    await getAuthenticatedPartnerUserId();
    await savePartnerApplication(data);
    await load();
  }, [load]);

  const decideVenuePlacement = useCallback(async (
    workflow: PartnerEventVenueWorkflow,
    decision: 'approved' | 'declined' | 'revoked',
    reason?: string,
  ) => {
    await decidePartnerEventVenuePlacement(workflow.relationshipId, decision, workflow.version, reason);
    await load();
  }, [load]);

  const resubmitVenuePlacement = useCallback(async (workflow: PartnerEventVenueWorkflow, reason?: string) => {
    await resubmitPartnerEventVenuePlacement(workflow.relationshipId, workflow.version, reason);
    await load();
  }, [load]);

  const reportVenueAttribution = useCallback(async (workflow: PartnerEventVenueWorkflow, reason: string) => {
    await reportPartnerEventVenueAttribution(workflow.relationshipId, workflow.version, reason);
    await load();
  }, [load]);

  const respondToVenueDispute = useCallback(async (workflow: PartnerEventVenueWorkflow, response: string) => {
    await respondToPartnerEventVenueDispute(workflow.relationshipId, workflow.version, response);
    await load();
  }, [load]);

  const saveEvent = useCallback(async (eventData: PartnerEventInput, editId?: string, revisionConfirmation?: EventRevisionConfirmation) => {
    const userId = await getAuthenticatedPartnerUserId();
    const result = await savePartnerEvent(userId, await fetchPartnerApplication(userId), venueOptions, eventData, editId, revisionConfirmation);
    if (result?.status !== 'confirmation_required') await load();
    return result;
  }, [load, venueOptions]);

  const pauseEvent = useCallback(async (id: string) => {
    await setPartnerEventStatus(id, 'paused');
    setEvents(current => current.map(event => event.id === id ? { ...event, status: 'paused' } : event));
  }, []);

  const cancelEvent = useCallback(async (event: PartnerEvent, confirmed: boolean, reason?: string) => {
    if (!event.updatedAt) throw new Error('Refresh this event before cancelling it.');
    const result = await cancelPartnerEvent(event.id, event.updatedAt, confirmed, reason);
    if (result.status === 'applied') {
      setEvents(current => current.map(item => item.id === event.id ? { ...item, status: 'cancelled' } : item));
    }
    return result;
  }, []);

  const saveVenue = useCallback(async (venueData: PartnerVenueInput) => {
    const userId = await getAuthenticatedPartnerUserId();
    await savePartnerVenue(userId, await fetchPartnerApplication(userId), venueData);
    await load();
  }, [load]);

  return {
    profile, events, venueListing, venueOptions, eventVenueWorkflows, demandSignals, reviewInsights,
    loading, error, reload: load, applyAsPartner, saveEvent, pauseEvent, cancelEvent, saveVenue,
    decideVenuePlacement, resubmitVenuePlacement, reportVenueAttribution, respondToVenueDispute,
  };
}
