import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ChevronRight, SkipForward } from 'lucide-react';
import { cn } from '@/components/SharedUI';
import { supabase } from '@/lib/supabase';
import { useReviewSubmission } from '@/hooks/useReviewSubmission';

type Tier = 'Verified' | 'D8 Approved' | 'Hidden Gem';

type ReviewStop = {
  id: string;
  venueId: string | null;
  venueName: string;
  category: string;
  tier: Tier;
  emoji: string;
  label: string;
  time: string;
};

type VenueRatings = {
  vibe: number;
  value: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEMO_STOPS: ReviewStop[] = [
  { id: 's1', venueId: null, venueName: 'The Velvet Lounge', category: 'Cocktail Bar', tier: 'Verified', emoji: '🍸', label: 'Pre-dinner drinks', time: '7:00 PM' },
  { id: 's2', venueId: null, venueName: 'Lumina Restaurant & Bar', category: 'Romantic Dining', tier: 'D8 Approved', emoji: '🍽️', label: 'Dinner', time: '8:15 PM' },
  { id: 's3', venueId: null, venueName: 'Skyline Rooftop', category: 'Rooftop Bar', tier: 'Hidden Gem', emoji: '🌙', label: 'Nightcap', time: '10:30 PM' },
];

const VIBE_TAGS = ['Romantic', 'Buzzy', 'Quiet & cosy', 'Worth it', 'Great service', 'Overpriced', 'Hidden gem', 'Not for us'];

const MOOD_OPTIONS = [
  { emoji: '😍', label: 'Loved it', score: 5 },
  { emoji: '😊', label: 'Good', score: 4 },
  { emoji: '😐', label: 'It was ok', score: 3 },
  { emoji: '😕', label: 'Meh', score: 2 },
  { emoji: '😞', label: "Didn't enjoy", score: 1 },
];

const TIER_BADGE: Record<Tier, string> = {
  Verified: 'bg-blue-50 text-blue-700 border-blue-200',
  'D8 Approved': 'bg-amber-50 text-amber-700 border-amber-200',
  'Hidden Gem': 'bg-purple-50 text-purple-700 border-purple-200',
};

function DotRating({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-2.5">
      {[1, 2, 3, 4, 5].map(score => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={cn(
            'w-8 h-8 rounded-full border-2 transition-all active:scale-90',
            score <= value
              ? 'bg-[#FF5A5F] border-[#FF5A5F] scale-105'
              : 'bg-gray-100 border-gray-200 hover:border-gray-300',
          )}
          aria-label={`Rate ${score}`}
        />
      ))}
    </div>
  );
}

function Step1Mood({ onSelect }: { onSelect: (score: number, emoji: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="flex flex-col flex-1 px-6 pt-4 pb-8">
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">Step 1 of 3</p>
        <h2 className="text-[26px] font-black text-gray-900 text-center leading-tight mb-2">How was your evening?</h2>
        <p className="text-[14px] text-gray-500 text-center mb-10">Tap once. That is all you need.</p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          {MOOD_OPTIONS.map(option => (
            <button
              key={option.score}
              type="button"
              onClick={() => setSelected(option.score)}
              className={cn(
                'flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.97]',
                selected === option.score ? 'border-[#FF5A5F] bg-[#FF5A5F]/5 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <span className="text-3xl leading-none">{option.emoji}</span>
              <span className={cn('font-bold text-[15px]', selected === option.score ? 'text-[#FF5A5F]' : 'text-gray-800')}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={selected === null}
        onClick={() => {
          const option = MOOD_OPTIONS.find(item => item.score === selected);
          if (option) onSelect(option.score, option.emoji);
        }}
        className={cn(
          'w-full py-4 rounded-2xl font-bold text-[16px] transition-all',
          selected !== null ? 'bg-[#FF5A5F] text-white shadow-[0_8px_20px_-6px_rgba(255,90,95,0.45)] active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed',
        )}
      >
        Continue
      </button>
    </div>
  );
}

function Step2Venues({
  stops,
  ratings,
  onUpdate,
  onNext,
  onSkip,
}: {
  stops: ReviewStop[];
  ratings: Record<string, VenueRatings>;
  onUpdate: (id: string, dimension: 'vibe' | 'value', value: number) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const stop = stops[activeIdx] ?? stops[0];
  const rating = ratings[stop.id] ?? { vibe: 0, value: 0 };
  const isLast = activeIdx === stops.length - 1;
  const canAdvance = rating.vibe > 0 && rating.value > 0;

  return (
    <div className="flex flex-col flex-1 px-6 pt-4 pb-8">
      <div className="flex-1 flex flex-col">
        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Step 2 of 3</p>
        <h2 className="text-[22px] font-black text-gray-900 text-center leading-tight mb-1">Rate each stop</h2>
        <p className="text-[13px] text-gray-400 text-center mb-6">Two quick ratings per venue.</p>

        <div className="flex gap-2 justify-center mb-6">
          {stops.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIdx(index)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border',
                activeIdx === index
                  ? 'bg-[#FF5A5F] text-white border-[#FF5A5F] shadow-sm'
                  : (ratings[item.id]?.vibe ?? 0) > 0 && (ratings[item.id]?.value ?? 0) > 0
                    ? 'bg-[#00C851]/10 text-[#00C851] border-[#00C851]/30'
                    : 'bg-gray-100 text-gray-500 border-gray-200',
              )}
            >
              {item.emoji} {index + 1}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{stop.emoji}</span>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                  {stop.label}{stop.time ? ` · ${stop.time}` : ''}
                </p>
                <p className="font-bold text-gray-900 text-[15px] leading-tight">{stop.venueName}</p>
                <p className="text-[12px] text-gray-500">{stop.category}</p>
              </div>
            </div>
            <div className={cn('px-2.5 py-1 rounded-full border text-[10px] font-bold shrink-0 mt-0.5', TIER_BADGE[stop.tier])}>
              {stop.tier}
            </div>
          </div>

          <div className="h-px bg-gray-100 mb-4" />
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800 text-[14px]">Vibe</p>
                <p className="text-[11px] text-gray-400">Atmosphere and energy</p>
              </div>
              <DotRating value={rating.vibe} onChange={value => onUpdate(stop.id, 'vibe', value)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800 text-[14px]">Value</p>
                <p className="text-[11px] text-gray-400">Worth what you paid</p>
              </div>
              <DotRating value={rating.value} onChange={value => onUpdate(stop.id, 'value', value)} />
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 justify-center mb-auto">
          {stops.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                'h-1.5 rounded-full transition-all',
                index === activeIdx ? 'w-6 bg-[#FF5A5F]' : (ratings[item.id]?.vibe ?? 0) > 0 ? 'w-3 bg-[#00C851]' : 'w-3 bg-gray-200',
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onSkip}
          className="px-5 py-4 rounded-2xl border-2 border-gray-200 flex items-center gap-1.5 text-gray-400 font-semibold text-[13px] active:scale-95 transition-transform hover:border-gray-300"
        >
          <SkipForward size={15} /> Skip
        </button>
        <button
          type="button"
          onClick={() => (isLast ? onNext() : setActiveIdx(index => index + 1))}
          disabled={!canAdvance}
          className={cn(
            'flex-1 py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]',
            canAdvance ? 'bg-[#FF5A5F] text-white shadow-[0_8px_20px_-6px_rgba(255,90,95,0.4)]' : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          )}
        >
          {isLast ? 'Last step' : 'Next stop'} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function Step3Notes({
  note,
  tags,
  error,
  submitting,
  onNoteChange,
  onTagToggle,
  onSubmit,
  onSkip,
}: {
  note: string;
  tags: string[];
  error: string | null;
  submitting: boolean;
  onNoteChange: (value: string) => void;
  onTagToggle: (tag: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 px-6 pt-4 pb-8">
      <div className="flex-1">
        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Step 3 of 3</p>
        <h2 className="text-[22px] font-black text-gray-900 text-center leading-tight mb-1">Anything to add?</h2>
        <p className="text-[13px] text-gray-400 text-center mb-6">Optional notes help future planners.</p>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          <textarea
            value={note}
            onChange={event => onNoteChange(event.target.value)}
            placeholder="The lighting was perfect, the cocktails were strong, would come back..."
            maxLength={280}
            rows={4}
            className="w-full px-4 pt-4 pb-2 text-[14px] text-gray-800 placeholder-gray-400 resize-none outline-none font-medium leading-relaxed"
          />
          <div className="px-4 pb-3 text-right">
            <span className="text-[11px] text-gray-300 font-medium">{note.length}/280</span>
          </div>
        </div>

        <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-3">Pick up to 3 vibes</p>
        <div className="flex flex-wrap gap-2">
          {VIBE_TAGS.map(tag => {
            const active = tags.includes(tag);
            const maxed = !active && tags.length >= 3;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => !maxed && onTagToggle(tag)}
                className={cn(
                  'px-3.5 py-2 rounded-full text-[12px] font-semibold border transition-all active:scale-95',
                  active
                    ? 'bg-[#FF5A5F] text-white border-[#FF5A5F] shadow-sm'
                    : maxed
                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onSkip}
          className="px-5 py-4 rounded-2xl border-2 border-gray-200 flex items-center gap-1.5 text-gray-400 font-semibold text-[13px] active:scale-95 transition-transform hover:border-gray-300"
        >
          <SkipForward size={15} /> Skip
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 py-4 rounded-2xl bg-[#FF5A5F] text-white font-bold text-[15px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.4)] active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}

export function PostDateReview() {
  const [, setLocation] = useLocation();
  const { submitPlanReview } = useReviewSubmission();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState('Romantic Night in Lagos');
  const [reviewStops, setReviewStops] = useState<ReviewStop[]>(DEMO_STOPS);
  const [moodScore, setMoodScore] = useState(0);
  const [moodEmoji, setMoodEmoji] = useState('');
  const [venueRatings, setVenueRatings] = useState<Record<string, VenueRatings>>({});
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('planId');
    if (!id || !UUID_RE.test(id)) return;

    let active = true;
    setPlanId(id);

    async function loadReviewContext() {
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('id,title')
        .eq('id', id)
        .maybeSingle();

      if (planError && import.meta.env.DEV) {
        console.warn('[D8 reviews] Could not load plan for review', planError.message);
      }

      const { data: stops, error: stopsError } = await supabase
        .from('plan_stops')
        .select('id,venue_id,label,time,position,venues(name,category,tier)')
        .eq('plan_id', id)
        .not('venue_id', 'is', null)
        .order('position', { ascending: true });

      if (!active) return;

      if (plan?.title) {
        setPlanTitle(plan.title);
      }

      if (stopsError) {
        if (import.meta.env.DEV) {
          console.warn('[D8 reviews] Could not load plan stops for review', stopsError.message);
        }
        return;
      }

      const mapped = ((stops ?? []) as Array<{
        id: string;
        venue_id: string | null;
        label: string | null;
        time: string | null;
        venues: { name?: string; category?: string; tier?: string } | Array<{ name?: string; category?: string; tier?: string }> | null;
      }>).map((stop, index) => {
        const venue = Array.isArray(stop.venues) ? stop.venues[0] : stop.venues;
        return {
          id: stop.id,
          venueId: stop.venue_id,
          venueName: venue?.name ?? `Stop ${index + 1}`,
          category: venue?.category ?? 'Venue',
          tier: (venue?.tier === 'D8 Approved' || venue?.tier === 'Hidden Gem' ? venue.tier : 'Verified') as Tier,
          emoji: index === 0 ? '🍸' : index === 1 ? '🍽️' : '🌙',
          label: stop.label ?? `Stop ${index + 1}`,
          time: stop.time ?? '',
        };
      });

      if (mapped.length > 0) {
        setReviewStops(mapped);
        setVenueRatings({});
      }
    }

    void loadReviewContext();

    return () => { active = false; };
  }, []);

  const handleMoodSelect = (score: number, emoji: string) => {
    setMoodScore(score);
    setMoodEmoji(emoji);
    setStep(2);
  };

  const handleVenueUpdate = useCallback((id: string, dimension: 'vibe' | 'value', value: number) => {
    setVenueRatings(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { vibe: 0, value: 0 }), [dimension]: value },
    }));
  }, []);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);

    const venueReviews = reviewStops
      .map(stop => {
        const rating = venueRatings[stop.id];
        if (!rating || !stop.venueId) return null;
        return {
          venueId: stop.venueId,
          planStopId: UUID_RE.test(stop.id) ? stop.id : null,
          vibeScore: rating.vibe,
          valueScore: rating.value,
        };
      })
      .filter((review): review is NonNullable<typeof review> => Boolean(review));

    const result = await submitPlanReview({
      planId: planId ?? '',
      moodScore,
      moodEmoji,
      note,
      tags: selectedTags,
      venueReviews,
    });

    setSubmitting(false);

    if (result.error) {
      setSubmitError('Could not submit your review. Please try again.');
      return;
    }

    setLocation('/review/complete');
  };

  const getStepLabel = () => {
    if (step === 1) return 'How was it?';
    if (step === 2) return 'Rate your stops';
    return 'Final thoughts';
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F7F7F7]">
      <div className="shrink-0 px-5 pt-10 lg:pt-14 pb-3 lg:pb-4 bg-white border-b border-gray-100 relative">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep(prev => (prev - 1) as 1 | 2 | 3) : setLocation('/plan/1'))}
          className="absolute left-5 top-14 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-[#FF5A5F] uppercase tracking-widest mb-0.5">Post-Date Review</p>
          <p className="font-bold text-gray-900 text-[16px]">{getStepLabel()}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{planTitle}</p>
        </div>

        <div className="flex gap-1.5 mt-4">
          {([1, 2, 3] as const).map(item => (
            <div
              key={item}
              className={cn('h-1 flex-1 rounded-full transition-all', item <= step ? 'bg-[#FF5A5F]' : 'bg-gray-200')}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col">
        {step === 1 && <Step1Mood onSelect={handleMoodSelect} />}
        {step === 2 && (
          <Step2Venues
            stops={reviewStops}
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
            error={submitError}
            submitting={submitting}
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
