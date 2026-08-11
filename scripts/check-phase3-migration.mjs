import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migration = await readFile(resolve(root, 'supabase/migrations/20260811160000_organization_ownership_foundation.sql'), 'utf8');
const sharedClient = await readFile(resolve(root, 'lib/d8-core/src/supabase.ts'), 'utf8');
const verification = await readFile(resolve(root, 'supabase/staging/verify_phase3_organization_foundation.sql'), 'utf8');

function requireText(content, value, label = value) {
  if (!content.includes(value)) throw new Error(`Missing Phase 3 contract: ${label}`);
}

for (const table of [
  'partner_organizations',
  'partner_organization_memberships',
  'partner_organization_claims',
]) {
  requireText(migration, `create table public.${table}`);
  requireText(migration, `alter table public.${table} enable row level security`);
  requireText(verification, `'${table}'`);
}

for (const column of [
  'organization_id uuid references public.partner_organizations',
  'operator_organization_id uuid references public.partner_organizations',
  'organizer_organization_id uuid references public.partner_organizations',
  'created_by uuid references public.profiles',
]) {
  requireText(migration, column);
}

for (const fn of [
  'is_active_organization_member',
  'organization_member_role',
  'organization_can',
  'is_claimable_organization',
  'can_manage_venue',
  'can_manage_event',
  'protect_listing_organization_fields',
]) {
  const start = migration.indexOf(`function public.${fn}`);
  if (start < 0) throw new Error(`Missing Phase 3 function: ${fn}`);
  const body = migration.slice(start, start + 600);
  requireText(body, 'security definer', `${fn} security definer`);
  requireText(body, 'set search_path = public', `${fn} fixed search_path`);
}

requireText(migration, "'00000000-0000-4000-8000-00000000d800'::uuid", 'deterministic D8Advisr organization');
requireText(migration, 'partner_organization_one_active_primary_owner_idx');
requireText(migration, 'partner_organization_one_active_claim_idx');
requireText(migration, 'revoke select on public.venues from anon, authenticated');
requireText(migration, 'revoke select on public.events from anon, authenticated');
requireText(sharedClient, 'VENUE_CLIENT_SELECT');
requireText(sharedClient, 'EVENT_CLIENT_SELECT');

for (const forbidden of [
  'drop column partner_id',
  'drop table public.partner_applications',
  'drop function public.live_partner_can',
  'drop policy "Live venue partners can update own venues"',
  'drop policy "Live event partners can update own events"',
]) {
  if (migration.toLowerCase().includes(forbidden.toLowerCase())) {
    throw new Error(`Phase 3 must remain additive; found: ${forbidden}`);
  }
}

const venueSelect = sharedClient.match(/VENUE_CLIENT_SELECT = '([^']+)'/)?.[1] ?? '';
const eventSelect = sharedClient.match(/EVENT_CLIENT_SELECT = '([^']+)'/)?.[1] ?? '';
if (venueSelect.split(',').includes('created_by') || eventSelect.split(',').includes('created_by')) {
  throw new Error('Private created_by audit data must not be requested by clients');
}
for (const publicAttributionColumn of ['source']) {
  if (!venueSelect.split(',').includes(publicAttributionColumn) || !eventSelect.split(',').includes(publicAttributionColumn)) {
    throw new Error(`Client listing selects are missing attribution: ${publicAttributionColumn}`);
  }
}
if (!venueSelect.split(',').includes('operator_organization_id') || !eventSelect.split(',').includes('organizer_organization_id')) {
  throw new Error('Client listing selects are missing organization attribution');
}

console.log('Phase 3 additive migration contract checks passed.');
