import { useState } from 'react';
import { useLocation } from "wouter";
import { ArrowLeft, Plus, X, Flame, Users, Heart, Sparkles, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { cn } from "@/components/SharedUI";

type FundType = 'experience' | 'group' | 'anniversary' | 'milestone';

interface Fund {
  id: string;
  name: string;
  emoji: string;
  type: FundType;
  saved: number;
  goal: number;
  autoSave: number;
  // warmth = last 4 weeks contributions (true = contributed, false = missed)
  warmth: boolean[];
  groupMembers?: { name: string; avatar: string; contributed: number }[];
}

const FUNDS: Fund[] = [
  {
    id: "f1",
    name: "Jazz Night at Lumina",
    emoji: "🎷",
    type: "experience",
    saved: 66,
    goal: 80,
    autoSave: 20,
    warmth: [true, true, true, true],
  },
  {
    id: "f2",
    name: "Anniversary Dinner",
    emoji: "💍",
    type: "anniversary",
    saved: 240,
    goal: 400,
    autoSave: 20,
    warmth: [true, true, false, true],
  },
  {
    id: "f3",
    name: "Weekend Ski Trip",
    emoji: "⛷️",
    type: "group",
    saved: 320,
    goal: 320,
    autoSave: 0,
    warmth: [true, true, true, true],
    groupMembers: [
      { name: "Alex", avatar: "🧑", contributed: 110 },
      { name: "Sarah", avatar: "👩", contributed: 110 },
      { name: "Mike", avatar: "👨", contributed: 100 },
    ],
  },
  {
    id: "f4",
    name: "Rooftop Cinema Night",
    emoji: "🎬",
    type: "experience",
    saved: 9,
    goal: 36,
    autoSave: 9,
    warmth: [false, false, false, true],
  },
];

const TYPE_META: Record<FundType, { label: string; icon: React.ReactNode; color: string }> = {
  experience: { label: "Experience",   icon: <Sparkles size={11} />, color: "text-primary bg-[#FFF0F1]" },
  group:       { label: "Group",       icon: <Users size={11} />,    color: "text-blue-600 bg-blue-50" },
  anniversary: { label: "Anniversary", icon: <Heart size={11} />,    color: "text-pink-600 bg-pink-50" },
  milestone:   { label: "Milestone",   icon: <Flame size={11} />,    color: "text-orange-600 bg-orange-50" },
};

// Card color theme based on fill %
function cardTheme(pct: number, type: FundType) {
  if (pct >= 100) return {
    bg: "bg-[#0D2B1A]",
    bar: "bg-[#00C851]",
    barTrack: "bg-black/40",
    glow: "shadow-[0_0_20px_rgba(0,200,81,0.25)]",
    text: "text-white",
    sub: "text-white/70",
    border: "border-transparent",
  };
  if (pct >= 70) return {
    bg: "bg-gradient-to-br from-[#1a1a2e] to-[#2d1b1e]",
    bar: "bg-gradient-to-r from-[#FF9500] to-primary",
    barTrack: "bg-white/10",
    glow: "shadow-[0_0_24px_rgba(255,90,95,0.2)]",
    text: "text-white",
    sub: "text-white/70",
    border: "border-transparent",
  };
  if (pct >= 30) return {
    bg: "bg-gradient-to-br from-gray-900 to-gray-800",
    bar: "bg-gradient-to-r from-amber-400 to-[#FF9500]",
    barTrack: "bg-white/10",
    glow: "",
    text: "text-white",
    sub: "text-white/60",
    border: "border-transparent",
  };
  // cold start
  return {
    bg: "bg-gradient-to-br from-gray-200 to-gray-100",
    bar: "bg-gray-400",
    barTrack: "bg-gray-300",
    glow: "",
    text: "text-foreground",
    sub: "text-muted-foreground",
    border: "border-border",
  };
}

function WarmthDots({ warmth }: { warmth: boolean[] }) {
  return (
    <div className="flex gap-1.5 items-center">
      {warmth.map((hot, i) => (
        <div
          key={i}
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            hot ? "bg-[#FF9500] shadow-[0_0_4px_rgba(255,149,0,0.6)]" : "bg-white/20"
          )}
        />
      ))}
      <span className="text-[10px] font-semibold ml-1 opacity-60">
        {warmth.filter(Boolean).length}/{warmth.length}w streak
      </span>
    </div>
  );
}

function MilestoneBar({ pct, barColor, barTrack }: { pct: number; barColor: string; barTrack: string }) {
  const milestones = [25, 50, 75];
  return (
    <div className="relative h-3">
      <div className={cn("w-full h-full rounded-full overflow-hidden", barTrack)}>
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {/* Milestone ticks */}
      {milestones.map(m => (
        <div
          key={m}
          className={cn(
            "absolute top-0 bottom-0 w-px",
            pct >= m ? "bg-white/30" : "bg-black/20"
          )}
          style={{ left: `${m}%` }}
        />
      ))}
    </div>
  );
}

const NEW_FUND_TYPES: { type: FundType; emoji: string; label: string; desc: string }[] = [
  { type: "experience", emoji: "🎭", label: "Experience",   desc: "A night out, venue, or event" },
  { type: "group",      emoji: "👥", label: "Group Stash",  desc: "Split the cost with friends" },
  { type: "anniversary",emoji: "💍", label: "Anniversary",  desc: "Special occasion fund" },
  { type: "milestone",  emoji: "🏆", label: "Milestone",    desc: "A big goal worth celebrating" },
];

export function BudgetDashboard() {
  const [, setLocation] = useLocation();
  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState<FundType | null>(null);
  const [expandedFund, setExpandedFund] = useState<string | null>(null);

  const totalSaved = FUNDS.reduce((s, f) => s + f.saved, 0);
  const totalGoal  = FUNDS.reduce((s, f) => s + f.goal, 0);
  const unlockedCount = FUNDS.filter(f => f.saved >= f.goal).length;

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-background">
      {/* Header */}
      <div className="bg-card px-6 pt-14 pb-4 flex justify-between items-center sticky top-0 z-20 shadow-sm border-b border-border">
        <button onClick={() => setLocation('/profile')} className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-gray-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-foreground text-lg leading-tight">Your Stash</h1>
          <p className="text-[11px] text-muted-foreground font-medium">Saving for the good stuff</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-10">
        {/* Total hero strip */}
        <div className="mx-6 mt-5 mb-6 bg-foreground text-card rounded-3xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/5 rounded-full" />
          <div className="absolute -bottom-10 -left-6 w-28 h-28 bg-white/5 rounded-full" />
          <p className="text-white/60 text-sm font-medium mb-1 relative z-10">Total stashed</p>
          <h2 className="text-4xl font-black text-white relative z-10">
            ${totalSaved}<span className="text-white/40 text-2xl font-semibold">.00</span>
          </h2>
          <div className="flex items-center gap-4 mt-4 relative z-10">
            <div>
              <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Across</p>
              <p className="text-white font-bold text-[15px]">{FUNDS.length} funds</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Unlocked</p>
              <p className="text-[#00C851] font-bold text-[15px]">{unlockedCount} ready to book</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Goal</p>
              <p className="text-white font-bold text-[15px]">${totalGoal}</p>
            </div>
          </div>
        </div>

        {/* Fund Cards */}
        <div className="px-6 flex flex-col gap-4 mb-8">
          {FUNDS.map(fund => {
            const pct = Math.round((fund.saved / fund.goal) * 100);
            const unlocked = pct >= 100;
            const theme = cardTheme(pct, fund.type);
            const typeMeta = TYPE_META[fund.type];
            const isExpanded = expandedFund === fund.id;

            return (
              <div
                key={fund.id}
                className={cn(
                  "rounded-3xl overflow-hidden border transition-all duration-300 cursor-pointer",
                  theme.bg, theme.border, theme.glow
                )}
                onClick={() => setExpandedFund(isExpanded ? null : fund.id)}
              >
                <div className="p-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-500",
                        unlocked ? "bg-[#00C851]/20 shadow-[0_0_16px_rgba(0,200,81,0.4)]" :
                        pct >= 70 ? "bg-white/10 shadow-[0_0_12px_rgba(255,90,95,0.3)]" :
                        "bg-white/10"
                      )}>
                        {fund.emoji}
                      </div>
                      <div>
                        <p className={cn("font-bold text-[16px] leading-tight", theme.text)}>{fund.name}</p>
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1", typeMeta.color)}>
                          {typeMeta.icon} {typeMeta.label}
                        </span>
                      </div>
                    </div>

                    {unlocked ? (
                      <span className="bg-[#00C851] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                        ✓ Ready
                      </span>
                    ) : (
                      <div className="text-right">
                        <p className={cn("text-2xl font-black", theme.text)}>{pct}%</p>
                        <p className={cn("text-[11px] font-medium", theme.sub)}>complete</p>
                      </div>
                    )}
                  </div>

                  {/* Amount row */}
                  <div className="flex justify-between items-end mb-3">
                    <span className={cn("text-[22px] font-extrabold", theme.text)}>
                      ${fund.saved}
                    </span>
                    <span className={cn("text-sm font-medium", theme.sub)}>
                      of ${fund.goal}
                    </span>
                  </div>

                  {/* Progress bar with milestones */}
                  <MilestoneBar pct={pct} barColor={theme.bar} barTrack={theme.barTrack} />

                  {/* Milestone labels */}
                  <div className="flex justify-between mt-1.5 mb-3 px-0.5">
                    {[25, 50, 75].map(m => (
                      <span key={m} className={cn(
                        "text-[9px] font-bold",
                        pct >= m ? (unlocked ? "text-[#00C851]" : "text-white/50") : "text-black/30"
                      )}>
                        {m}%
                      </span>
                    ))}
                  </div>

                  {/* Warmth dots */}
                  <div className={cn("flex items-center justify-between", theme.sub)}>
                    <WarmthDots warmth={fund.warmth} />
                    {fund.autoSave > 0 && (
                      <span className={cn("text-[11px] font-semibold", theme.sub)}>
                        ${fund.autoSave}/wk auto
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className={cn("border-t px-5 pb-5 pt-4 animate-in fade-in slide-in-from-top-2 duration-200",
                    unlocked ? "border-white/10" : pct >= 30 ? "border-white/10" : "border-border"
                  )}>
                    {/* Group member contributions */}
                    {fund.groupMembers && (
                      <div className="mb-4">
                        <p className={cn("text-[12px] font-bold uppercase tracking-wider mb-2.5", theme.sub)}>Contributions</p>
                        <div className="flex flex-col gap-2">
                          {fund.groupMembers.map(m => (
                            <div key={m.name} className="flex items-center gap-2">
                              <span className="text-xl">{m.avatar}</span>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className={cn("text-[13px] font-semibold", theme.text)}>{m.name}</span>
                                  <span className={cn("text-[13px] font-bold", theme.text)}>${m.contributed}</span>
                                </div>
                                <div className={cn("h-1.5 rounded-full overflow-hidden", theme.barTrack)}>
                                  <div
                                    className={cn("h-full rounded-full", theme.bar)}
                                    style={{ width: `${(m.contributed / fund.goal) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CTA */}
                    {unlocked ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setLocation('/plan/generate'); }}
                        className="w-full bg-[#00C851] text-white py-3.5 rounded-xl font-bold text-[15px] shadow-[0_6px_20px_-4px_rgba(0,200,81,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        🎉 Book your experience now
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-[#00C851]/90 text-white py-3 rounded-xl font-bold text-[14px] active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                        >
                          <Plus size={15} /> Stash
                        </button>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "flex-1 py-3 rounded-xl font-bold text-[14px] active:scale-95 transition-transform flex items-center justify-center gap-1.5",
                            pct >= 30
                              ? "bg-white/10 text-white border border-white/20"
                              : "bg-background text-foreground border border-border"
                          )}
                        >
                          Edit fund
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add New Stash prompt */}
        <div className="px-6 mb-8">
          <button
            onClick={() => setShowNew(true)}
            className="w-full border-2 border-dashed border-border rounded-3xl py-5 flex items-center justify-center gap-3 text-muted-foreground hover:border-primary hover:text-primary transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-background border border-border group-hover:bg-primary/10 group-hover:border-primary/30 flex items-center justify-center transition-colors">
              <Plus size={20} />
            </div>
            <span className="font-bold text-[15px]">Start a new stash</span>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="px-6">
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-[17px] font-bold text-foreground">Recent Activity</h2>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: "Jazz Night stash",      sub: "Auto-save · Today",        amount: "+$20",  icon: "🎷", positive: true  },
              { label: "Downtown Romance",       sub: "Spent · Oct 12",           amount: "-$115", icon: null, positive: false },
              { label: "Anniversary fund",       sub: "Auto-save · Oct 11",       amount: "+$20",  icon: "💍", positive: true  },
              { label: "Weekend Ski Trip",       sub: "Sarah added · Oct 10",     amount: "+$100", icon: "⛷️", positive: true  },
              { label: "Friday Fun",             sub: "Spent · Sep 28",           amount: "-$70",  icon: null, positive: false },
            ].map((tx, i) => (
              <div key={i} className="bg-card p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center",
                    tx.positive ? "bg-[#E8FFF0] text-[#00C851]" : "bg-[#FFF0F1] text-primary"
                  )}>
                    {tx.icon
                      ? <span className="text-xl">{tx.icon}</span>
                      : tx.positive
                        ? <ArrowDownLeft size={18} strokeWidth={2.5} />
                        : <ArrowUpRight size={18} strokeWidth={2.5} />
                    }
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-[14px] leading-tight">{tx.label}</h4>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">{tx.sub}</p>
                  </div>
                </div>
                <span className={cn("font-bold text-[15px]", tx.positive ? "text-[#00C851]" : "text-foreground")}>
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Stash Sheet */}
      {showNew && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowNew(false); setNewType(null); }} />
          <div className="relative bg-card rounded-t-3xl px-6 pt-5 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[18px] font-bold text-foreground">Start a new stash</h3>
              <button onClick={() => { setShowNew(false); setNewType(null); }} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">What are you saving for?</p>

            {!newType ? (
              <div className="grid grid-cols-2 gap-3">
                {NEW_FUND_TYPES.map(ft => (
                  <button
                    key={ft.type}
                    onClick={() => setNewType(ft.type)}
                    className="flex flex-col items-start gap-2 p-4 rounded-2xl border-2 border-border bg-background hover:border-primary hover:bg-primary/5 transition-all active:scale-95 text-left"
                  >
                    <span className="text-3xl">{ft.emoji}</span>
                    <div>
                      <p className="font-bold text-foreground text-[14px]">{ft.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{ft.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Fund name</label>
                  <input
                    type="text"
                    placeholder={`e.g. ${newType === 'experience' ? 'Jazz Night at Lumina' : newType === 'group' ? 'Group Ski Trip' : newType === 'anniversary' ? 'Anniversary Getaway' : 'Big Celebration'}`}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Goal</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold">$</span>
                      <input type="number" placeholder="150" className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Auto-save /wk</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold">$</span>
                      <input type="number" placeholder="20" className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setShowNew(false); setNewType(null); }}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold text-[16px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all mt-2"
                >
                  Create Stash ✨
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
