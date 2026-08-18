import type { DemandSignal, ListingStatus, PartnerEvent, PartnerReviewInsight, VenuePlacementRequest } from '@workspace/d8-core/types';
import type { PartnerType } from '@workspace/d8-core/partner-capabilities';

export interface PartnerProfile {
  id: string;
  name: string;
  partner_type: PartnerType;
  city: string;
  contact: string;
  status: ListingStatus;
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

export interface VenuePlacementRequestRow {
  id: string;
  title: string;
  category: string | null;
  starts_at: string | null;
  event_status: string | null;
  venue_id: string;
  venue_page_status: string;
  partner_id: string | null;
  created_at: string | null;
  venues?: { name?: string | null } | { name?: string | null }[] | null;
}

export function partnerProfileFromRow(row: PartnerApplicationRow): PartnerProfile {
  return { id: row.id, name: row.name, partner_type: row.partner_type, city: row.city, contact: row.contact, status: row.status };
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
    id: String(row.id), name: String(row.title), emoji: String(row.emoji ?? '📅'),
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
  };
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

export function venuePlacementRequestFromRow(row: VenuePlacementRequestRow): VenuePlacementRequest {
  const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues;
  return {
    eventId: row.id, eventName: row.title, eventCategory: row.category ?? 'Event',
    eventStartsAt: row.starts_at ?? row.created_at ?? '',
    eventStatus: (row.event_status as VenuePlacementRequest['eventStatus']) ?? 'draft',
    venueId: row.venue_id, venueName: venue?.name ?? 'Venue', organizerId: row.partner_id,
    organizerName: 'Event organiser', status: row.venue_page_status as VenuePlacementRequest['status'],
    createdAt: row.created_at ?? '',
  };
}
