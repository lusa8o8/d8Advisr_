import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20260826113000_public_event_listing_attribution.sql', import.meta.url), 'utf8');

for (const token of [
  'create or replace function public.get_public_event_listing_attribution(p_event_id uuid)',
  'returns table',
  'attribution_type text',
  'display_name text',
  'stable',
  'security definer',
  "event.source in ('d8_admin', 'import')",
  "event.source = 'partner'",
  'organization.id = event.organizer_organization_id',
  'public.is_public_event_for_provenance(event.id)',
  "then 'D8Advisr'",
  'grant execute on function public.get_public_event_listing_attribution(uuid) to anon, authenticated',
]) {
  assert(migration.includes(token), `public event attribution migration is missing: ${token}`);
}

for (const unsafe of [
  'grant select on public.partner_organizations to anon',
  'grant select on public.partner_organizations to authenticated',
  'create policy',
  'organization.contact',
  'organization.created_by',
  'organization.verified_by',
]) {
  assert(!migration.includes(unsafe), `public event attribution migration widens or leaks organization data: ${unsafe}`);
}

console.log('PASS public event listing attribution is narrow and server-derived');
