import { useCallback, useEffect, useState } from 'react';
import type { DemandSignal, PartnerEvent, PartnerReviewInsight, PartnerVenueListing, PartnerVenueOption, VenuePlacementRequest } from '@workspace/d8-core/types';
import type { PartnerType } from '@workspace/d8-core/partner-capabilities';
import { fetchPartnerApplication, getAuthenticatedPartnerUserId, getOptionalPartnerUserId, savePartnerApplication } from '@/features/partner/partnerApplicationData';
import { fetchPartnerEvents, savePartnerEvent, setPartnerEventStatus, type PartnerEventInput } from '@/features/partner/partnerEventData';
import { fetchPartnerDemandSignals } from '@/features/partner/partnerDemandData';
import { fetchPartnerReviewInsights } from '@/features/partner/partnerReviewData';
import { partnerProfileFromRow, type PartnerProfile } from '@/features/partner/partnerModels';
import { fetchOwnedVenue, fetchVenueOptions, fetchVenuePlacementRequests, savePartnerVenue, setPartnerVenuePlacementStatus, type PartnerVenueInput } from '@/features/partner/partnerVenueData';

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
  const [venuePlacementRequests, setVenuePlacementRequests] = useState<VenuePlacementRequest[]>([]);
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
          const ownedVenueIds = options.filter(venue => venue.isOwnedByCurrentPartner).map(venue => venue.id);
          try {
            setVenuePlacementRequests(await fetchVenuePlacementRequests(ownedVenueIds));
          } catch (placementError) {
            setVenuePlacementRequests([]);
            logPartnerIssue('Could not load venue page placement requests', partnerErrorMessage(placementError));
          }
        } catch (venueOptionsError) {
          setVenueOptions([]);
          logPartnerIssue('Could not load D8 venue options for event location linking', partnerErrorMessage(venueOptionsError));
        }
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

  const applyAsPartner = useCallback(async (data: { name: string; partner_type: PartnerType; city: string; contact: string }) => {
    const userId = await getAuthenticatedPartnerUserId();
    await savePartnerApplication(userId, data);
    await load();
  }, [load]);

  const updateVenuePlacementStatus = useCallback(async (eventId: string, status: 'approved' | 'rejected' | 'hidden') => {
    const previous = venuePlacementRequests;
    setVenuePlacementRequests(current => current.filter(request => request.eventId !== eventId));
    try {
      await setPartnerVenuePlacementStatus(eventId, status);
    } catch (placementError) {
      setVenuePlacementRequests(previous);
      throw placementError;
    }
    setEvents(current => current.map(event => event.id === eventId ? { ...event, venuePageStatus: status } : event));
  }, [venuePlacementRequests]);

  const saveEvent = useCallback(async (eventData: PartnerEventInput, editId?: string) => {
    const userId = await getAuthenticatedPartnerUserId();
    await savePartnerEvent(userId, await fetchPartnerApplication(userId), venueOptions, eventData, editId);
    await load();
  }, [load, venueOptions]);

  const pauseEvent = useCallback(async (id: string) => {
    await setPartnerEventStatus(id, 'paused');
    setEvents(current => current.map(event => event.id === id ? { ...event, status: 'paused' } : event));
  }, []);

  const saveVenue = useCallback(async (venueData: PartnerVenueInput) => {
    const userId = await getAuthenticatedPartnerUserId();
    await savePartnerVenue(userId, await fetchPartnerApplication(userId), venueData);
    await load();
  }, [load]);

  return {
    profile, events, venueListing, venueOptions, venuePlacementRequests, demandSignals, reviewInsights,
    loading, error, reload: load, applyAsPartner, saveEvent, pauseEvent, saveVenue,
    updateVenuePlacementStatus,
  };
}
