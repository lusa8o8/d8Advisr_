import { useLocation } from "wouter";
import { ArrowLeft, Lock, Trophy } from "lucide-react";

const EARNED = [
  {
    emoji: "🔥",
    name: "Streak x3",
    desc: "3 dates planned in a row",
    earned: "Oct 8",
    rarity: "Rare",
    color: "bg-orange-50 border-orange-200",
    rarityColor: "text-[#FF9500]",
  },
  {
    emoji: "🍕",
    name: "Foodie",
    desc: "Visited 5 different restaurants",
    earned: "Sep 22",
    rarity: "Common",
    color: "bg-pink-50 border-pink-200",
    rarityColor: "text-muted-foreground",
  },
  {
    emoji: "💰",
    name: "Saver",
    desc: "Stayed under budget 3 times",
    earned: "Sep 5",
    rarity: "Common",
    color: "bg-green-50 border-green-200",
    rarityColor: "text-muted-foreground",
  },
];

const IN_PROGRESS = [
  {
    emoji: "🌟",
    name: "Explorer",
    desc: "Visit 3 new neighborhoods",
    current: 2,
    total: 3,
    color: "bg-yellow-50 border-yellow-200",
    barColor: "bg-[#FF9500]",
  },
  {
    emoji: "💑",
    name: "Romanticist",
    desc: "Complete 5 date nights",
    current: 3,
    total: 5,
    color: "bg-red-50 border-red-200",
    barColor: "bg-primary",
  },
  {
    emoji: "🎭",
    name: "Culture Vulture",
    desc: "Attend 3 cultural events",
    current: 1,
    total: 3,
    color: "bg-purple-50 border-purple-200",
    barColor: "bg-purple-400",
  },
  {
    emoji: "⚡",
    name: "Spontaneous",
    desc: "Use Surprise Me 5 times",
    current: 2,
    total: 5,
    color: "bg-blue-50 border-blue-200",
    barColor: "bg-blue-400",
  },
  {
    emoji: "👥",
    name: "Social Butterfly",
    desc: "Create 3 group plans",
    current: 1,
    total: 3,
    color: "bg-teal-50 border-teal-200",
    barColor: "bg-teal-400",
  },
];

const LOCKED = [
  { emoji: "🏆", name: "Legend", desc: "Complete 20 dates" },
  { emoji: "🌍", name: "Globetrotter", desc: "Plan in 5 different cities" },
  { emoji: "💎", name: "VIP", desc: "Stay under budget 10 times" },
  { emoji: "❤️", name: "Soulmate", desc: "Share 10 plans with a partner" },
  { emoji: "🎯", name: "Perfectionist", desc: "Get 5-star feedback 5 times" },
  { emoji: "🌙", name: "Night Owl", desc: "Plan 5 late-night dates" },
  { emoji: "🎪", name: "Adventurer", desc: "Complete 5 adventure dates" },
  { emoji: "👑", name: "D8 Royalty", desc: "Reach 50 total plans" },
];

export function BadgesPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-background">
      {/* Header */}
      <div className="px-6 pt-14 pb-4 bg-white border-b border-border flex items-center gap-4 sticky top-0 z-20">
        <button
          onClick={() => setLocation("/profile")}
          className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-foreground hover:bg-card transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">Badges</h1>
          <p className="text-xs text-muted-foreground font-medium">Your achievement collection</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
          <Trophy size={14} className="text-primary" />
          <span className="text-xs font-bold text-primary">{EARNED.length} earned</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-10">
        {/* Stats Strip */}
        <div className="mx-6 mt-5 mb-6 bg-card rounded-2xl border border-border shadow-sm grid grid-cols-3 divide-x divide-border">
          <div className="py-4 flex flex-col items-center">
            <span className="text-2xl font-black text-[#00C851]">{EARNED.length}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1 text-center">Earned</span>
          </div>
          <div className="py-4 flex flex-col items-center">
            <span className="text-2xl font-black text-[#FF9500]">{IN_PROGRESS.length}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1 text-center">In Progress</span>
          </div>
          <div className="py-4 flex flex-col items-center">
            <span className="text-2xl font-black text-foreground">{LOCKED.length}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1 text-center">Locked</span>
          </div>
        </div>

        {/* Earned */}
        <div className="px-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">✅</span>
            <h2 className="text-[17px] font-bold text-foreground">Earned</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {EARNED.map((b) => (
              <div key={b.name} className={`rounded-2xl border p-4 flex flex-col items-center text-center gap-2 shadow-sm ${b.color}`}>
                <span className="text-4xl">{b.emoji}</span>
                <div>
                  <p className="font-bold text-foreground text-[14px] leading-tight">{b.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{b.desc}</p>
                </div>
                <div className="flex items-center justify-between w-full mt-auto pt-2 border-t border-black/5">
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${b.rarityColor}`}>{b.rarity}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{b.earned}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* In Progress */}
        <div className="px-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">⏳</span>
            <h2 className="text-[17px] font-bold text-foreground">In Progress</h2>
          </div>
          <div className="flex flex-col gap-3">
            {IN_PROGRESS.map((b) => {
              const pct = Math.round((b.current / b.total) * 100);
              return (
                <div key={b.name} className={`rounded-2xl border p-4 shadow-sm ${b.color}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{b.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-[15px] leading-tight">{b.name}</p>
                      <p className="text-[12px] text-muted-foreground leading-snug">{b.desc}</p>
                    </div>
                    <span className="text-sm font-black text-foreground shrink-0">{b.current}/{b.total}</span>
                  </div>
                  <div className="h-2 bg-black/8 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${b.barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-right text-[10px] font-bold text-muted-foreground mt-1.5">{pct}% complete</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Locked */}
        <div className="px-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🔒</span>
            <h2 className="text-[17px] font-bold text-foreground">Locked</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {LOCKED.map((b) => (
              <div key={b.name} className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 flex flex-col items-center text-center gap-2 relative overflow-hidden opacity-60">
                <span className="text-4xl grayscale">{b.emoji}</span>
                <div>
                  <p className="font-bold text-gray-400 text-[14px] leading-tight">{b.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{b.desc}</p>
                </div>
                <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                  <Lock size={10} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
