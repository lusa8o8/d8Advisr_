import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft, Plus, ChevronRight, AlertCircle, CheckCircle,
  Clock, Pause, Users, Edit3, Trash2, Bell, X,
} from 'lucide-react';
import { cn } from '@/components/SharedUI';

type EventStatus = 'live' | 'draft' | 'paused' | 'past';
type Frequency = 'one-off' | 'weekly' | 'monthly' | 'annual';
type ListingStatus = 'live' | 'pending' | 'needs_update';

interface PartnerEvent {
  id: string;
  name: string;
  emoji: string;
  frequency: Frequency;
  nextOccurrence: string;
  spotsTotal: number;       // 0 = open / no cap
  spotsFilled: number;
  interestCount?: number;   // for open events — people going via D8
  price: string;            // 'Free' or price string
  isFree?: boolean;
  status: EventStatus;
  category: string;
}

interface DemandSignal {
  eventId: string | null;
  label: string;
  count: number;
  context: string;
}

interface D8Message {
  id: string;
  date: string;
  text: string;
  type: 'info' | 'action' | 'approved';
}

// ── Seed data for demo (Bo Jangles, Lusaka) ──────────────────────────────────

const DEMO_NAME = 'Bo Jangles Restaurant';
const DEMO_TYPE = 'both';
const DEMO_CITY = 'Lusaka, Zambia';
const DEMO_STATUS: ListingStatus = 'live';

const DEMO_EVENTS: PartnerEvent[] = [
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

const DEMO_DEMAND: DemandSignal[] = [
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
    context: 'users who haven\'t booked yet',
  },
  {
    eventId: 'pe4',
    label: 'Going to Lusaka City Run',
    count: 47,
    context: 'people planning via D8 — no cap, open event',
  },
];

const DEMO_MESSAGES: D8Message[] = [
  {
    id: 'm1',
    date: 'Today',
    type: 'approved',
    text: 'Your listing is live. You\'re now appearing in D8Advisr searches for Lusaka.',
  },
  {
    id: 'm2',
    date: 'Yesterday',
    type: 'action',
    text: 'Jazz Night has 16 spots left for this Thursday. Consider posting an update to your WhatsApp to fill remaining seats.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

const STATUS_PILL: Record<ListingStatus, { label: string; color: string }> = {
  live:         { label: 'Live',         color: 'bg-[#E8FFF0] text-[#00C851]' },
  pending:      { label: 'Under review', color: 'bg-amber-50 text-amber-700' },
  needs_update: { label: 'Needs update', color: 'bg-red-50 text-red-600' },
};

const EVENT_STATUS_PILL: Record<EventStatus, { label: string; color: string }> = {
  live:   { label: 'Live',   color: 'bg-[#E8FFF0] text-[#00C851]' },
  draft:  { label: 'Draft',  color: 'bg-gray-100 text-gray-500' },
  paused: { label: 'Paused', color: 'bg-amber-50 text-amber-700' },
  past:   { label: 'Past',   color: 'bg-gray-100 text-gray-400' },
};

const FREQ_LABEL: Record<Frequency, string> = {
  'one-off': 'One-off',
  weekly:    'Weekly',
  monthly:   'Monthly',
  annual:    'Annual',
};

function SpotsBar({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const almostFull = pct >= 80;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-400 font-medium">{filled}/{total} spots filled</span>
        <span className={cn('text-[11px] font-bold', almostFull ? 'text-primary' : 'text-[#00C851]')}>
          {total - filled} left
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', almostFull ? 'bg-primary' : 'bg-[#00C851]')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PartnerDashboard() {
  const [, setLocation] = useLocation();

  // Read from localStorage — fall back to demo seed
  const storedName   = localStorage.getItem('d8_partner_name')   || DEMO_NAME;
  const storedType   = localStorage.getItem('d8_partner_type')   || DEMO_TYPE;
  const storedCity   = localStorage.getItem('d8_partner_city')   || DEMO_CITY;
  const storedStatus = (localStorage.getItem('d8_partner_status') || DEMO_STATUS) as ListingStatus;

  const [events, setEvents] = useState<PartnerEvent[]>(DEMO_EVENTS);
  const [messages, setMessages] = useState<D8Message[]>(DEMO_MESSAGES);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const isDemo = !localStorage.getItem('d8_partner_name');

  const toggleStatus = (id: string) => {
    setEvents(evts => evts.map(e =>
      e.id === id
        ? { ...e, status: e.status === 'live' ? 'paused' : 'live' }
        : e
    ));
  };

  const publishDraft = (id: string) => {
    setEvents(evts => evts.map(e => e.id === id ? { ...e, status: 'live' } : e));
  };

  const activeMessages = messages.filter(m => !dismissedIds.includes(m.id));

  const typeLabel =
    storedType === 'venue' ? 'Venue' :
    storedType === 'organizer' ? 'Organiser' :
    'Venue & Organiser';

  return (
    <div className="flex-1 min-h-0 bg-[#F7F7F7] flex flex-col overflow-y-auto no-scrollbar pb-10">

      {/* Header */}
      <div className="bg-[#111] px-5 pt-12 pb-5 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setLocation('/home')}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={() => setLocation('/partner/event/new')}
            className="flex items-center gap-1.5 bg-primary text-white text-[12px] font-bold px-3.5 py-2 rounded-full active:scale-95 transition-transform"
          >
            <Plus size={13} /> Add event
          </button>
        </div>

        <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-0.5">D8 Partner</p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-white font-black text-[20px] leading-tight">{storedName}</h1>
            <p className="text-white/50 text-[12px] font-medium mt-0.5">{typeLabel} · {storedCity}</p>
          </div>
          <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 mt-1', STATUS_PILL[storedStatus].color)}>
            {STATUS_PILL[storedStatus].label}
          </span>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-5">

        {/* Demo notice */}
        {isDemo && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-700 font-medium leading-relaxed">
              You're viewing a demo account. <button onClick={() => { localStorage.removeItem('d8_partner_name'); setLocation('/partner'); }} className="underline font-bold">Set up your real profile →</button>
            </p>
          </div>
        )}

        {/* Messages from D8 */}
        {activeMessages.length > 0 && (
          <div className="flex flex-col gap-2">
            {activeMessages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  'rounded-2xl p-4 flex items-start gap-3 border',
                  msg.type === 'approved' ? 'bg-[#E8FFF0] border-green-200' :
                  msg.type === 'action' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                )}
              >
                {msg.type === 'approved'
                  ? <CheckCircle size={16} className="text-[#00C851] shrink-0 mt-0.5" />
                  : <Bell size={16} className="text-blue-500 shrink-0 mt-0.5" />
                }
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{msg.date} · From D8</p>
                  <p className="text-[13px] text-gray-700 leading-relaxed font-medium">{msg.text}</p>
                </div>
                <button
                  onClick={() => setDismissedIds(ids => [...ids, msg.id])}
                  className="text-gray-300 hover:text-gray-500 shrink-0 mt-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Demand signals — numbers only, no graphs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">This week</p>
          </div>
          {DEMO_DEMAND.map((sig, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-4 px-4 py-3.5',
                i < DEMO_DEMAND.length - 1 ? 'border-b border-gray-50' : ''
              )}
            >
              <span className="text-[28px] font-black text-gray-900 w-10 text-center leading-none shrink-0">
                {sig.count}
              </span>
              <div>
                <p className="font-semibold text-gray-800 text-[13px] leading-tight">{sig.label}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">{sig.context}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Events */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Your events</p>
            <button
              onClick={() => setLocation('/partner/event/new')}
              className="text-[12px] font-bold text-primary flex items-center gap-1"
            >
              <Plus size={13} /> New event
            </button>
          </div>

          {events.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-[14px] font-medium">No events yet</p>
              <p className="text-gray-300 text-[12px] mt-1">Add an event to start appearing in user plans</p>
              <button
                onClick={() => setLocation('/partner/event/new')}
                className="mt-4 bg-primary text-white text-[13px] font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 mx-auto active:scale-95 transition-transform"
              >
                <Plus size={14} /> Add your first event
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{event.emoji}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-[14px] leading-tight">{event.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                        {FREQ_LABEL[event.frequency]} · {event.category}
                      </p>
                    </div>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full shrink-0', EVENT_STATUS_PILL[event.status].color)}>
                    {EVENT_STATUS_PILL[event.status].label}
                  </span>
                </div>

                {/* Next occurrence */}
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <Clock size={12} className="text-gray-300 shrink-0" />
                  <span className="text-[12px] text-gray-500 font-medium">Next: {event.nextOccurrence}</span>
                  <span className="text-gray-300 mx-1">·</span>
                  {event.isFree ? (
                    <span className="text-[11px] font-bold text-[#00C851] bg-[#E8FFF0] px-2 py-0.5 rounded-full">Free</span>
                  ) : (
                    <span className="text-[12px] font-bold text-gray-700">{event.price}</span>
                  )}
                </div>

                {/* Capped event: spots bar */}
                {(event.status === 'live' || event.status === 'paused') && event.spotsTotal > 0 && (
                  <div className="mb-3">
                    <SpotsBar filled={event.spotsFilled} total={event.spotsTotal} />
                  </div>
                )}

                {/* Open event: D8 interest count */}
                {(event.status === 'live' || event.status === 'paused') && event.spotsTotal === 0 && event.interestCount !== undefined && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <Users size={13} className="text-gray-400 shrink-0" />
                    <span className="text-[13px] font-bold text-gray-800">{event.interestCount}</span>
                    <span className="text-[12px] text-gray-400 font-medium">people planning to attend via D8</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  {event.status === 'draft' && (
                    <button
                      onClick={() => publishDraft(event.id)}
                      className="flex items-center gap-1.5 bg-primary text-white text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                    >
                      <CheckCircle size={13} /> Publish
                    </button>
                  )}
                  {event.status === 'live' && (
                    <button
                      onClick={() => toggleStatus(event.id)}
                      className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200"
                    >
                      <Pause size={13} /> Pause
                    </button>
                  )}
                  {event.status === 'paused' && (
                    <button
                      onClick={() => toggleStatus(event.id)}
                      className="flex items-center gap-1.5 bg-[#E8FFF0] text-[#00C851] text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                    >
                      <CheckCircle size={13} /> Resume
                    </button>
                  )}
                  <button
                    onClick={() => setLocation(`/partner/event/${event.id}/edit`)}
                    className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200"
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  {event.spotsTotal > 0 && (
                    <button className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200 ml-auto">
                      <Users size={13} /> Attendees
                    </button>
                  )}
                  {event.spotsTotal === 0 && event.interestCount !== undefined && (
                    <button className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200 ml-auto">
                      <Users size={13} /> {event.interestCount} going
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Listing management */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Your listing</p>
          </div>
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors active:bg-gray-100"
            onClick={() => setLocation('/partner/venue/edit')}
          >
            <div>
              <p className="font-semibold text-gray-800 text-[13px]">Edit venue details</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Name, hours, address, photos, contact</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-gray-50 hover:bg-gray-50 transition-colors active:bg-gray-100"
            onClick={() => setLocation('/partner/event/new')}
          >
            <div>
              <p className="font-semibold text-gray-800 text-[13px]">Add a recurring activity</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Jazz night, brunch, fitness class — propagates automatically</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-gray-50 hover:bg-gray-50 transition-colors active:bg-gray-100 text-red-500"
            onClick={() => {
              if (confirm('Remove your D8 partner account?')) {
                localStorage.removeItem('d8_partner_name');
                localStorage.removeItem('d8_partner_type');
                localStorage.removeItem('d8_partner_city');
                localStorage.removeItem('d8_partner_contact');
                localStorage.removeItem('d8_partner_status');
                setLocation('/partner');
              }
            }}
          >
            <p className="font-semibold text-[13px]">Leave partner programme</p>
            <Trash2 size={15} />
          </button>
        </div>

      </div>
    </div>
  );
}
