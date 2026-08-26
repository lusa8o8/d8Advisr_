import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migration = await readFile(
  resolve(root, 'supabase/migrations/20260826100000_event_provenance_and_action_links.sql'),
  'utf8',
);
const visibilityRepair = await readFile(
  resolve(root, 'supabase/migrations/20260826103000_fix_event_provenance_parent_visibility.sql'),
  'utf8',
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const token of [
  'create table public.event_sources',
  "source_type in ('organizer', 'venue', 'ticketing', 'press', 'calendar', 'social')",
  "verification_status in ('unverified', 'verified', 'stale', 'rejected')",
  "url ~* '^https?://[^[:space:]]+$'",
  'event_sources_verification_state_check',
  'event_sources_one_primary_public_idx',
  'unique (event_id, url)',
  'create table public.event_action_links',
  "link_type in ('tickets', 'registration', 'official')",
  "status in ('unverified', 'active', 'sold_out', 'closed', 'invalid')",
  "label in ('Get tickets', 'Register', 'View official details')",
  'event_action_links_verification_state_check',
  'event_action_links_one_primary_idx',
  'create table public.event_provenance_audit',
  "action text not null check (action in ('replaced'))",
  'unique (actor_user_id, request_key)',
  'alter table public.event_sources enable row level security',
  'alter table public.event_action_links enable row level security',
  'alter table public.event_provenance_audit enable row level security',
  'create policy event_sources_public_select',
  "event.event_status in ('live', 'cancelled')",
  'event.retired_at is null',
  'create policy event_sources_admin_all',
  'create policy event_action_links_public_select',
  "status in ('active', 'sold_out')",
  'create policy event_action_links_admin_all',
  'create policy event_provenance_audit_admin_select',
  'create or replace function public.protect_event_listing_origin()',
  'event_listing_origin_is_server_managed',
  'create or replace function public.admin_replace_event_provenance(',
  'p_expected_updated_at timestamptz',
  'p_request_key uuid',
  'p_mark_as_import boolean default false',
  'admin_event_provenance_required',
  'event_provenance_request_key_reused',
  'event_changed_after_provenance_loaded',
  'retired_event_provenance_cannot_change',
  'only_d8_admin_drafts_can_be_marked_as_imports',
  "perform set_config('d8.event_origin_event_id'",
  "set source = case when coalesce(p_mark_as_import, false) then 'import' else source end",
  "p_event_id, 'replaced', actor, p_request_key, previous_snapshot, resulting_snapshot",
  'create or replace function public.enforce_import_event_verified_source()',
  "new.source = 'import'",
  "source.verification_status = 'verified'",
  'import_event_verified_source_required',
  'create trigger "02_enforce_import_event_verified_source"',
  'grant select on public.event_sources to anon, authenticated',
  'grant select on public.event_action_links to anon, authenticated',
  'grant select on public.event_provenance_audit to authenticated',
  'grant execute on function public.admin_replace_event_provenance(',
]) {
  assert(migration.includes(token), `Phase 4.8A migration is missing: ${token}`);
}

for (const unsafe of [
  'grant insert on public.event_sources',
  'grant update on public.event_sources',
  'grant delete on public.event_sources',
  'grant insert on public.event_action_links',
  'grant update on public.event_action_links',
  'grant delete on public.event_action_links',
  'grant insert on public.event_provenance_audit',
  'grant update on public.event_provenance_audit',
  'grant delete on public.event_provenance_audit',
  'delete from public.events',
  'alter table public.events add column source_url',
  'alter table public.events add column ticket_url',
]) {
  assert(!migration.includes(unsafe), `Phase 4.8A migration contains unsafe/legacy contract: ${unsafe}`);
}

assert(
  migration.indexOf('create table public.event_sources')
    < migration.indexOf('create or replace function public.enforce_import_event_verified_source()'),
  'Verified-source storage must exist before the import publication guard',
);
assert(
  migration.indexOf("perform set_config('d8.event_origin_event_id'")
    < migration.indexOf('set source = case when coalesce(p_mark_as_import, false)'),
  'The trusted RPC must authorize origin mutation before updating events.source',
);
assert(
  migration.indexOf('select * into target_event from public.events where id = p_event_id for update')
    < migration.indexOf('delete from public.event_sources where event_id = p_event_id'),
  'The RPC must lock and validate the parent before replacing child rows',
);

console.log('PASS Phase 4.8A has separate evidence and action-link tables');
console.log('PASS public reads inherit live/cancelled and retirement boundaries');
console.log('PASS browser roles have no direct provenance or audit writes');
console.log('PASS admin replacement is idempotent, concurrent, and audited');
console.log('PASS only imported events require verified evidence to publish');
console.log('PASS listing origin is server-managed after event creation');

for (const token of [
  'create or replace function public.is_public_event_for_provenance(p_event_id uuid)',
  'stable',
  'security definer',
  "event.event_status in ('live', 'cancelled')",
  'event.retired_at is null',
  'grant execute on function public.is_public_event_for_provenance(uuid) to anon, authenticated',
  'drop policy if exists event_sources_public_select',
  'and public.is_public_event_for_provenance(event_id)',
  'drop policy if exists event_action_links_public_select',
]) {
  assert(visibilityRepair.includes(token), `Phase 4.8A visibility repair is missing: ${token}`);
}
assert(
  !visibilityRepair.includes('grant select on public.events to anon'),
  'Visibility repair must not widen the hardened events table grant',
);
console.log('PASS child visibility uses a narrow helper without widening event-table grants');
