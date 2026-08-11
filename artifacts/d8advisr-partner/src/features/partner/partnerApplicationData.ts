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

export async function savePartnerApplication(userId: string, data: {
  name: string;
  partner_type: PartnerType;
  city: string;
  contact: string;
}) {
  const { data: existing, error: lookupError } = await supabase
    .from('partner_applications')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  throwIfError(lookupError);

  if (existing) {
    const { error } = await supabase
      .from('partner_applications')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    throwIfError(error);
    return;
  }

  const { error } = await supabase
    .from('partner_applications')
    .insert({ ...data, user_id: userId, status: 'pending' });
  throwIfError(error);
}
