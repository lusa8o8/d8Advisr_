import { useState, useEffect, useCallback } from 'react';
import { useLocation } from "wouter";
import { TopBar, BottomNav, cn } from "@/components/SharedUI";

const MESSAGES = [
  "Reading your vibe...",
  "Scouting the best spots...",
  "Crafting your evening...",
  "Almost ready...",
];

// Continuous path tracing the 8 shape — starts & ends at the center crossing (28,45)
// Top loop → back to center → bottom loop → back to center
const PATH_8 = "M 28,45 C 10,45 10,4 28,4 C 46,4 46,45 28,45 C 10,45 10,86 28,86 C 46,86 46,45 28,45";

function PlanningAnimation({ onDone }: { onDone: () => void }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [msgKey, setMsgKey] = useState(0);

  useEffect(() => {
    const cycle = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length);
      setMsgKey(k => k + 1);
    }, 1100);

    const done = setTimeout(onDone, 4400);

    return () => {
      clearInterval(cycle);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: '#141414' }}
    >
      <style>{`
        /* Comet travels the 8 path — pathLength="100" normalises all values */
        @keyframes d8-trace {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -100; }
        }

        /* Message fades up on each new text */
        @keyframes d8-msg {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Outer ring rotates slowly — subtle halo around the whole logo */
        @keyframes d8-ring {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* Soft ambient pulse behind the logo */
        @keyframes d8-glow {
          0%, 100% { opacity: 0.08; transform: scale(1); }
          50%       { opacity: 0.18; transform: scale(1.12); }
        }
      `}</style>

      {/* Ambient glow blob behind the logo */}
      <div
        className="absolute rounded-full"
        style={{
          width: 220,
          height: 220,
          background: 'radial-gradient(circle, rgba(255,90,95,0.5) 0%, transparent 70%)',
          animation: 'd8-glow 2.4s ease-in-out infinite',
        }}
      />

      {/* Rotating dashed outer ring */}
      <div
        className="absolute"
        style={{ animation: 'd8-ring 8s linear infinite' }}
      >
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle
            cx="80" cy="80" r="72"
            fill="none"
            stroke="rgba(255,90,95,0.12)"
            strokeWidth="1"
            strokeDasharray="4 8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ── D8 Logo Mark ── */}
      <div className="relative flex items-end gap-0.5" style={{ marginBottom: 40 }}>

        {/* "D" — static anchor */}
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 84,
            fontWeight: 900,
            color: 'white',
            lineHeight: 1,
            letterSpacing: '-3px',
            textShadow: '0 0 40px rgba(255,255,255,0.08)',
          }}
        >
          D
        </span>

        {/* Animated "8" */}
        <svg
          viewBox="0 0 56 90"
          width="55"
          height="83"
          style={{ overflow: 'visible', marginBottom: 1 }}
        >
          {/* Ghost outline — faint full 8 shape */}
          <path
            d={PATH_8}
            fill="none"
            stroke="rgba(255,90,95,0.10)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Wide halo glow layer — slightly longer comet, blurred feel */}
          <path
            d={PATH_8}
            pathLength="100"
            fill="none"
            stroke="#FF5A5F"
            strokeWidth="13"
            strokeOpacity="0.18"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="25 75"
            style={{ animation: 'd8-trace 1.8s linear infinite' }}
          />

          {/* Mid glow layer */}
          <path
            d={PATH_8}
            pathLength="100"
            fill="none"
            stroke="#FF5A5F"
            strokeWidth="8"
            strokeOpacity="0.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="22 78"
            style={{ animation: 'd8-trace 1.8s linear infinite' }}
          />

          {/* Core comet stroke — sharp, bright, glowing */}
          <path
            d={PATH_8}
            pathLength="100"
            fill="none"
            stroke="#FF5A5F"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="18 82"
            style={{
              animation: 'd8-trace 1.8s linear infinite',
              filter:
                'drop-shadow(0 0 5px rgba(255,90,95,1)) drop-shadow(0 0 10px rgba(255,90,95,0.7))',
            }}
          />
        </svg>
      </div>

      {/* Thin separator */}
      <div
        style={{
          width: 48,
          height: 1,
          background: 'rgba(255,255,255,0.07)',
          marginBottom: 22,
        }}
      />

      {/* ── Cycling message ── */}
      <div style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p
          key={msgKey}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.025em',
            animation: 'd8-msg 0.4s ease-out forwards',
            margin: 0,
          }}
        >
          {MESSAGES[msgIdx]}
        </p>
      </div>

      {/* ── Pill progress dots ── */}
      <div style={{ display: 'flex', gap: 5, marginTop: 18 }}>
        {MESSAGES.map((_, i) => (
          <div
            key={i}
            style={{
              height: 5,
              borderRadius: 3,
              background: i === msgIdx ? '#FF5A5F' : 'rgba(255,255,255,0.12)',
              width: i === msgIdx ? 22 : 5,
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: i === msgIdx ? '0 0 8px rgba(255,90,95,0.6)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function PlanGenerator() {
  const [, setLocation] = useLocation();
  const [type, setType] = useState<'solo' | 'group'>('solo');
  const [occasion, setOccasion] = useState('Date Night');
  const [mood, setMood] = useState('Romantic');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(() => {
    setGenerating(true);
  }, []);

  const handleDone = useCallback(() => {
    setLocation('/plan/overview');
  }, [setLocation]);

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-background">
      <TopBar />
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-28">
        <div className="px-6 py-4">
          <h1 className="text-[32px] font-bold text-foreground leading-tight mb-6">Build Your Plan ✨</h1>

          {/* Solo / Group toggle */}
          <div className="flex bg-card p-1 rounded-full shadow-sm border border-border mb-8">
            <button
              onClick={() => setType('solo')}
              className={cn(
                "flex-1 py-3 rounded-full text-sm font-bold transition-all",
                type === 'solo'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Solo Date
            </button>
            <button
              onClick={() => setType('group')}
              className={cn(
                "flex-1 py-3 rounded-full text-sm font-bold transition-all",
                type === 'group'
                  ? "bg-foreground text-card shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Group Plan
            </button>
          </div>

          <div className="flex flex-col gap-8">
            {/* Occasion */}
            <div>
              <h3 className="font-bold text-foreground mb-3 text-[15px]">Occasion</h3>
              <div className="flex flex-wrap gap-2.5">
                {['Date Night', 'First Date', 'Anniversary', 'Casual', 'Celebration'].map(item => (
                  <button
                    key={item}
                    onClick={() => setOccasion(item)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95",
                      occasion === item
                        ? "bg-foreground text-card shadow-md"
                        : "bg-card border border-border text-foreground hover:border-gray-300"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Vibe / Mood */}
            <div>
              <h3 className="font-bold text-foreground mb-3 text-[15px]">Vibe / Mood</h3>
              <div className="flex flex-wrap gap-2.5">
                {['Romantic', 'Fun', 'Adventure', 'Relaxing', 'Cultural'].map(item => (
                  <button
                    key={item}
                    onClick={() => setMood(item)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95",
                      mood === item
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                        : "bg-card border border-border text-foreground hover:border-gray-300"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-foreground text-[15px]">Details</h3>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">When</label>
                  <input
                    type="date"
                    defaultValue="2025-10-14"
                    className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Time</label>
                  <input
                    type="time"
                    defaultValue="19:00"
                    className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Max Budget (Total)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-bold">$</span>
                  <input
                    type="number"
                    defaultValue={150}
                    className="w-full bg-card border border-border rounded-xl pl-8 pr-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Neighborhood / City</label>
                <input
                  type="text"
                  placeholder="e.g. Downtown"
                  defaultValue="Downtown"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            className="w-full bg-primary text-primary-foreground py-[18px] rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.6)] active:scale-[0.98] transition-all mt-10 hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            Generate Plan ✨
          </button>
        </div>
      </div>

      <BottomNav active="plans" />

      {/* ── AI Planning Animation Overlay ── */}
      {generating && <PlanningAnimation onDone={handleDone} />}
    </div>
  );
}
