import { useState } from 'react';
import { useLocation } from "wouter";
import { BottomNav, FAB, cn } from "@/components/SharedUI";
import { Calendar, ChevronRight, Star, Users, MapPin, Clock, Plus, Filter } from 'lucide-react';

// ─── Mock saved plans ─────────────────────────────────────────────────────────

type PlanStatus = 'upcoming' | 'done' | 'draft';

interface SavedPlan {
  id: string;
  title: string;
  type: 'Romantic' | 'Group' | 'Solo' | 'Occasion';
  date: string;
  time: string;
  stopCount: number;
  totalCost: number;
  status: PlanStatus;
  rating?: number;
  emoji: string;
  locations: string[];
  color: string;
}

const PLANS: SavedPlan[] = [
  {
    id: '1',
    title: 'Romantic Night Downtown',
    type: 'Romantic',
    date: 'Tonight',
    time: '7:00 PM',
    stopCount: 3,
    totalCost: 123,
    status: 'upcoming',
    emoji: '🍷',
    locations: ['The Velvet Lounge', 'Lumina Restaurant', 'Skyline Rooftop'],
    color: 'from-rose-400/20 to-red-400/10',
  },
  {
    id: '2',
    title: 'Friday Fun',
    type: 'Group',
    date: 'Sat, Oct 28',
    time: '6:30 PM',
    stopCount: 2,
    totalCost: 65,
    status: 'upcoming',
    emoji: '🎳',
    locations: ['Lucky Strike Lanes', 'The Jazz Corner'],
    color: 'from-blue-400/20 to-indigo-400/10',
  },
  {
    id: '3',
    title: 'Downtown Romance',
    type: 'Romantic',
    date: 'Oct 12',
    time: '7:30 PM',
    stopCount: 3,
    totalCost: 110,
    status: 'done',
    rating: 5,
    emoji: '🌹',
    locations: ['Lumina Restaurant', 'Riverfront Walk', 'Sweeties Gelato'],
    color: 'from-pink-400/20 to-rose-400/10',
  },
  {
    id: '4',
    title: 'Jazz & Cocktails',
    type: 'Romantic',
    date: 'Sep 28',
    time: '8:00 PM',
    stopCount: 2,
    totalCost: 85,
    status: 'done',
    rating: 4,
    emoji: '🎷',
    locations: ['The Jazz Corner', 'Velvet Lounge'],
    color: 'from-amber-400/20 to-orange-400/10',
  },
  {
    id: '5',
    title: 'Birthday Bash',
    type: 'Occasion',
    date: 'Nov 3',
    time: '7:00 PM',
    stopCount: 4,
    totalCost: 200,
    status: 'draft',
    emoji: '🎂',
    locations: ['TBD · 4 stops planned'],
    color: 'from-purple-400/20 to-violet-400/10',
  },
];

const STATUS_STYLES: Record<PlanStatus, { label: string; pill: string }> = {
  upcoming: { label: 'Upcoming',  pill: 'bg-[#00C851]/10 text-[#00C851]' },
  done:     { label: 'Completed', pill: 'bg-gray-100 text-gray-500'       },
  draft:    { label: 'Draft',     pill: 'bg-amber-100 text-amber-600'     },
};

const TYPE_ICON: Record<SavedPlan['type'], string> = {
  Romantic:  '❤️',
  Group:     '👥',
  Solo:      '🎯',
  Occasion:  '🎉',
};

const FILTER_TABS = ['All', 'Upcoming', 'Completed', 'Drafts'] as const;
type FilterTab = typeof FILTER_TABS[number];

// ─── Component ────────────────────────────────────────────────────────────────

export function SavedPlans() {
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  const filtered = PLANS.filter(p => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Upcoming') return p.status === 'upcoming';
    if (activeFilter === 'Completed') return p.status === 'done';
    if (activeFilter === 'Drafts') return p.status === 'draft';
    return true;
  });

  const upcomingCount = PLANS.filter(p => p.status === 'upcoming').length;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F7F7F7]">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-28">

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div className="bg-white px-6 pt-14 pb-5 border-b border-gray-100 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-[24px] font-black text-gray-900 leading-tight">My Plans</h1>
              <p className="text-[13px] text-gray-400 font-medium mt-0.5">
                {upcomingCount > 0
                  ? `${upcomingCount} upcoming · ${PLANS.filter(p => p.status === 'done').length} completed`
                  : `${PLANS.filter(p => p.status === 'done').length} plans completed`}
              </p>
            </div>
            <button className="w-10 h-10 rounded-2xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 active:scale-95 transition-transform shadow-sm">
              <Filter size={18} />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
            {FILTER_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-full text-[12px] font-bold transition-all shrink-0",
                  activeFilter === tab
                    ? "bg-[#FF5A5F] text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── PLAN LIST ─────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 flex flex-col gap-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <span className="text-5xl mb-4">📋</span>
              <p className="font-bold text-gray-800 text-[17px] mb-1">Nothing here yet</p>
              <p className="text-gray-400 text-[13px]">Plans you save will appear here.</p>
            </div>
          )}

          {filtered.map(plan => {
            const s = STATUS_STYLES[plan.status];
            return (
              <button
                key={plan.id}
                onClick={() => setLocation(`/plan/${plan.id}`)}
                className="w-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden active:scale-[0.98] transition-transform text-left"
              >
                {/* Colour header band */}
                <div className={cn("h-2 w-full bg-gradient-to-r", plan.color)} />

                <div className="p-4">
                  {/* Top row: emoji + title + status */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl shrink-0">
                      {plan.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                          {TYPE_ICON[plan.type]} {plan.type}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 text-[16px] leading-tight truncate">{plan.title}</p>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0", s.pill)}>
                      {s.label}
                    </span>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-[12px] text-gray-500 font-medium mb-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-gray-400" />
                      {plan.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} className="text-gray-400" />
                      {plan.time}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-gray-400" />
                      {plan.stopCount} stops
                    </span>
                  </div>

                  {/* Location list */}
                  <div className="flex items-center gap-1.5 mb-3 overflow-hidden">
                    {plan.locations.slice(0, 2).map((loc, i) => (
                      <span key={i} className="text-[11px] bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full truncate max-w-[120px]">
                        {loc}
                      </span>
                    ))}
                    {plan.locations.length > 2 && (
                      <span className="text-[11px] bg-gray-100 text-gray-500 font-semibold px-2 py-1 rounded-full shrink-0">
                        +{plan.locations.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Bottom row: cost + rating/action */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-[13px] font-bold text-gray-900">
                      ~₦{(plan.totalCost * 1500).toLocaleString()} <span className="font-normal text-gray-400 text-[11px]">est. total</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {plan.status === 'done' && plan.rating && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={11}
                              className={i < plan.rating! ? "fill-[#FF9500] text-[#FF9500]" : "fill-gray-200 text-gray-200"}
                            />
                          ))}
                        </div>
                      )}
                      {plan.status === 'upcoming' && (
                        <span className="text-[11px] font-bold text-[#00C851] bg-[#00C851]/10 px-2.5 py-1 rounded-full">
                          View →
                        </span>
                      )}
                      {plan.status === 'draft' && (
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                          Resume
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── NEW PLAN PROMPT ───────────────────────────────────────────────── */}
        <div className="mx-4 mt-4">
          <button
            onClick={() => setLocation('/plan/generate')}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold text-[14px] active:scale-[0.98] transition-transform hover:border-[#FF5A5F]/50 hover:text-[#FF5A5F] group"
          >
            <Plus size={18} className="group-hover:text-[#FF5A5F] transition-colors" />
            Plan a new evening
          </button>
        </div>
      </div>

      <FAB type="home" />
      <BottomNav active="plans" />
    </div>
  );
}
