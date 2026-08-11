import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migration = await readFile(
  resolve(root, 'supabase/migrations/20260811170000_admin_listing_creation.sql'),
  'utf8',
);
const plan = await readFile(
  resolve(root, 'docs/implementation/phase-4-admin-listing-creation.md'),
  'utf8',
);

function requireText(content, value, label = value) {
  if (!content.includes(value)) throw new Error(`Missing Phase 4 contract: ${label}`);
}

requireText(migration, 'create table public.listing_admin_audit_log');
requireText(migration, 'alter table public.listing_admin_audit_log enable row level security');
requireText(migration, 'Admins can view listing creation audit');
requireText(migration, 'num_nonnulls(venue_id, event_id) = 1');
requireText(migration, 'on delete cascade');

for (const fn of ['admin_create_venue', 'admin_create_event']) {
  const start = migration.indexOf(`function public.${fn}`);
  if (start < 0) throw new Error(`Missing Phase 4 function: ${fn}`);
  const body = migration.slice(start, start + 8000);
  requireText(body, 'security definer', `${fn} security definer`);
  requireText(body, 'set search_path = public', `${fn} fixed search_path`);
  requireText(body, 'if not public.is_admin_user()', `${fn} admin check`);
  requireText(body, "using errcode = '42501'", `${fn} authorization error`);
  requireText(body, "attribution not in ('unclaimed', 'd8advisr')", `${fn} attribution validation`);
  requireText(body, "publication_status not in ('draft', 'live')", `${fn} publication validation`);
  requireText(body, "'d8_admin'", `${fn} source provenance`);
  requireText(body, 'insert into public.listing_admin_audit_log', `${fn} audit insertion`);
  requireText(migration, `revoke all on function public.${fn}(jsonb) from public`);
  requireText(migration, `grant execute on function public.${fn}(jsonb) to authenticated`);
}

requireText(migration, "'00000000-0000-4000-8000-00000000d800'::uuid", 'platform organization');
requireText(migration, "coalesce(nullif(btrim(p_payload ->> 'publication_status'), ''), 'draft')", 'draft-safe default');
requireText(plan, 'fake partner user', 'no-fake-user decision');

for (const forbidden of [
  'insert into auth.users',
  'insert into public.profiles',
  'drop column partner_id',
  'alter column partner_id set not null',
  'drop policy "Live venue partners can',
  'drop policy "Live event partners can',
]) {
  if (migration.toLowerCase().includes(forbidden.toLowerCase())) {
    throw new Error(`Phase 4 must preserve identity and legacy authorization; found: ${forbidden}`);
  }
}

console.log('Phase 4 admin listing creation migration contract checks passed.');
