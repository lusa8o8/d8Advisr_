import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type VenueReviewInput = {
  venueId: string;
  planStopId?: string | null;
  vibeScore: number;
  valueScore: number;
};

export type SubmitPlanReviewInput = {
  planId: string;
  moodScore: number;
  moodEmoji?: string;
  note?: string;
  tags: string[];
  venueReviews: VenueReviewInput[];
};

function isUuid(value: string | null | undefined) {
  return Boolean(value && UUID_RE.test(value));
}

function logReviewIssue(message: string, context?: unknown) {
  if (import.meta.env.DEV) {
    console.warn(`[D8 reviews] ${message}`, context);
  }
}

export function useReviewSubmission() {
  const submitPlanReview = useCallback(async ({
    planId,
    moodScore,
    moodEmoji,
    note,
    tags,
    venueReviews,
  }: SubmitPlanReviewInput) => {
    const validVenueReviews = venueReviews.filter(review => {
      const valid =
        isUuid(review.venueId)
        && (!review.planStopId || isUuid(review.planStopId))
        && review.vibeScore >= 1
        && review.vibeScore <= 5
        && review.valueScore >= 1
        && review.valueScore <= 5;

      if (!valid) {
        logReviewIssue('Skipped invalid venue review payload', review);
      }

      return valid;
    });

    if (!isUuid(planId)) {
      logReviewIssue('Skipped review submission without a real plan id', { planId });
      return { skipped: true, error: null };
    }

    const { error } = await supabase.rpc('submit_plan_review', {
      p_plan_id: planId,
      p_mood_score: moodScore,
      p_mood_emoji: moodEmoji ?? null,
      p_note: note?.trim() || null,
      p_tags: tags,
      p_venue_reviews: validVenueReviews.map(review => ({
        venue_id: review.venueId,
        plan_stop_id: review.planStopId ?? null,
        vibe_score: review.vibeScore,
        value_score: review.valueScore,
      })),
    });

    if (error) {
      logReviewIssue('Could not submit review', error.message);
      return { skipped: false, error };
    }

    return { skipped: false, error: null };
  }, []);

  return { submitPlanReview };
}
