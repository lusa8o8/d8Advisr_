export type EventStatus = 'live' | 'draft' | 'paused' | 'past' | 'cancelled';
export type Frequency = 'one-off' | 'weekly' | 'monthly' | 'annual';
export type ListingStatus = 'live' | 'pending' | 'needs_update' | 'rejected';
export type VenueListingStatus = 'draft' | 'submitted' | 'under_review' | 'live' | 'needs_update' | 'hidden';
export type VenueVerificationStatus = 'unverified' | 'verified' | 'reverify_required' | 'expired';
export type EventLocationKind = 'd8_venue' | 'external' | 'undisclosed';
export type VenuePageStatus = 'hidden' | 'requested' | 'approved' | 'rejected';

export interface PartnerEvent {
  id: string;
  name: string;
  emoji: string;
  frequency: Frequency;
  nextOccurrence: string;
  spotsTotal: number;     // 0 = open / no cap
  price: string;          // 'Free entry' or formatted entry price
  isFree?: boolean;
  status: EventStatus;
  category: string;
  description: string;
  weekday?: string | null;
  startsAt?: string | null;
  priceAmount: number;
  currency: string;
  vibes: string[];
  coverImage?: string | null;
  images?: string[];
  locationKind?: EventLocationKind;
  venueId?: string | null;
  venuePageStatus?: VenuePageStatus;
  externalLocationName?: string | null;
  externalLocationAddress?: string | null;
  firstPublishedAt?: string | null;
  initialPublishedIsFree?: boolean | null;
  initialPublishedPrice?: number | null;
  initialPublishedCurrency?: string | null;
  updatedAt?: string | null;
  hasPendingRevision?: boolean;
}

export interface PartnerVenueOption {
  id: string;
  name: string;
  city: string;
  area: string | null;
  partnerId: string | null;
  isOwnedByCurrentPartner: boolean;
}

export interface PartnerVenueListing {
  id: string;
  name: string;
  regionId: string;
  status: VenueListingStatus;
  verificationStatus: VenueVerificationStatus;
  reverificationReason: string | null;
  isActive: boolean;
  category: string;
  description: string | null;
  address: string | null;
  area: string | null;
  priceTier: string | null;
  averageCostPerPerson: number | null;
  vibes: string[];
  openHours: Record<string, string> | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  coverImage: string | null;
  images: string[];
  updatedAt: string;
  hasPendingRevision: boolean;
}

export interface VenuePlacementRequest {
  eventId: string;
  eventName: string;
  eventCategory: string;
  eventStartsAt: string;
  eventStatus: EventStatus;
  venueId: string;
  venueName: string;
  organizerId: string | null;
  organizerName: string;
  status: VenuePageStatus;
  createdAt: string;
}

export type EventVenuePlacementStatus = 'requested' | 'approved' | 'declined' | 'revoked' | 'withdrawn';
export type EventVenueAttributionStatus = 'uncontested' | 'disputed' | 'resolved_confirmed' | 'resolved_invalid' | 'withdrawn';

export interface PartnerEventVenueWorkflow {
  relationshipId: string;
  eventId: string;
  venueId: string;
  eventName: string;
  eventCategory: string;
  eventStatus: EventStatus;
  eventStartsAt: string | null;
  venueName: string;
  organizerName: string;
  placementStatus: EventVenuePlacementStatus;
  attributionStatus: EventVenueAttributionStatus;
  requestSource: string;
  decisionReason: string | null;
  disputeReason: string | null;
  responseReason: string | null;
  resolutionReason: string | null;
  version: number;
  requestedAt: string;
  updatedAt: string;
  canManageEvent: boolean;
  canManageVenue: boolean;
}

export interface DemandSignal {
  eventId: string | null;
  label: string;
  count: number;
  context: string;
}

export interface PartnerReviewInsight {
  venueId: string;
  venueName: string;
  reviewCount: number;
  avgVibe: number | null;
  avgValue: number | null;
  avgRating: number | null;
}

export interface D8Message {
  id: string;
  date: string;
  text: string;
  type: 'info' | 'action' | 'approved';
}

export interface Platform {
  id: string;
  name: string;
  short: string;
  color: string;
  charLimit: number | null;
  connected: boolean;
  note?: string;
}

export interface PostType {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  d8Signal: string;
}

export interface City {
  id: string;
  name: string;
  country: string;
  flag: string;
  currencySymbol: string;
  currencyName: string;
  live: boolean;
}

export interface EventInterest {
  id: string;
  userId: string;
  eventId: string;
  interestType: 'reminder' | 'saved' | 'plan' | 'ticket' | 'waitlist';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumerNotification {
  id: string;
  userId: string;
  eventId: string | null;
  type: 'event_rescheduled' | 'event_relocated' | 'event_price_reduced' | 'event_price_changed' | 'event_cancelled' | 'system' | 'vibe_match';
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}
