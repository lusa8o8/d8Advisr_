import type { City, Platform, PostType, Frequency, EventStatus, ListingStatus } from './types';

// ── Cities ────────────────────────────────────────────────────────────────────

export const CITIES: City[] = [
  {
    id: 'lagos',
    name: 'Lagos',
    country: 'Nigeria',
    flag: '🇳🇬',
    currencySymbol: '₦',
    currencyName: 'Nigerian Naira (₦)',
    live: true,
  },
  {
    id: 'lusaka',
    name: 'Lusaka',
    country: 'Zambia',
    flag: '🇿🇲',
    currencySymbol: 'K',
    currencyName: 'Zambian Kwacha (K)',
    live: true,
  },
];

export const CITY_MAP = Object.fromEntries(CITIES.map(c => [c.id, c]));

// ── LocalStorage keys ─────────────────────────────────────────────────────────

export const LS_KEYS = {
  partnerName:    'd8_partner_name',
  partnerType:    'd8_partner_type',
  partnerCity:    'd8_partner_city',
  partnerContact: 'd8_partner_contact',
  partnerStatus:  'd8_partner_status',
} as const;

// ── Social platforms ──────────────────────────────────────────────────────────

export const PLATFORMS: Platform[] = [
  { id: 'instagram', name: 'Instagram',         short: 'IG', color: '#E1306C', charLimit: 2200, connected: true  },
  { id: 'facebook',  name: 'Facebook Page',     short: 'FB', color: '#1877F2', charLimit: null, connected: true  },
  { id: 'whatsapp',  name: 'WhatsApp Business', short: 'WA', color: '#25D366', charLimit: null, connected: true,  note: 'Sends to your broadcast list' },
  { id: 'x',         name: 'X (Twitter)',        short: 'X',  color: '#000000', charLimit: 280,  connected: false },
  { id: 'tiktok',    name: 'TikTok',             short: 'TT', color: '#010101', charLimit: 2200, connected: false },
  { id: 'linkedin',  name: 'LinkedIn',           short: 'LI', color: '#0A66C2', charLimit: 3000, connected: false },
];

export const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p]));

// ── Post types (D8 structured signals — no freeform noise) ────────────────────

export const POST_TYPES: PostType[] = [
  {
    id: 'announce',
    emoji: '📢',
    label: 'Event announcement',
    desc: 'New or upcoming event going live',
    d8Signal: 'event.announced',
  },
  {
    id: 'selling_fast',
    emoji: '🎟️',
    label: 'Tickets going fast',
    desc: 'Spots filling up — create urgency',
    d8Signal: 'event.selling_fast',
  },
  {
    id: 'sold_out',
    emoji: '🔴',
    label: 'Sold out',
    desc: 'Event is at capacity',
    d8Signal: 'event.sold_out',
  },
  {
    id: 'update',
    emoji: '🔄',
    label: 'Event update',
    desc: 'Date, time, or location has changed',
    d8Signal: 'event.updated',
  },
  {
    id: 'venue_update',
    emoji: '🏛️',
    label: 'Venue update',
    desc: 'New hours, menu change, photos',
    d8Signal: 'venue.updated',
  },
];

export const POST_TYPE_MAP = Object.fromEntries(POST_TYPES.map(t => [t.id, t]));

// ── Status display pills ──────────────────────────────────────────────────────

export const LISTING_STATUS_PILL: Record<ListingStatus, { label: string; color: string }> = {
  live:         { label: 'Live',         color: 'bg-[#E8FFF0] text-[#00C851]' },
  pending:      { label: 'Under review', color: 'bg-amber-50 text-amber-700'  },
  needs_update: { label: 'Needs update', color: 'bg-red-50 text-red-600'      },
};

export const EVENT_STATUS_PILL: Record<EventStatus, { label: string; color: string }> = {
  live:   { label: 'Live',   color: 'bg-[#E8FFF0] text-[#00C851]' },
  draft:  { label: 'Draft',  color: 'bg-gray-100 text-gray-500'   },
  paused: { label: 'Paused', color: 'bg-amber-50 text-amber-700'  },
  past:   { label: 'Past',   color: 'bg-gray-100 text-gray-400'   },
};

export const FREQ_LABEL: Record<Frequency, string> = {
  'one-off': 'One-off',
  weekly:    'Weekly',
  monthly:   'Monthly',
  annual:    'Annual',
};
