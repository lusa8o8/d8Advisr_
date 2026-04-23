import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Repeat,
  Star, Ticket, Share, Bell, BellOff, ChevronRight,
} from 'lucide-react';
import { cn } from '@/components/SharedUI';

type Recurrence = 'weekly' | 'monthly' | 'annual' | null;

interface EventData {
  id: string;
  name: string;
  emoji: string;
  category: string;
  venueName: string;
  venueId: string;
  venueAddress: string;
  date: string;
  time: string;
  endTime?: string;
  recurrence: Recurrence;
  recurrenceLabel: string | null;
  price: string;
  vibes: string[];
  desc: string;
  image: string;
  spotsLeft: number;
  totalCapacity: number;
  organizer: string;
  organizerVerified: boolean;
  highlights: string[];
}

const ALL_EVENTS: Record<string, EventData> = {
  e1: {
    id: 'e1',
    name: 'Jazz & Wine Night',
    emoji: '🎷',
    category: 'Music',
    venueName: 'Lumina Restaurant & Bar',
    venueId: '1',
    venueAddress: '123 Main St, Downtown',
    date: 'Fri, Oct 18',
    time: '7:30 PM',
    endTime: '11:00 PM',
    recurrence: 'weekly',
    recurrenceLabel: 'Every Friday',
    price: '₦30,000 /pp',
    vibes: ['Romantic', 'Foodie'],
    desc: 'Local jazz quartet paired with a curated wine flight. Perfect for a slow, soulful evening. Tables are intimate with candlelit settings and a dedicated wine sommelier on the night. Reservations recommended — spots fill quickly on Fridays.',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=400&fit=crop&auto=format',
    spotsLeft: 8,
    totalCapacity: 40,
    organizer: 'Lumina Restaurant & Bar',
    organizerVerified: true,
    highlights: ['Live jazz quartet', 'Curated wine pairing', 'Candlelit tables', 'Sommelier on duty'],
  },
  e2: {
    id: 'e2',
    name: "Chef's Table Experience",
    emoji: '👨‍🍳',
    category: 'Dining Experience',
    venueName: 'Lumina Restaurant & Bar',
    venueId: '1',
    venueAddress: '123 Main St, Downtown',
    date: 'Sat, Oct 19',
    time: '8:00 PM',
    endTime: '11:30 PM',
    recurrence: null,
    recurrenceLabel: null,
    price: '₦142,500 /pp',
    vibes: ['Romantic', 'Adventurous'],
    desc: '6-course tasting menu crafted live by the head chef. Limited to 10 guests per sitting. Wine pairings available as an add-on (₦25,000). Dietary requirements accommodated with 48h notice.',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=400&fit=crop&auto=format',
    spotsLeft: 3,
    totalCapacity: 10,
    organizer: 'Chef Emeka Adeyemi',
    organizerVerified: true,
    highlights: ['6-course tasting menu', 'Chef cooks live', 'Max 10 guests', 'Wine pairing optional'],
  },
  e3: {
    id: 'e3',
    name: 'Sunset Rooftop Social',
    emoji: '🌅',
    category: 'Social',
    venueName: 'Lumina Restaurant & Bar',
    venueId: '1',
    venueAddress: '123 Main St, Downtown',
    date: 'Sun, Oct 20',
    time: '6:00 PM',
    endTime: '10:00 PM',
    recurrence: 'monthly',
    recurrenceLabel: 'Every last Sunday',
    price: '₦22,500 /pp',
    vibes: ['Group', 'Date Night'],
    desc: 'Cocktails and small bites as the sun sets over downtown. Relaxed open format — come solo or bring the group. Live DJ from 7PM. Rooftop seating for up to 60 guests.',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=400&fit=crop&auto=format',
    spotsLeft: 22,
    totalCapacity: 60,
    organizer: 'Lumina Restaurant & Bar',
    organizerVerified: false,
    highlights: ['Rooftop panoramic views', 'Live DJ from 7PM', 'Open casual format', 'Cocktails & bites'],
  },
};

const VIBE_COLORS: Record<string, string> = {
  'Romantic': 'bg-[#FFF0F1] text-primary',
  'Foodie': 'bg-orange-50 text-orange-600',
  'Adventurous': 'bg-purple-50 text-purple-600',
  'Group': 'bg-blue-50 text-blue-600',
  'Date Night': 'bg-green-50 text-[#00C851]',
};

const RECURRENCE_META: Record<NonNullable<Recurrence>, { color: string; icon: string }> = {
  weekly:  { color: 'bg-blue-50 text-blue-600 border-blue-200',    icon: 'Weekly' },
  monthly: { color: 'bg-purple-50 text-purple-600 border-purple-200', icon: 'Monthly' },
  annual:  { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'Annual' },
};

export function EventDetail() {
  const [, setLocation] = useLocation();
  const [notifyOn, setNotifyOn] = useState(false);

  const pathParts = window.location.pathname.split('/');
  const eventId = pathParts[pathParts.length - 1];
  const event = ALL_EVENTS[eventId] ?? ALL_EVENTS['e1'];

  const spotsPercent = Math.round((1 - event.spotsLeft / event.totalCapacity) * 100);
  const isAlmostFull = event.spotsLeft <= 5;

  return (
    <div className="flex-1 min-h-0 bg-[#F7F7F7] flex flex-col relative overflow-y-auto no-scrollbar pb-28">

      {/* Hero */}
      <div className="h-64 relative overflow-hidden shrink-0">
        <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />

        <button
          onClick={() => window.history.back()}
          className="absolute top-14 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 active:scale-95 transition-transform z-10"
        >
          <ArrowLeft size={20} />
        </button>

        <button className="absolute top-14 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 z-10">
          <Share size={18} />
        </button>

        {event.recurrence && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1.5 rounded-full z-10 flex items-center gap-1.5">
            <Repeat size={11} /> {RECURRENCE_META[event.recurrence].icon}
          </div>
        )}

        <div className="absolute bottom-5 left-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl">
            {event.emoji}
          </div>
          <div>
            <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider">{event.category}</span>
            <p className="text-white font-bold text-[19px] drop-shadow-sm leading-tight">{event.name}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-4">

        {/* Main info card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">

          {/* Date / time / venue chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              <Calendar size={13} className="text-primary shrink-0" />
              <span className="font-semibold text-gray-800 text-[13px]">
                {event.recurrenceLabel ?? event.date}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              <Clock size={13} className="text-primary shrink-0" />
              <span className="font-semibold text-gray-800 text-[13px]">
                {event.time}{event.endTime ? ` – ${event.endTime}` : ''}
              </span>
            </div>
            <button
              onClick={() => setLocation(`/venue/${event.venueId}`)}
              className="flex items-center gap-2 bg-[#FFF0F1] rounded-xl px-3 py-2 border border-[#FFD5D6] active:scale-95 transition-transform"
            >
              <MapPin size={13} className="text-primary shrink-0" />
              <span className="font-semibold text-primary text-[13px]">{event.venueName}</span>
              <ChevronRight size={12} className="text-primary/60" />
            </button>
          </div>

          {/* Vibes + recurrence */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {event.vibes.map(v => (
              <span key={v} className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', VIBE_COLORS[v] || 'bg-gray-100 text-gray-600')}>
                {v}
              </span>
            ))}
            {event.recurrence && (
              <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1', RECURRENCE_META[event.recurrence].color)}>
                <Repeat size={10} /> {event.recurrenceLabel}
              </span>
            )}
            {!event.recurrence && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                One-off
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between bg-[#FFF0F1] rounded-2xl px-4 py-3.5">
            <span className="font-semibold text-gray-700 text-[14px]">Price per person</span>
            <span className="font-black text-primary text-[20px]">{event.price}</span>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-gray-400" />
              <span className="font-semibold text-gray-700 text-[13px]">Availability</span>
            </div>
            <span className={cn('font-bold text-[13px]', isAlmostFull ? 'text-primary' : 'text-[#00C851]')}>
              {isAlmostFull ? `⚠️ Only ${event.spotsLeft} left` : `${event.spotsLeft} spots open`}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
            <div
              className={cn('h-full rounded-full transition-all', isAlmostFull ? 'bg-primary' : 'bg-[#00C851]')}
              style={{ width: `${spotsPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 font-medium">
            {event.totalCapacity - event.spotsLeft} of {event.totalCapacity} spots taken
          </p>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 text-[15px] mb-2.5">
            About this {event.recurrence ? 'recurring event' : 'event'}
          </h3>
          <p className="text-[14px] text-gray-500 leading-relaxed">{event.desc}</p>
        </div>

        {/* What to expect */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 text-[15px] mb-3">What to expect</h3>
          <div className="grid grid-cols-2 gap-2">
            {event.highlights.map(h => (
              <div key={h} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-[12px] font-semibold text-gray-700 leading-tight">{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Organiser */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF0F1] flex items-center justify-center text-xl shrink-0">
            {event.emoji}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-gray-900 text-[14px]">{event.organizer}</p>
              {event.organizerVerified && (
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full border border-blue-200">✓ D8 Verified</span>
              )}
            </div>
            <p className="text-[12px] text-gray-400 font-medium mt-0.5">Event organiser</p>
          </div>
        </div>

        {/* Notify toggle */}
        <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {notifyOn ? <Bell size={18} /> : <BellOff size={18} />}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-[14px] leading-tight">Remind me</p>
              <p className="text-[12px] text-gray-400">
                {event.recurrence ? 'Get a reminder before each occurrence' : 'Get reminded before the event'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setNotifyOn(v => !v)}
            className={cn(
              'w-11 h-6 rounded-full transition-colors relative shrink-0',
              notifyOn ? 'bg-primary' : 'bg-gray-200'
            )}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
              notifyOn ? 'translate-x-[18px]' : 'translate-x-0'
            )} />
          </button>
        </div>

        {/* Venue link */}
        <button
          onClick={() => setLocation(`/venue/${event.venueId}`)}
          className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl">🍷</div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-[14px]">{event.venueName}</p>
              <p className="text-[12px] text-gray-400 font-medium">{event.venueAddress}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star size={13} className="fill-[#FF9500] text-[#FF9500]" />
            <span className="text-[13px] font-bold text-gray-700">4.8</span>
          </div>
        </button>

      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 w-full max-w-[430px] bg-white border-t border-gray-100 px-6 py-5 flex items-center gap-4 z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        <div>
          <p className="text-[11px] text-gray-400 font-medium">Per person</p>
          <p className="font-black text-primary text-[18px] leading-tight">{event.price}</p>
        </div>
        <button
          onClick={() => setLocation('/plan/generate')}
          className="flex-1 bg-primary text-white rounded-xl font-bold text-[16px] py-4 shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all hover:bg-primary/90 flex items-center justify-center gap-2"
        >
          <Ticket size={17} /> Add to Plan
        </button>
      </div>
    </div>
  );
}
