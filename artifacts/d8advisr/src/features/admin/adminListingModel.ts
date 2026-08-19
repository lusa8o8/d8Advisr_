export type Tier = 'Verified' | 'D8 Approved' | 'Hidden Gem';
export type Health = 'green' | 'amber' | 'red';

export interface Venue {
  id: string;
  name: string;
  category: string;
  city: string;
  area: string | null;
  address: string | null;
  description: string | null;
  price: string;
  hours: string;
  photos: string[];
  coverImage: string | null;
  priceTier: string | null;
  averageCostPerPerson: number | null;
  vibes: string[];
  source: string | null;
  partnerId: string | null;
  operatorOrganizationId: string | null;
  updatedAt: string;
  listingStatus: string;
  verificationStatus: string;
  reverificationReason: string | null;
  lastVerifiedAt: string;
  nextVerificationDueAt: string;
  rating: number | null;
  reviewCount: number;
  isActive: boolean;
  tier: Tier;
  health: Health;
  nextInspectionDue: string;
}

export interface AdminVenueRow {
  id: string;
  name: string;
  category: string;
  city: string;
  area: string | null;
  address: string | null;
  tier: string | null;
  price_tier: string | null;
  description: string | null;
  cover_image: string | null;
  images: string[] | null;
  vibes: string[] | null;
  rating: number | null;
  review_count: number | null;
  avg_cost_pp: number | null;
  open_hours: Record<string, string> | null;
  listing_status: string;
  verification_status: string;
  reverification_reason: string | null;
  last_verified_at: string | null;
  next_verification_due_at: string | null;
  is_active: boolean | null;
  is_hidden_gem: boolean | null;
  partner_id: string | null;
  operator_organization_id: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export type AdminView = 'list' | 'detail' | 'tracker' | 'health' | 'submissions' | 'create';

export type SubmissionStatus = 'pending' | 'approved' | 'needs_update' | 'rejected';
export type SubmissionKind = 'venue' | 'event';
export type PartnerApplicationStatus = 'pending' | 'live' | 'needs_update' | 'rejected';
export type PartnerApplicationType = 'venue' | 'organizer' | 'both';
export type ReverificationTaskStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

export interface Submission {
  id: string;
  kind: SubmissionKind;
  name: string;
  city: string;
  category: string;
  contact: string;
  phone: string;
  submittedAt: string;
  status: SubmissionStatus;
  appStatus?: PartnerApplicationStatus;
  partnerType?: PartnerApplicationType;
  note?: string;
  extra?: string;
}

export interface PartnerApplicationRow {
  id: string;
  name: string;
  partner_type: PartnerApplicationType;
  city: string;
  contact: string;
  status: PartnerApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface VenuePlacementAdminRow {
  id: string;
  title: string;
  category: string | null;
  cover_image: string | null;
  starts_at: string | null;
  event_status: string | null;
  venue_id: string;
  venue_page_status: string;
  partner_id: string | null;
  created_at: string | null;
  venues?: { name?: string | null; city?: string | null; area?: string | null } | { name?: string | null; city?: string | null; area?: string | null }[] | null;
}

export interface VenuePlacementAdminRequest {
  eventId: string;
  eventName: string;
  category: string;
  coverImage: string | null;
  startsAt: string;
  eventStatus: string;
  venueId: string;
  venueName: string;
  venueCity: string;
  venueArea: string;
  organizerId: string | null;
  createdAt: string;
}

export interface VenueListingReviewRow {
  id: string;
  name: string;
  category: string;
  city: string;
  area: string | null;
  address: string | null;
  cover_image: string | null;
  images: string[] | null;
  partner_id: string | null;
  listing_status: string;
  verification_status: string;
  reverification_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueListingReview {
  id: string;
  name: string;
  category: string;
  city: string;
  area: string | null;
  address: string | null;
  coverImage: string | null;
  images: string[];
  partnerId: string | null;
  listingStatus: string;
  verificationStatus: string;
  reverificationReason: string | null;
  submittedAt: string;
}

export interface ReverificationVenueRow {
  id: string;
  name: string;
  category: string;
  city: string;
  area: string | null;
  tier: string | null;
  listing_status: string;
  verification_status: string;
  cover_image: string | null;
}

export interface ReverificationTaskRow {
  id: string;
  venue_id: string;
  reason: string;
  status: ReverificationTaskStatus;
  triggered_by: string | null;
  created_at: string;
  resolved_at: string | null;
  notes: string | null;
  live_revision_id: string | null;
  venues?: ReverificationVenueRow | ReverificationVenueRow[] | null;
}

export interface ReverificationTask {
  id: string;
  venueId: string;
  venueName: string;
  category: string;
  city: string;
  area: string | null;
  tier: Tier;
  listingStatus: string;
  verificationStatus: string;
  coverImage: string | null;
  reason: string;
  status: ReverificationTaskStatus;
  triggeredBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
  notes: string | null;
  liveRevisionId: string | null;
}

export type NoiseLevel = 'quiet' | 'moderate' | 'lively' | 'loud';

export interface VenueInspectionRow {
  id: string;
  venue_id: string;
  inspector_id: string | null;
  atmosphere_score: number | null;
  lighting_score: number | null;
  noise_level: NoiseLevel | null;
  occasion_fit: string[];
  inspector_notes: string | null;
  inspected_at: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionDraft {
  atmosphereScore: string;
  lightingScore: string;
  noiseLevel: NoiseLevel;
  occasionFit: string;
  inspectorNotes: string;
}

export interface VenueChangeLogRow {
  id: string;
  venue_id: string;
  changed_by: string | null;
  actor_email: string | null;
  actor_display_name: string | null;
  actor_username: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  risk_level: 'low' | 'high';
  applied_immediately: boolean;
  created_reverification: boolean;
  reverification_reason: string | null;
  created_at: string;
}

export interface VenueLiveRevision {
  id: string;
  venueId: string;
  status: 'pending' | 'approved' | 'rejected';
  previousValues: Record<string, unknown>;
  proposedValues: Record<string, unknown>;
  submittedBy: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  revisionSource: 'admin' | 'partner';
}

export interface VenueLiveRevisionRow {
  id: string;
  venue_id: string;
  status: VenueLiveRevision['status'];
  previous_values: Record<string, unknown>;
  proposed_values: Record<string, unknown>;
  submitted_by: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  revision_source: 'admin' | 'partner';
}

export function venueLiveRevisionFromRow(row: VenueLiveRevisionRow): VenueLiveRevision {
  return {
    id: row.id,
    venueId: row.venue_id,
    status: row.status,
    previousValues: row.previous_values,
    proposedValues: row.proposed_values,
    submittedBy: row.submitted_by,
    reviewedBy: row.reviewed_by,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    revisionSource: row.revision_source,
  };
}

export interface AdminEventLiveRevision {
  id: string;
  eventId: string;
  eventTitle: string;
  eventCategory: string;
  eventCity: string;
  status: 'applied' | 'pending' | 'approved' | 'rejected' | 'blocked' | 'cancelled';
  riskLevel: 'low' | 'high';
  enforcementCode: string | null;
  ruleCode: string | null;
  previousValues: Record<string, unknown>;
  proposedValues: Record<string, unknown>;
  changedFields: string[];
  submittedBy: string | null;
  revisionSource: 'admin' | 'partner';
  organizerReason: string | null;
  emergencyReason: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventLiveRevisionRow {
  id: string;
  event_id: string;
  status: AdminEventLiveRevision['status'];
  risk_level: AdminEventLiveRevision['riskLevel'];
  enforcement_code: string | null;
  rule_code: string | null;
  previous_values: Record<string, unknown>;
  proposed_values: Record<string, unknown>;
  changed_fields: string[];
  submitted_by: string | null;
  revision_source: 'admin' | 'partner';
  organizer_reason: string | null;
  emergency_reason: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  events?: { title?: string | null; category?: string | null; city?: string | null } | { title?: string | null; category?: string | null; city?: string | null }[] | null;
}

export function adminEventLiveRevisionFromRow(row: EventLiveRevisionRow): AdminEventLiveRevision {
  const ev = Array.isArray(row.events) ? row.events[0] : row.events;
  return {
    id: row.id,
    eventId: row.event_id,
    eventTitle: ev?.title ?? 'Untitled Event',
    eventCategory: ev?.category ?? 'Event',
    eventCity: ev?.city ?? 'Lusaka',
    status: row.status,
    riskLevel: row.risk_level,
    enforcementCode: row.enforcement_code,
    ruleCode: row.rule_code,
    previousValues: row.previous_values,
    proposedValues: row.proposed_values,
    changedFields: row.changed_fields ?? [],
    submittedBy: row.submitted_by,
    revisionSource: row.revision_source,
    organizerReason: row.organizer_reason,
    emergencyReason: row.emergency_reason,
    reviewedBy: row.reviewed_by,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function partnerTypeLabel(type: PartnerApplicationType) {
  if (type === 'venue') return 'Venue';
  if (type === 'organizer') return 'Organiser';
  return 'Venue & Organiser';
}

export function submissionStatusFromApp(status: PartnerApplicationStatus): SubmissionStatus {
  return status === 'live' ? 'approved' : status;
}

export function partnerApplicationToSubmission(row: PartnerApplicationRow): Submission {
  return {
    id: row.id,
    kind: row.partner_type === 'venue' ? 'venue' : 'event',
    name: row.name,
    city: row.city,
    category: partnerTypeLabel(row.partner_type),
    contact: row.name,
    phone: row.contact,
    submittedAt: new Date(row.created_at).toISOString().slice(0, 10),
    status: submissionStatusFromApp(row.status),
    appStatus: row.status,
    partnerType: row.partner_type,
    note: row.status === 'live' ? 'Approved by D8 Team' : row.status === 'needs_update' ? 'Needs more information' : undefined,
    extra: `Partner application · ${partnerTypeLabel(row.partner_type)}`,
  };
}

function venueFromPlacement(row: VenuePlacementAdminRow) {
  return Array.isArray(row.venues) ? row.venues[0] : row.venues;
}

export function venuePlacementAdminRequestFromRow(row: VenuePlacementAdminRow): VenuePlacementAdminRequest {
  const venue = venueFromPlacement(row);
  return {
    eventId: row.id,
    eventName: row.title,
    category: row.category ?? 'Event',
    coverImage: row.cover_image,
    startsAt: row.starts_at ?? '',
    eventStatus: row.event_status ?? 'draft',
    venueId: row.venue_id,
    venueName: venue?.name ?? 'Venue',
    venueCity: venue?.city ?? '',
    venueArea: venue?.area ?? '',
    organizerId: row.partner_id,
    createdAt: row.created_at ?? '',
  };
}

export function venueListingReviewFromRow(row: VenueListingReviewRow): VenueListingReview {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    city: row.city,
    area: row.area,
    address: row.address,
    coverImage: row.cover_image,
    images: row.images ?? [],
    partnerId: row.partner_id,
    listingStatus: row.listing_status,
    verificationStatus: row.verification_status,
    reverificationReason: row.reverification_reason,
    submittedAt: new Date(row.updated_at ?? row.created_at).toISOString().slice(0, 10),
  };
}

function venueFromReverificationTask(row: ReverificationTaskRow) {
  return Array.isArray(row.venues) ? row.venues[0] : row.venues;
}

export function reverificationTaskFromRow(row: ReverificationTaskRow): ReverificationTask {
  const venue = venueFromReverificationTask(row);
  return {
    id: row.id,
    venueId: row.venue_id,
    venueName: venue?.name ?? 'Venue',
    category: venue?.category ?? 'Venue',
    city: venue?.city ?? '',
    area: venue?.area ?? null,
    tier: coerceTier({
      tier: venue?.tier ?? null,
      is_hidden_gem: venue?.tier === 'Hidden Gem',
    } as AdminVenueRow),
    listingStatus: venue?.listing_status ?? 'unknown',
    verificationStatus: venue?.verification_status ?? 'unknown',
    coverImage: venue?.cover_image ?? null,
    reason: row.reason,
    status: row.status,
    triggeredBy: row.triggered_by,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    notes: row.notes,
    liveRevisionId: row.live_revision_id,
  };
}

export function reviewReasonLabel(reason: string | null) {
  switch (reason) {
    case 'name_changed':
      return 'Name changed';
    case 'address_changed':
      return 'Address changed';
    case 'category_changed':
      return 'Category changed';
    case 'price_changed':
      return 'Price changed';
    case 'admin_live_revision':
      return 'Live listing revision';
    case 'sensitive_field_changed':
      return 'Photos or sensitive fields changed';
    case 'admin_review':
      return 'Admin review';
    case 'needs_better_photos':
      return 'Needs better photos';
    default:
      return null;
  }
}

export function coerceTier(row: AdminVenueRow): Tier {
  if (row.is_hidden_gem) return 'Hidden Gem';
  if (row.tier === 'D8 Approved' || row.tier === 'Hidden Gem' || row.tier === 'Verified') return row.tier;
  return 'Verified';
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'Not scheduled';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'Not scheduled';
  return new Date(time).toISOString().slice(0, 10);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unknown time';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'Unknown time';
  return new Date(time).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function actorLabel(row: VenueChangeLogRow) {
  if (row.actor_email) return row.actor_email;
  if (row.actor_display_name) return row.actor_display_name;
  if (row.actor_username) return row.actor_username;
  if (row.changed_by) return `Admin ${row.changed_by.slice(0, 8)}`;
  return 'D8 admin';
}

export function formatOpenHours(hours: Record<string, string> | null) {
  if (!hours || Object.keys(hours).length === 0) return 'Not provided';
  return Object.entries(hours)
    .filter(([, value]) => Boolean(value))
    .map(([day, value]) => `${day}: ${value}`)
    .join(', ') || 'Not provided';
}

export function healthFromVenue(row: AdminVenueRow): Health {
  const due = row.next_verification_due_at ? new Date(row.next_verification_due_at).getTime() : null;
  const now = Date.now();
  if (
    row.listing_status === 'needs_update'
    || row.verification_status === 'expired'
    || (due !== null && !Number.isNaN(due) && due < now)
  ) {
    return 'red';
  }
  if (
    row.listing_status !== 'live'
    || row.verification_status === 'reverify_required'
    || (due !== null && !Number.isNaN(due) && due - now < 1000 * 60 * 60 * 24 * 30)
  ) {
    return 'amber';
  }
  return 'green';
}

export function adminVenueFromRow(row: AdminVenueRow): Venue {
  const photos = Array.from(new Set([row.cover_image, ...(row.images ?? [])].filter((url): url is string => Boolean(url))));
  const priceLevel = ({
    '$': '1 - Budget',
    '$$': '2 - Moderate',
    '$$$': '3 - Premium',
    '$$$$': '4 - Luxury',
  } as Record<string, string>)[row.price_tier ?? ''];
  const price = row.avg_cost_pp
    ? `${priceLevel ? `${priceLevel} - ` : ''}${row.avg_cost_pp} per person`
    : priceLevel || 'Not provided';
  const hours = formatOpenHours(row.open_hours);

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    city: row.city,
    area: row.area,
    address: row.address,
    description: row.description,
    price,
    hours,
    photos,
    coverImage: row.cover_image,
    priceTier: row.price_tier,
    averageCostPerPerson: row.avg_cost_pp,
    vibes: row.vibes ?? [],
    source: row.source,
    partnerId: row.partner_id,
    operatorOrganizationId: row.operator_organization_id,
    updatedAt: row.updated_at,
    listingStatus: row.listing_status,
    verificationStatus: row.verification_status,
    reverificationReason: row.reverification_reason,
    lastVerifiedAt: formatDate(row.last_verified_at),
    nextVerificationDueAt: formatDate(row.next_verification_due_at),
    rating: row.rating,
    reviewCount: row.review_count ?? 0,
    isActive: Boolean(row.is_active),
    tier: coerceTier(row),
    health: healthFromVenue(row),
    nextInspectionDue: formatDate(row.next_verification_due_at),
  };
}

export interface AdminEventRow {
  id: string;
  venue_id: string | null;
  partner_id: string | null;
  organizer_organization_id: string | null;
  source: string | null;
  title: string;
  description: string | null;
  category: string | null;
  vibes: string[] | null;
  cover_image: string | null;
  images: string[] | null;
  starts_at: string;
  ends_at: string | null;
  price_pp: number | null;
  currency: string | null;
  capacity: number | null;
  is_free: boolean | null;
  is_featured: boolean | null;
  city: string;
  event_location_kind: string | null;
  external_location_name: string | null;
  external_location_address: string | null;
  emoji: string | null;
  event_status: string;
  created_at: string;
  updated_at: string;
  venues?: { name?: string | null } | { name?: string | null }[] | null;
}

export interface AdminEvent {
  id: string;
  venueId: string | null;
  venueName: string | null;
  partnerId: string | null;
  organizerOrganizationId: string | null;
  source: string | null;
  title: string;
  description: string | null;
  category: string | null;
  vibes: string[];
  coverImage: string | null;
  images: string[];
  startsAt: string;
  endsAt: string | null;
  pricePerPerson: number | null;
  currency: string;
  capacity: number | null;
  isFree: boolean;
  isFeatured: boolean;
  city: string;
  eventLocationKind: 'd8_venue' | 'external' | 'undisclosed';
  externalLocationName: string | null;
  externalLocationAddress: string | null;
  emoji: string;
  eventStatus: string;
  createdAt: string;
  updatedAt: string;
}

export function adminEventFromRow(row: AdminEventRow): AdminEvent {
  return {
    id: row.id,
    venueId: row.venue_id,
    venueName: Array.isArray(row.venues) ? row.venues[0]?.name ?? null : row.venues?.name ?? null,
    partnerId: row.partner_id,
    organizerOrganizationId: row.organizer_organization_id,
    source: row.source,
    title: row.title,
    description: row.description,
    category: row.category,
    vibes: row.vibes ?? [],
    coverImage: row.cover_image,
    images: row.images ?? [],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    pricePerPerson: row.price_pp,
    currency: row.currency ?? 'ZMW',
    capacity: row.capacity,
    isFree: row.is_free ?? false,
    isFeatured: row.is_featured ?? false,
    city: row.city,
    eventLocationKind: (row.event_location_kind as 'd8_venue' | 'external' | 'undisclosed') ?? 'undisclosed',
    externalLocationName: row.external_location_name,
    externalLocationAddress: row.external_location_address,
    emoji: row.emoji ?? '✨',
    eventStatus: row.event_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
