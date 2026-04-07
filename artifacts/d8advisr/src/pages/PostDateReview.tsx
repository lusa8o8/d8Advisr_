import { useState, useCallback } from 'react';
import { useLocation } from "wouter";
import { ArrowLeft, ChevronRight, SkipForward } from 'lucide-react';
import { cn } from "@/components/SharedUI";

// ─── Data ────────────────────────────────────────────────────────────────────

type Tier = 'Verified' | 'D8 Approved' | 'Hidden Gem';

const PLAN_STOPS = [
  { id: 's1', venueName: 'The Velvet Lounge',       category: 'Cocktail Bar',    tier: 'Verified'    as Tier, emoji: '🍸', label: 'Pre-dinner drinks', time: '7:00 PM' },
  { id: 's2', venueName: 'Lumina Restaurant & Bar', category: 'Romantic Dining', tier: 'D8 Approved' as Tier, emoji: '🍽️', label: 'Dinner',            time: '8:15 PM' },
  { id: 's3', venueName: 'Skyline Rooftop',         category: 'Rooftop Bar',     tier: 'Hidden Gem'  as Tier, emoji: '🌙', label: 'Nightcap',          time: '10:30 PM' },
];

const VIBE_TAGS = ['Romantic 💑', 'Buzzy ⚡', 'Quiet & Cosy 🕯️', 'Worth it 💯', 'Great service 🌟', 'Overpriced 💸', 'Hidden gem 💎', 'Not for us 👎'];

const MOOD_OPTIONS = [
  { emoji: '😍', label: 'Loved it',  score: 5 },
  { emoji: '😊', label: 'Good',      score: 4 },
  { emoji: '😐', label: 'It was ok', score: 3 },
  { emoji: '😕', label: 'Meh',       score: 2 },
  { emoji: '😞', label: 'Didn\'t enjoy', score: 1 },
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function DotRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={cn(
            "w-8 h-8 rounded-full border-2 transition-all active:scale-90",
            n <= value
              ? "bg-[#FF5A5F] border-[#FF5A5F] scale-105"
              : "bg-gray-100 border-gray-200 hover:border-gray-300"
          )}
        />
      ))}
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function Step1Mood({ onSelect }: { onSelect: (score: number, emoji: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="flex flex-col flex-1 px-6 pt-4 pb-8">
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">Step 1 of 3</p>
        <h2 className="text-[26px] font-black text-gray-900 text-center leading-tight mb-2">
          How was your<br />evening?
        </h2>
        <p className="text-[14px] text-gray-500 text-center mb-10">Tap once — that's all you need.</p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          {MOOD_OPTIONS.map(opt => (
            <button
              key={opt.score}
              onClick={() => setSelected(opt.score)}
              className={cn(
                "flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.97]",
                selected === opt.score
                  ? "border-[#FF5A5F] bg-[#FF5A5F]/5 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <span className="text-3xl leading-none">{opt.emoji}</span>
              <span className={cn(
                "font-bold text-[15px] transition-colors",
                selected === opt.score ? "text-[#FF5A5F]" : "text-gray-800"
              )}>{opt.label}</span>
              {selected === opt.score && (
                <div className="ml-auto w-5 h-5 rounded-full bg-[#FF5A5F] flex items-center justify-center shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={selected === null}
        onClick={() => {
          const opt = MOOD_OPTIONS.find(o => o.score === selected)!;
          onSelect(opt.score, opt.emoji);
        }}
        className={cn(
          "w-full py-4 rounded-2xl font-bold text-[16px] transition-all",
          selected !== null
            ? "bg-[#FF5A5F] text-white shadow-[0_8px_20px_-6px_rgba(255,90,95,0.45)] active:scale-[0.98]"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        )}
      >
        Continue →
      </button>
    </div>
  );
}

interface VenueRatings { vibe: number; value: number; }

function Step2Venues({
  ratings,
  onUpdate,
  onNext,
  onSkip,
}: {
  ratings: Record<string, VenueRatings>;
  onUpdate: (id: string, dim: 'vibe' | 'value', val: number) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const stop = PLAN_STOPS[activeIdx];
  const r = ratings[stop.id] ?? { vibe: 0, value: 0 };
  const isLast = activeIdx === PLAN_STOPS.length - 1;

  const advance = () => {
    if (!isLast) setActiveIdx(i => i + 1);
    else onNext();
  };

  const canAdvance = r.vibe > 0 && r.value > 0;

  return (
    <div className="flex flex-col flex-1 px-6 pt-4 pb-8">
      <div className="flex-1 flex flex-col">
        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Step 2 of 3</p>
        <h2 className="text-[22px] font-black text-gray-900 text-center leading-tight mb-1">Rate each stop</h2>
        <p className="text-[13px] text-gray-400 text-center mb-6">Two quick ratings per venue.</p>

        {/* Stop selector pills */}
        <div className="flex gap-2 justify-center mb-6">
          {PLAN_STOPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveIdx(i)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border",
                activeIdx === i
                  ? "bg-[#FF5A5F] text-white border-[#FF5A5F] shadow-sm"
                  : (ratings[s.id]?.vibe ?? 0) > 0 && (ratings[s.id]?.value ?? 0) > 0
                  ? "bg-[#00C851]/10 text-[#00C851] border-[#00C851]/30"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              )}
            >
              {s.emoji} {i + 1}
            </button>
          ))}
        </div>

        {/* Venue card */}
        <div
          key={stop.id}
          className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 mb-6 transition-all"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{stop.emoji}</span>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{stop.label} · {stop.time}</p>
                <p className="font-bold text-gray-900 text-[15px] leading-tight">{stop.venueName}</p>
                <p className="text-[12px] text-gray-500">{stop.category}</p>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold shrink-0 mt-0.5",
              TIER_BADGE[stop.tier]
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", TIER_DOT[stop.tier])} />
              {stop.tier}
            </div>
          </div>

          <div className="h-px bg-gray-100 mb-4" />

          {/* Ratings */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800 text-[14px]">Vibe</p>
                <p className="text-[11px] text-gray-400">Atmosphere & energy</p>
              </div>
              <DotRating value={r.vibe} onChange={v => onUpdate(stop.id, 'vibe', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800 text-[14px]">Value</p>
                <p className="text-[11px] text-gray-400">Worth what you paid</p>
              </div>
              <DotRating value={r.value} onChange={v => onUpdate(stop.id, 'value', v)} />
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center mb-auto">
          {PLAN_STOPS.map((_, i) => (
            <div key={i} className={cn(
              "h-1.5 rounded-full transition-all",
              i === activeIdx ? "w-6 bg-[#FF5A5F]" : (ratings[PLAN_STOPS[i].id]?.vibe ?? 0) > 0 ? "w-3 bg-[#00C851]" : "w-3 bg-gray-200"
            )} />
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onSkip}
          className="px-5 py-4 rounded-2xl border-2 border-gray-200 flex items-center gap-1.5 text-gray-400 font-semibold text-[13px] active:scale-95 transition-transform hover:border-gray-300"
        >
          <SkipForward size={15} /> Skip
        </button>
        <button
          onClick={advance}
          disabled={!canAdvance}
          className={cn(
            "flex-1 py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
            canAdvance
              ? "bg-[#FF5A5F] text-white shadow-[0_8px_20px_-6px_rgba(255,90,95,0.4)]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {isLast ? 'Last step' : `Next stop`} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function Step3Notes({
  note,
  tags,
  onNoteChange,
  onTagToggle,
  onSubmit,
  onSkip,
}: {
  note: string;
  tags: string[];
  onNoteChange: (v: string) => void;
  onTagToggle: (t: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 px-6 pt-4 pb-8">
      <div className="flex-1">
        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Step 3 of 3</p>
        <h2 className="text-[22px] font-black text-gray-900 text-center leading-tight mb-1">Anything to add?</h2>
        <p className="text-[13px] text-gray-400 text-center mb-6">Totally optional — helps future planners.</p>

        {/* Text field */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          <textarea
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="The lighting was everything… the cocktails were strong… would come back in a heartbeat…"
            maxLength={280}
            rows={4}
            className="w-full px-4 pt-4 pb-2 text-[14px] text-gray-800 placeholder-gray-400 resize-none outline-none font-medium leading-relaxed"
          />
          <div className="px-4 pb-3 text-right">
            <span className="text-[11px] text-gray-300 font-medium">{note.length}/280</span>
          </div>
        </div>

        {/* Vibe tags */}
        <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-3">Pick up to 3 vibes</p>
        <div className="flex flex-wrap gap-2">
          {VIBE_TAGS.map(tag => {
            const active = tags.includes(tag);
            const maxed = !active && tags.length >= 3;
            return (
              <button
                key={tag}
                onClick={() => !maxed && onTagToggle(tag)}
                className={cn(
                  "px-3.5 py-2 rounded-full text-[12px] font-semibold border transition-all active:scale-95",
                  active
                    ? "bg-[#FF5A5F] text-white border-[#FF5A5F] shadow-sm"
                    : maxed
                    ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onSkip}
          className="px-5 py-4 rounded-2xl border-2 border-gray-200 flex items-center gap-1.5 text-gray-400 font-semibold text-[13px] active:scale-95 transition-transform hover:border-gray-300"
        >
          <SkipForward size={15} /> Skip
        </button>
        <button
          onClick={onSubmit}
          className="flex-1 py-4 rounded-2xl bg-[#FF5A5F] text-white font-bold text-[15px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.4)] active:scale-[0.98] transition-all"
        >
          Submit Review ✓
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PostDateReview() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [moodScore, setMoodScore] = useState(0);
  const [moodEmoji, setMoodEmoji] = useState('');
  const [venueRatings, setVenueRatings] = useState<Record<string, VenueRatings>>({});
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleMoodSelect = (score: number, emoji: string) => {
    setMoodScore(score);
    setMoodEmoji(emoji);
    setStep(2);
  };

  const handleVenueUpdate = useCallback((id: string, dim: 'vibe' | 'value', val: number) => {
    setVenueRatings(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { vibe: 0, value: 0 }), [dim]: val }
    }));
  }, []);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    setLocation('/review/complete');
  };

  const getStepLabel = () => {
    if (step === 1) return 'How was it?';
    if (step === 2) return 'Rate your stops';
    return 'Final thoughts';
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F7F7F7]">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 pt-14 pb-4 bg-white border-b border-gray-100 relative">
        <button
          onClick={() => step > 1 ? setStep(s => (s - 1) as 1 | 2 | 3) : setLocation('/plan/1')}
          className="absolute left-5 top-14 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-[#FF5A5F] uppercase tracking-widest mb-0.5">Post-Date Review</p>
          <p className="font-bold text-gray-900 text-[16px]">{getStepLabel()}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Romantic Night in Lagos</p>
        </div>

        {/* Step progress bar */}
        <div className="flex gap-1.5 mt-4">
          {([1, 2, 3] as const).map(s => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                s <= step ? "bg-[#FF5A5F]" : "bg-gray-200"
              )}
            />
          ))}
        </div>
      </div>

      {/* ── STEPS ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col">
        {step === 1 && <Step1Mood onSelect={handleMoodSelect} />}
        {step === 2 && (
          <Step2Venues
            ratings={venueRatings}
            onUpdate={handleVenueUpdate}
            onNext={() => setStep(3)}
            onSkip={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3Notes
            note={note}
            tags={selectedTags}
            onNoteChange={setNote}
            onTagToggle={handleTagToggle}
            onSubmit={handleSubmit}
            onSkip={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
