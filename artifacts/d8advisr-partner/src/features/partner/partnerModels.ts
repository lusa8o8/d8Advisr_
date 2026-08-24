import type { DemandSignal, ListingStatus, PartnerEvent, PartnerEventVenueWorkflow, PartnerReviewInsight } from '@workspace/d8-core/types';
import type { PartnerType } from '@workspace/d8-core/partner-capabilities';

export interface PartnerProfile {
  id: string;
  name: string;
  partner_type: PartnerType;
  city: string;
  region_id: string | null;
  contact: string;
  status: ListingStatus;
  review_reason: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
}

export interface PartnerApplicationRow extends PartnerProfile {}

export interface DemandSummaryRow {
  signal_type: string;
  event_id: string | null;
  venue_id: string | null;
  label: string;
  count: number;
}

export interface ReviewSummaryRow {
  venue_id: string;
  venue_name: string;
  review_count: number;
  avg_vibe: number | null;
  avg_value: number | null;
  avg_rating: number | null;
}

export interface PartnerEventVenueWorkflowRow {
  relationship_id: string;
  event_id: string;
  venue_id: string;
  event_title: string;
  event_category: string | null;
  event_status: string;
  event_starts_at: string | null;
  venue_name: string;
  organizer_name: string;
  placement_status: string;
  attribution_status: string;
  request_source: string;
  decision_reason: string | null;
  dispute_reason: string | null;
  response_reason: string | null;
  resolution_reason: string | null;
  relationship_version: number;
  requested_at: string;
  updated_at: string;
  can_manage_event: boolean;
  can_manage_venue: boolean;
}

export function partnerProfileFromRow(row: PartnerApplicationRow): PartnerProfile {
  return {
    id: row.id,
    name: row.name,
    partner_type: row.partner_type,
    city: row.city,
    region_id: row.region_id,
    contact: row.contact,
    status: row.status,
    review_reason: row.review_reason,
    reviewed_at: row.reviewed_at,
    submitted_at: row.submitted_at,
  };
}

export function partnerEventFromRow(row: Record<string, unknown>): PartnerEvent {
  const spotsTotal = Number(row.spots_total ?? 0);
  const isFree = Boolean(row.is_free);
  const pricePp = Number(row.price_pp ?? 0);
  const currency = String(row.currency ?? 'ZMW');
  let price = 'Free entry';
  if (!isFree) {
    price = currency === 'ZMW' || currency === 'K'
      ? `K${pricePp}/pp`
      : new Intl.NumberFormat(undefined, {
          style: 'currency', currency: currency === '₦' ? 'NGN' : currency, maximumFractionDigits: 0,
        }).format(pricePp) + '/pp';
  }
  return {
    id: String(row.id), regionId: String(row.region_id), name: String(row.title), emoji: String(row.emoji ?? '📅'),
    frequency: (row.frequency as PartnerEvent['frequency']) ?? 'one-off',
    nextOccurrence: String(row.next_occurrence ?? ''), spotsTotal, price, isFree,
    status: (row.event_status as PartnerEvent['status']) ?? 'live', category: String(row.category ?? ''),
    description: String(row.description ?? ''), weekday: row.weekday ? String(row.weekday) : null,
    startsAt: row.starts_at ? String(row.starts_at) : null, priceAmount: pricePp, currency,
    vibes: Array.isArray(row.vibes) ? row.vibes.map(String) : [],
    coverImage: row.cover_image ? String(row.cover_image) : null,
    images: Array.isArray(row.images) ? row.images.map(String) : (row.cover_image ? [String(row.cover_image)] : []),
    locationKind: row.event_location_kind as PartnerEvent['locationKind'],
    venueId: row.venue_id ? String(row.venue_id) : null,
    venuePageStatus: row.venue_page_status as PartnerEvent['venuePageStatus'],
    externalLocationName: row.external_location_name ? String(row.external_location_name) : null,
    externalLocationAddress: row.external_location_address ? String(row.external_location_address) : null,
    firstPublishedAt: row.first_published_at ? String(row.first_published_at) : null,
    initialPublishedIsFree: row.initial_published_is_free == null ? null : Boolean(row.initial_published_is_free),
    initialPublishedPrice: row.initial_published_price == null ? null : Number(row.initial_published_price),
    initialPublishedCurrency: row.initial_published_currency ? String(row.initial_published_currency) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export interface PartnerEventRevision {
  id: string;
  eventId: string;
  status: 'applied' | 'pending' | 'approved' | 'rejected' | 'blocked' | 'cancelled';
  riskLevel: 'low' | 'high';
  enforcementCode: string | null;
  ruleCode: string | null;
  previousValues: Record<string, unknown>;
  proposedValues: Record<string, unknown>;
  changedFields: string[];
  organizerReason: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export function demandSignalFromRow(row: DemandSummaryRow): DemandSignal {
  const count = Number(row.count ?? 0);
  switch (row.signal_type) {
    case 'event_add_to_plan': return { eventId: row.event_id, label: `${row.label} added to plans`, count, context: 'users added this event to a plan' };
    case 'event_reminder_enabled': return { eventId: row.event_id, label: `${row.label} reminders`, count, context: 'users asked to be reminded' };
    case 'event_view': return { eventId: row.event_id, label: `${row.label} views`, count, context: 'users opened this event' };
    case 'venue_add_to_plan': return { eventId: null, label: `${row.label} added to plans`, count, context: 'users built plans around this venue' };
    case 'venue_saved': return { eventId: null, label: `${row.label} saves`, count, context: 'users saved this venue' };
    default: return { eventId: null, label: `${row.label} views`, count, context: 'users opened this venue' };
  }
}

export function reviewInsightFromRow(row: ReviewSummaryRow): PartnerReviewInsight {
  return {
    venueId: row.venue_id, venueName: row.venue_name, reviewCount: Number(row.review_count ?? 0),
    avgVibe: row.avg_vibe === null ? null : Number(row.avg_vibe),
    avgValue: row.avg_value === null ? null : Number(row.avg_value),
    avgRating: row.avg_rating === null ? null : Number(row.avg_rating),
  };
}

export function partnerEventVenueWorkflowFromRow(row: PartnerEventVenueWorkflowRow): PartnerEventVenueWorkflow {
  return {
    relationshipId: row.relationship_id,
    eventId: row.event_id,
    venueId: row.venue_id,
    eventName: row.event_title,
    eventCategory: row.event_category ?? 'Event',
    eventStatus: row.event_status as PartnerEventVenueWorkflow['eventStatus'],
    eventStartsAt: row.event_starts_at,
    venueName: row.venue_name,
    organizerName: row.organizer_name,
    placementStatus: row.placement_status as PartnerEventVenueWorkflow['placementStatus'],
    attributionStatus: row.attribution_status as PartnerEventVenueWorkflow['attributionStatus'],
    requestSource: row.request_source,
    decisionReason: row.decision_reason,
    disputeReason: row.dispute_reason,
    responseReason: row.response_reason,
    resolutionReason: row.resolution_reason,
    version: Number(row.relationship_version),
    requestedAt: row.requested_at,
    updatedAt: row.updated_at,
    canManageEvent: row.can_manage_event,
    canManageVenue: row.can_manage_venue,
  };
}
