import { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import {
  ArrowLeft, Sparkles, MapPin, Clock, ChevronRight,
  Footprints, Car, Share2, BookmarkPlus, RotateCcw, Wallet, Check
} from 'lucide-react';
import { cn } from "@/components/SharedUI";

// ─── Plan data ─────────────────────────────────────────────────────────────────

type Tier = 'Verified' | 'D8 Approved' | 'Hidden Gem';

interface Stop {
  id: string;
  num: number;
  venueName: string;
  category: string;
  tier: Tier;
  time: string;
  label: string;
  costPP: number;
  isFree?: boolean;
  emoji: string;
  image: string;
  venueId: string;
}

interface Transport {
  mode: 'walk' | 'ride';
  detail: string;
  duration: string;
  cost: number;
}

const PLAN_STOPS: Stop[] = [
  {
    id: 's1', num: 1,
    venueName: 'The Velvet Lounge',
    category: 'Cocktail Bar',
    tier: 'Verified',
    time: '7:00 PM',
    label: 'Pre-dinner drinks',
    costPP: 30,
    emoji: '🍸',
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&h=200&fit=crop&auto=format',
    venueId: '2',
  },
  {
    id: 's2', num: 2,
    venueName: 'Lumina Restaurant & Bar',
    category: 'Romantic Dining',
    tier: 'D8 Approved',
    time: '8:15 PM',
    label: 'Dinner',
    costPP: 65,
    emoji: '🍽️',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop&auto=format',
    venueId: '1',
  },
  {
    id: 's3', num: 3,
    venueName: 'Skyline Rooftop',
    category: 'Rooftop Bar',
    tier: 'Hidden Gem',
    time: '10:30 PM',
    label: 'Nightcap',
    costPP: 20,
    emoji: '🌙',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop&auto=format',
    venueId: '3',
  },
];

const TRANSPORTS: Transport[] = [
  { mode: 'ride', detail: 'Yango · est.', duration: '5 min', cost: 8 },
  { mode: 'walk', detail: 'Walk',         duration: '4 min', cost: 0 },
];

const TIER_BADGE: Record<Tier, string> = {
  'Verified':    'bg-blue-50 text-blue-700 border-blue-200',
  'D8 Approved': 'bg-amber-50 text-amber-700 border-amber-200',
  'Hidden Gem':  'bg-purple-50 text-purple-700 border-purple-200',
};

const TIER_DOT: Record<Tier, string> = {
  'Verified':    'bg-blue-400',
  'D8 Approved': 'bg-amber-400',
  'Hidden Gem':  'bg-purple-500',
};

const STASH_PCT = 45;

// ─── Component ──────────────────────────────────────────────────────────────────

export function PlanOverview() {
  const [, setLocation] = useLocation();
  const [saved, setSaved] = useState(false);

  // Read anchor once — injected by "Build Around" flow from VenueDetails
  const [stops, setStops] = useState<(Stop & { isAnchor?: boolean })[]>(PLAN_STOPS);
  const [anchorLabel, setAnchorLabel] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('d8advisr_plan_anchor');
    if (raw) {
      try {
        const anchor = JSON.parse(raw);
        const updated = PLAN_STOPS.map(s => {
          if (s.id === 's2') {
            return {
              ...s,
              venueName: anchor.venueName,
              category: anchor.venueCategory || s.category,
              emoji: anchor.venueEmoji || s.emoji,
              isAnchor: true,
            };
          }
          return s;
        });
        setStops(updated);
        setAnchorLabel(anchor.venueName);
      } catch {
        // ignore malformed data
      }
      localStorage.removeItem('d8advisr_plan_anchor');
    }
  }, []);

  const stopTotal = stops.reduce((sum, s) => sum + (s.isFree ? 0 : s.costPP), 0);
  const transportTotal = TRANSPORTS.reduce((sum, t) => sum + t.cost, 0);
  const grandTotal = stopTotal + transportTotal;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setLocation('/plan/1'), 800);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F7F7F7]">

      {/* ── SCROLL AREA ───────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-36">

        {/* ── HERO ──────────────────────────────────────────────────────────────── */}
        <div className="relative bg-[#141414] px-6 pt-14 pb-8 overflow-hidden">
          {/* Ambient glows */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF5A5F]/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl -ml-16 -mb-8 pointer-events-none" />

          {/* Back */}
          <button
            onClick={() => setLocation('/home')}
            className="absolute top-14 left-6 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform z-10"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Celebration */}
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF5A5F] to-[#FF9500] flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(255,90,95,0.5)] mb-5">
              <Sparkles size={28} className="text-white" />
            </div>
            <p className="text-white/50 text-[12px] font-bold uppercase tracking-widest mb-1">Your evening is planned</p>
            <h1 className="text-white font-black text-[26px] leading-tight mb-3">
              Romantic Night<br />in Lagos
            </h1>
            <div className="flex items-center gap-4 text-white/60 text-[12px] font-semibold">
              <span className="flex items-center gap-1.5"><Clock size={12} /> Tonight · 7:00 PM</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span className="flex items-center gap-1.5"><MapPin size={12} /> Downtown</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>3 stops</span>
            </div>
          </div>
        </div>

        {/* ── PLAN TIMELINE ─────────────────────────────────────────────────────── */}
        <div className="px-4 -mt-4 relative">

          {stops.map((stop, idx) => (
            <div key={stop.id}>
              {/* Venue card */}
              <button
                onClick={() => setLocation(`/venue/${stop.venueId}`)}
                className={cn(
                  "w-full bg-white rounded-3xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform mb-0 text-left border",
                  (stop as Stop & { isAnchor?: boolean }).isAnchor
                    ? "border-primary/30 ring-1 ring-primary/15"
                    : "border-gray-200"
                )}
              >
                {/* Image strip */}
                <div className="h-28 relative overflow-hidden">
                  <img src={stop.image} alt={stop.venueName} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                  {/* Stop number + time */}
                  <div className="absolute top-3 left-4 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <span className="text-[12px] font-black text-gray-900">{stop.num}</span>
                    </div>
                    <div className="bg-black/40 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                      {stop.time}
                    </div>
                  </div>
                  {/* Tier badge — or "Your Choice" if anchored */}
                  {(stop as Stop & { isAnchor?: boolean }).isAnchor ? (
                    <div className="absolute top-3 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary text-white backdrop-blur-sm">
                      <Check size={9} strokeWidth={3} />
                      Your Choice
                    </div>
                  ) : (
                    <div className={cn(
                      "absolute top-3 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-white/90 backdrop-blur-sm",
                      TIER_BADGE[stop.tier]
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", TIER_DOT[stop.tier])} />
                      {stop.tier}
                    </div>
                  )}
                  {/* Emoji */}
                  <span className="absolute bottom-3 left-4 text-2xl drop-shadow-md">{stop.emoji}</span>
                </div>

                {/* Card body */}
                <div className="px-4 py-3.5 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{stop.label}</p>
                    <p className="font-bold text-gray-900 text-[15px] leading-tight truncate">{stop.venueName}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">{stop.category}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-black text-gray-900 text-[16px] leading-tight">
                        {stop.isFree ? <span className="text-[#00C851]">Free</span> : `₦${(stop.costPP * 1500).toLocaleString()}`}
                      </p>
                      {!stop.isFree && <p className="text-[10px] text-gray-400">per person</p>}
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </button>

              {/* Transport connector between stops */}
              {idx < stops.length - 1 && TRANSPORTS[idx] && (
                <div className="flex items-center gap-3 py-3 px-5">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-px h-2 bg-gray-200" />
                    <div className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center shrink-0">
                      {TRANSPORTS[idx].mode === 'walk'
                        ? <Footprints size={13} className="text-[#00C851]" />
                        : <Car size={13} className="text-blue-500" />}
                    </div>
                    <div className="w-px h-2 bg-gray-200" />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-bold text-gray-700">
                        {TRANSPORTS[idx].detail} · {TRANSPORTS[idx].duration}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {stops[idx + 1].venueName}
                      </p>
                    </div>
                    <span className="text-[12px] font-bold text-gray-500">
                      {TRANSPORTS[idx].cost === 0 ? 'Free' : `~₦${(TRANSPORTS[idx].cost * 1500).toLocaleString()}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── COST BREAKDOWN ────────────────────────────────────────────────────── */}
        <div className="mx-4 mt-2 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cost Breakdown · Per Person</p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            {stops.map(s => (
              <div key={s.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{s.emoji}</span>
                  <span className="text-[13px] font-semibold text-gray-700">{s.venueName}</span>
                  {(s as Stop & { isAnchor?: boolean }).isAnchor && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Your pick</span>
                  )}
                </div>
                <span className="text-[13px] font-bold text-gray-900">
                  {s.isFree ? <span className="text-[#00C851]">Free</span> : `₦${(s.costPP * 1500).toLocaleString()}`}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Car size={15} className="text-blue-400" />
                <span className="text-[13px] font-semibold text-gray-700">Transport (est.)</span>
              </div>
              <span className="text-[13px] font-bold text-gray-900">~₦{(transportTotal * 1500).toLocaleString()}</span>
            </div>
          </div>
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900 text-[15px]">Total estimate</p>
              <p className="text-[11px] text-gray-400 mt-0.5">±10% depending on choices made</p>
            </div>
            <p className="font-black text-[22px] text-gray-900">₦{(grandTotal * 1500).toLocaleString()}</p>
          </div>
        </div>

        {/* ── STASH CTA ─────────────────────────────────────────────────────────── */}
        <div
          className="mx-4 mt-3 rounded-3xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => setLocation('/profile/budget')}
        >
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shrink-0">
                <Wallet size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-[14px] leading-tight">Your Evening Fund</p>
                <p className="text-[12px] text-amber-700 font-medium">
                  {STASH_PCT}% saved · ₦{Math.round(grandTotal * 1500 * STASH_PCT / 100).toLocaleString()} of ₦{(grandTotal * 1500).toLocaleString()}
                </p>
              </div>
              <ChevronRight size={16} className="text-amber-500 shrink-0" />
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                style={{ width: `${STASH_PCT}%` }}
              />
            </div>
            <p className="text-[11px] text-amber-600 mt-1.5 font-medium">
              ₦{Math.round(grandTotal * 1500 * (1 - STASH_PCT / 100)).toLocaleString()} more to cover this evening — keep going!
            </p>
          </div>
        </div>

        {/* ── SHARE NUDGE ───────────────────────────────────────────────────────── */}
        <div className="mx-4 mt-3">
          <button
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-500 font-semibold text-[13px] active:scale-[0.98] transition-transform hover:border-gray-300 shadow-sm"
          >
            <Share2 size={15} /> Share this plan
          </button>
        </div>
      </div>

      {/* ── FIXED ACTION BAR ──────────────────────────────────────────────────── */}
      <div className="px-5 pb-10 pt-4 bg-white border-t border-gray-100 shadow-[0_-10px_24px_rgba(0,0,0,0.05)] shrink-0">
        <div className="flex gap-3">
          {/* Regenerate */}
          <button
            onClick={() => setLocation('/plan/generate')}
            className="w-14 h-14 rounded-2xl border-2 border-gray-200 flex items-center justify-center text-gray-500 active:scale-95 transition-transform shrink-0 hover:border-gray-300"
          >
            <RotateCcw size={20} />
          </button>

          {/* Save plan */}
          <button
            onClick={handleSave}
            className={cn(
              "flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-[16px] transition-all active:scale-[0.98]",
              saved
                ? "bg-[#00C851] text-white shadow-[0_8px_20px_-6px_rgba(0,200,81,0.4)]"
                : "bg-[#FF5A5F] text-white shadow-[0_8px_20px_-6px_rgba(255,90,95,0.45)] hover:bg-[#FF5A5F]/90"
            )}
          >
            {saved
              ? <><Check size={20} strokeWidth={3} /> Saved!</>
              : <><BookmarkPlus size={20} /> Save This Plan</>}
          </button>
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-3">
          Tap <RotateCcw size={10} className="inline mx-0.5" /> to regenerate with the same vibe
        </p>
      </div>
    </div>
  );
}
