import type { PartnerEvent, DemandSignal, D8Message, ListingStatus } from './types';

// ── Demo partner: Bo Jangles Restaurant, Lusaka ───────────────────────────────

export const DEMO_PARTNER = {
  name:   'Bo Jangles Restaurant',
  type:   'both',
  city:   'Lusaka, Zambia',
  status: 'live' as ListingStatus,
};

// ── Events ────────────────────────────────────────────────────────────────────

export const DEMO_EVENTS: PartnerEvent[] = [
  {
    id: 'pe1',
    name: 'Jazz Night',
    emoji: '🎷',
    frequency: 'weekly',
    nextOccurrence: 'Thu, Apr 24 · 7:00 PM',
    spotsTotal: 60,
    spotsFilled: 44,
    price: 'K150/pp',
    status: 'live',
    category: 'Music',
  },
  {
    id: 'pe2',
    name: 'Sunday Brunch',
    emoji: '🍳',
    frequency: 'weekly',
    nextOccurrence: 'Sun, Apr 27 · 10:00 AM',
    spotsTotal: 40,
    spotsFilled: 12,
    price: 'K200/pp',
    status: 'live',
    category: 'Dining',
  },
  {
    id: 'pe3',
    name: 'Comedy Open Mic',
    emoji: '🎤',
    frequency: 'monthly',
    nextOccurrence: 'Sat, May 3 · 8:00 PM',
    spotsTotal: 80,
    spotsFilled: 0,
    price: 'K100/pp',
    status: 'draft',
    category: 'Entertainment',
  },
  {
    id: 'pe4',
    name: 'Lusaka City Run',
    emoji: '🏃',
    frequency: 'annual',
    nextOccurrence: 'Sat, Jun 21 · 6:00 AM',
    spotsTotal: 0,
    spotsFilled: 0,
    interestCount: 47,
    price: 'Free',
    isFree: true,
    status: 'live',
    category: 'Sports & Fitness',
  },
];

export const DEMO_EVENT_MAP = Object.fromEntries(DEMO_EVENTS.map(e => [e.id, e]));

// ── Demand signals ────────────────────────────────────────────────────────────

export const DEMO_DEMAND: DemandSignal[] = [
  {
    eventId: null,
    label: 'Plans including your venue',
    count: 23,
    context: 'this week across Lagos and Lusaka',
  },
  {
    eventId: 'pe1',
    label: 'Interest in Jazz Night',
    count: 11,
    context: "users who haven't booked yet",
  },
  {
    eventId: 'pe4',
    label: 'Going to Lusaka City Run',
    count: 47,
    context: 'people planning via D8 — no cap, open event',
  },
];

// ── D8 inbox messages ─────────────────────────────────────────────────────────

export const DEMO_MESSAGES: D8Message[] = [
  {
    id: 'm1',
    date: 'Today',
    type: 'approved',
    text: "Your listing is live. You're now appearing in D8Advisr searches for Lusaka.",
  },
  {
    id: 'm2',
    date: 'Yesterday',
    type: 'action',
    text: 'Jazz Night has 16 spots left for this Thursday. Consider posting an update to your WhatsApp to fill remaining seats.',
  },
];
