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
  spotsFilled: number;
  interestCount?: number; // for open events — people going via D8
  price: string;          // 'Free' or formatted price string
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
