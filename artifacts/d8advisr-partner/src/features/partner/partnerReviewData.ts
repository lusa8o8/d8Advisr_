import { supabase } from '@workspace/d8-core/supabase';
import type { PartnerReviewInsight } from '@workspace/d8-core/types';
import type { ReviewSummaryRow } from './partnerModels';
import { reviewInsightFromRow } from './partnerModels';

export async function fetchPartnerReviewInsights(): Promise<PartnerReviewInsight[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc('get_partner_review_summary', { p_since: since });
  if (error) throw error;
  return ((data ?? []) as ReviewSummaryRow[]).map(reviewInsightFromRow).slice(0, 3);
}
