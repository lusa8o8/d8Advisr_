export type EventStatus = 'live' | 'draft' | 'paused' | 'past';
export type Frequency = 'one-off' | 'weekly' | 'monthly' | 'annual';
export type ListingStatus = 'live' | 'pending' | 'needs_update';

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
}

export interface DemandSignal {
  eventId: string | null;
  label: string;
  count: number;
  context: string;
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
