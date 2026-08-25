import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migration = await readFile(
  resolve(root, 'supabase/migrations/20260825130000_admin_listing_retirement.sql'),
  'utf8',
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const token of [
  'add column retired_at timestamptz',
  'add column retired_by uuid references public.profiles(id) on delete set null',
  'add column retirement_reason text',
  'add column retired_from_status text',
  'venues_retirement_metadata_check',
  'events_retirement_metadata_check',
  'create table public.listing_retirement_audit',
  "action text not null check (action in ('retired', 'restored'))",
  'unique (actor_user_id, request_key, target_type)',
  'create or replace function public.protect_listing_retirement_state()',
  'retired_listing_rpc_required',
  'create or replace function public.admin_retire_venue(',
  'create or replace function public.admin_restore_venue(',
  'create or replace function public.admin_retire_event(',
  'create or replace function public.admin_restore_event(',
  'p_expected_updated_at timestamptz',
  'p_request_key uuid',
  'partner_owned_venue_cannot_be_admin_retired',
  'partner_owned_event_cannot_be_admin_retired',
  'venue_has_future_live_events',
  'upcoming_live_event_must_be_cancelled_first',
  'event_cancellation_visibility_window_active',
  "target.first_published_at is null then 'draft' else 'paused'",
  "listing_status = 'hidden', is_active = false",
  "listing_status = 'draft', is_active = false",
  "grant execute on function public.admin_retire_venue(uuid, timestamptz, text, uuid) to authenticated",
  "grant execute on function public.admin_retire_event(uuid, timestamptz, text, uuid) to authenticated",
  'revoke delete on public.venues from public, anon, authenticated',
  'revoke delete on public.events from public, anon, authenticated',
  'drop policy if exists "Live venue partners can delete own venues"',
  'drop policy if exists "Live event partners can delete own events"',
  'drop policy if exists "Admins can manage venues"',
  'create policy "Admins can insert venues"',
  'create policy "Admins can update venues"',
  'drop policy if exists "Admins can manage events"',
  'create policy "Admins can view all events"',
  'create policy "Admins can insert events"',
  'create policy "Admins can update events"',
]) {
  assert(migration.includes(token), `Admin listing retirement migration is missing: ${token}`);
}

assert(
  migration.indexOf('create or replace function public.protect_listing_retirement_state()')
    < migration.indexOf('create or replace function public.admin_retire_venue('),
  'Retirement-field protection must exist before RPCs mutate retirement state',
);
assert(
  migration.indexOf('venue_has_future_live_events')
    < migration.indexOf("listing_status = 'hidden', is_active = false"),
  'Venue dependency validation must happen before retirement mutation',
);
assert(
  migration.indexOf('upcoming_live_event_must_be_cancelled_first')
    < migration.indexOf("set retired_at = now(), retired_by = actor", migration.indexOf('create or replace function public.admin_retire_event(')),
  'Upcoming-event cancellation validation must happen before event retirement mutation',
);
assert(
  !migration.includes('delete from public.venues') && !migration.includes('delete from public.events'),
  'Slice 1 must not physically delete listing rows',
);
assert(
  !migration.includes('storage.objects'),
  'Slice 1 must not delete or mutate storage objects',
);

console.log('Admin listing retirement Slice 1 migration checks passed.');
