import { supabase } from '@workspace/d8-core/supabase';
import type { DemandSignal } from '@workspace/d8-core/types';
import type { DemandSummaryRow } from './partnerModels';
import { demandSignalFromRow } from './partnerModels';

export async function fetchPartnerDemandSignals(): Promise<DemandSignal[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc('get_partner_demand_summary', { p_since: since });
  if (error) throw error;
  return ((data ?? []) as DemandSummaryRow[]).map(demandSignalFromRow).slice(0, 3);
}
