import { supabase } from './supabase';
import type { PartnerType } from './partnerCapabilities';

export type AccountScope = 'anonymous' | 'consumer' | 'partner' | 'admin';
export type PartnerStatus = 'pending' | 'live' | 'needs_update' | 'rejected';

export interface AccountContext {
  scope: AccountScope;
  partnerStatus: PartnerStatus | null;
  partnerType: PartnerType | null;
}

type AccountContextRow = {
  scope?: unknown;
  partner_status?: unknown;
  partner_type?: unknown;
};

function firstRow(data: unknown): AccountContextRow | null {
  if (Array.isArray(data)) return (data[0] ?? null) as AccountContextRow | null;
  if (data && typeof data === 'object') return data as AccountContextRow;
  return null;
}

function normalizeScope(value: unknown): AccountScope {
  return value === 'consumer' || value === 'partner' || value === 'admin'
    ? value
    : 'anonymous';
}

function normalizePartnerStatus(value: unknown): PartnerStatus | null {
  return value === 'pending'
    || value === 'live'
    || value === 'needs_update'
    || value === 'rejected'
    ? value
    : null;
}

function normalizePartnerType(value: unknown): PartnerType | null {
  return value === 'venue' || value === 'organizer' || value === 'both'
    ? value
    : null;
}

function toAccountContext(data: unknown): AccountContext {
  const row = firstRow(data);
  return {
    scope: normalizeScope(row?.scope),
    partnerStatus: normalizePartnerStatus(row?.partner_status),
    partnerType: normalizePartnerType(row?.partner_type),
  };
}

export async function getCurrentAccountContext(): Promise<AccountContext> {
  const current = await supabase.rpc('get_current_account_context');
  if (!current.error) return toAccountContext(current.data);

  // Compatibility with environments that have not applied the route-neutral
  // account-context migration yet.
  const legacy = await supabase.rpc('get_current_account_scope');
  if (legacy.error) throw legacy.error;
  return toAccountContext(legacy.data);
}
