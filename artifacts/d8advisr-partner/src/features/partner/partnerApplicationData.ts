import { supabase } from '@workspace/d8-core/supabase';
import type { PartnerType } from '@workspace/d8-core/partner-capabilities';
import type { PartnerApplicationRow } from './partnerModels';

function throwIfError(error: { message: string } | null) {
  if (error) throw error;
}

export async function getAuthenticatedPartnerUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export async function getOptionalPartnerUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function fetchPartnerApplication(userId: string): Promise<PartnerApplicationRow | null> {
  const { data, error } = await supabase
    .from('partner_applications')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  throwIfError(error);
  return data as PartnerApplicationRow | null;
}

export async function savePartnerApplication(data: {
  name: string;
  partner_type: PartnerType;
  region_id: string;
  contact: string;
}) {
  const { error } = await supabase.rpc('submit_partner_application', {
    p_name: data.name,
    p_partner_type: data.partner_type,
    p_region_id: data.region_id,
    p_contact: data.contact,
  });
  throwIfError(error);
}
