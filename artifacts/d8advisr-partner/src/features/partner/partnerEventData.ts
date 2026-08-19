import { EVENT_CLIENT_SELECT, supabase } from '@workspace/d8-core/supabase';
import { canManageEvents, type PartnerType } from '@workspace/d8-core/partner-capabilities';
import type { PartnerEvent, PartnerVenueOption } from '@workspace/d8-core/types';
import type { PartnerApplicationRow, PartnerEventRevision } from './partnerModels';
import { partnerEventFromRow } from './partnerModels';
import {
  EVENT_PUBLISHING_POLICY_ID,
  EVENT_PUBLISHING_POLICY_VERSION,
  parseEventPriceInput,
} from '@workspace/d8-core/event-policy';

export interface PartnerEventInput {
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
  vibes: string[];
  publicationAcknowledgement?: {
    requestKey: string;
    acknowledged: boolean;
  };
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

function throwIfError(error: { message: string } | null) {
  if (error) throw error;
}

function buildNextStartsAt(eventData: PartnerEventInput) {
  const now = new Date();
  const [rawHours, rawMinutes] = eventData.time.split(':').map(part => Number.parseInt(part, 10));
  const hours = Number.isFinite(rawHours) ? rawHours : 0;
  const minutes = Number.isFinite(rawMinutes) ? rawMinutes : 0;

  if (eventData.frequency === 'one-off' && eventData.date) {
    const exact = new Date(`${eventData.date}T${eventData.time}`);
    if (!Number.isNaN(exact.getTime())) return exact.toISOString();
  }
  if (eventData.frequency === 'weekly' && eventData.weekday && eventData.weekday in WEEKDAY_INDEX) {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    next.setDate(next.getDate() + (WEEKDAY_INDEX[eventData.weekday] - next.getDay() + 7) % 7);
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

export async function fetchPartnerEvents(userId: string): Promise<PartnerEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_CLIENT_SELECT)
    .eq('partner_id', userId)
    .order('created_at', { ascending: false });
  throwIfError(error);
  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return [];

  const eventIds = rows.map(r => String(r.id));
  const { data: pendingRevs } = await supabase
    .from('event_revisions')
    .select('event_id')
    .in('event_id', eventIds)
    .eq('status', 'pending');
  
  const pendingSet = new Set((pendingRevs ?? []).map(r => r.event_id));

  return rows.map(row => {
    const ev = partnerEventFromRow(row);
    ev.hasPendingRevision = pendingSet.has(ev.id);
    return ev;
  });
}

export async function savePartnerEvent(
  userId: string,
  application: PartnerApplicationRow | null,
  venueOptions: PartnerVenueOption[],
  eventData: PartnerEventInput,
  editId?: string,
) {
  if (application?.status !== 'live') {
    throw new Error('Partner application must be approved before publishing events');
  }
  if (!canManageEvents(application.partner_type as PartnerType)) {
    throw new Error('Your partner type is not allowed to create events');
  }

  const city = application.city?.split(',')[0]?.trim() ?? 'Lusaka';
  const selectedVenue = eventData.venueId ? venueOptions.find(venue => venue.id === eventData.venueId) : null;
  const hasLinkedVenue = Boolean(selectedVenue);
  const locationKind = hasLinkedVenue ? 'd8_venue' : eventData.locationKind === 'external' ? 'external' : 'undisclosed';
  const venuePageStatus = hasLinkedVenue && selectedVenue?.isOwnedByCurrentPartner
    ? 'approved' : hasLinkedVenue ? 'requested' : 'hidden';
  const parsedCapacity = Number(eventData.capacity);
  if (eventData.hasCapacity && (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0)) {
    throw new Error('Attendance limit must be a whole number greater than zero');
  }
  const spotsTotal = eventData.hasCapacity ? parsedCapacity : 0;
  const pricePp = parseEventPriceInput(eventData.price, eventData.isFree);

  let nextOccurrence = '';
  if (eventData.frequency === 'weekly' && eventData.weekday) nextOccurrence = `${eventData.weekday}s · ${eventData.time}`;
  else if (eventData.frequency === 'one-off' && eventData.date) nextOccurrence = `${eventData.date} · ${eventData.time}`;
  else if (eventData.frequency === 'monthly') nextOccurrence = `Monthly · ${eventData.time}`;
  else if (eventData.frequency === 'annual' && eventData.date) nextOccurrence = `${eventData.date} · ${eventData.time}`;

  const now = new Date().toISOString();
  const payload = {
    title: eventData.title, category: eventData.category, description: eventData.description ?? null,
    frequency: eventData.frequency, weekday: eventData.weekday ?? null, next_occurrence: nextOccurrence,
    spots_total: spotsTotal, price_pp: pricePp, is_free: eventData.isFree,
    emoji: eventData.emoji ?? '📅', cover_image: eventData.coverImage ?? eventData.images?.[0] ?? null,
    images: eventData.images ?? [],
    event_location_kind: locationKind, venue_id: selectedVenue?.id ?? null,
    external_location_name: locationKind === 'external' ? eventData.externalLocationName?.trim() || null : null,
    external_location_address: locationKind === 'external' ? eventData.externalLocationAddress?.trim() || null : null,
    venue_page_status: venuePageStatus, partner_id: userId, city, currency: city === 'Lusaka' ? 'K' : '₦',
    starts_at: buildNextStartsAt(eventData), vibes: eventData.vibes, updated_at: now,
  };

  let eventId = editId;
  let revisionResult: { status: 'applied' | 'pending'; revision_id?: string; message?: string } | null = null;

  if (eventId) {
    // Check if event is currently live
    const { data: currentEvent, error: fetchError } = await supabase
      .from('events')
      .select('event_status, updated_at')
      .eq('id', editId)
      .single();
    throwIfError(fetchError);

    if (currentEvent?.event_status === 'live') {
      const { data: revData, error: revError } = await supabase.rpc('partner_submit_event_revision', {
        p_event_id: editId,
        p_payload: payload,
        p_expected_updated_at: currentEvent.updated_at,
      });
      throwIfError(revError);
      revisionResult = revData as { status: 'applied' | 'pending'; revision_id?: string; message?: string };
    } else {
      const { error } = await supabase.from('events').update(payload).eq('id', editId);
      throwIfError(error);
    }
  } else {
    const { data, error } = await supabase.from('events')
      .insert({ ...payload, event_status: 'draft', spots_filled: 0, created_at: now })
      .select('id').single();
    throwIfError(error);
    if (!data?.id) throw new Error('Event draft creation did not return an ID');
    eventId = data.id;
  }

  if (eventData.publishNow) {
    const acknowledgement = eventData.publicationAcknowledgement;
    if (!acknowledgement?.acknowledged || !acknowledgement.requestKey) {
      throw new Error('Review and accept the Event Publishing Policy before publishing.');
    }
    const { error } = await supabase.rpc('publish_event_with_policy', {
      p_event_id: eventId,
      p_policy_id: EVENT_PUBLISHING_POLICY_ID,
      p_policy_version: EVENT_PUBLISHING_POLICY_VERSION,
      p_acknowledged: true,
      p_request_key: acknowledgement.requestKey,
    });
    throwIfError(error);
  }

  return revisionResult;
}

export async function fetchPartnerEventPendingRevision(eventId: string): Promise<PartnerEventRevision | null> {
  const { data, error } = await supabase
    .from('event_revisions')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .maybeSingle();
  throwIfError(error);
  if (!data) return null;
  return {
    id: data.id,
    eventId: data.event_id,
    status: data.status as PartnerEventRevision['status'],
    riskLevel: data.risk_level as PartnerEventRevision['riskLevel'],
    enforcementCode: data.enforcement_code,
    ruleCode: data.rule_code,
    previousValues: data.previous_values as Record<string, unknown>,
    proposedValues: data.proposed_values as Record<string, unknown>,
    changedFields: data.changed_fields,
    organizerReason: data.organizer_reason,
    reviewNote: data.review_note,
    reviewedAt: data.reviewed_at,
    createdAt: data.created_at,
  };
}

export async function fetchPartnerEventLatestRevision(eventId: string): Promise<PartnerEventRevision | null> {
  const { data, error } = await supabase
    .from('event_revisions')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  if (!data) return null;
  return {
    id: data.id,
    eventId: data.event_id,
    status: data.status as PartnerEventRevision['status'],
    riskLevel: data.risk_level as PartnerEventRevision['riskLevel'],
    enforcementCode: data.enforcement_code,
    ruleCode: data.rule_code,
    previousValues: data.previous_values as Record<string, unknown>,
    proposedValues: data.proposed_values as Record<string, unknown>,
    changedFields: data.changed_fields,
    organizerReason: data.organizer_reason,
    reviewNote: data.review_note,
    reviewedAt: data.reviewed_at,
    createdAt: data.created_at,
  };
}

export async function setPartnerEventStatus(id: string, status: 'paused') {
  const { error } = await supabase
    .from('events')
    .update({ event_status: status, updated_at: new Date().toISOString() })
    .eq('id', id);
  throwIfError(error);
}

export async function publishPartnerEvent(id: string, requestKey: string) {
  const { error } = await supabase.rpc('publish_event_with_policy', {
    p_event_id: id,
    p_policy_id: EVENT_PUBLISHING_POLICY_ID,
    p_policy_version: EVENT_PUBLISHING_POLICY_VERSION,
    p_acknowledged: true,
    p_request_key: requestKey,
  });
  throwIfError(error);
}
