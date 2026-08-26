import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20260826120000_fix_trusted_event_origin_transition.sql', import.meta.url), 'utf8');

for (const token of [
  'create or replace function public.protect_event_organization_fields()',
  "new.source := 'partner'",
  'new.organizer_organization_id := old.organizer_organization_id',
  'events.source is enforced by 00_protect_event_listing_origin',
  'drop trigger if exists protect_event_organization_fields on public.events',
  'for each row execute function public.protect_event_organization_fields()',
  'join public.event_provenance_audit audit on audit.event_id = event.id',
  "event.source = 'd8_admin'",
  "event.event_status = 'draft'",
  'event.first_published_at is null',
  "audit.resulting_state ->> 'event_source' = 'import'",
  "perform set_config('d8.event_origin_event_id'",
  "set source = 'import'",
]) {
  assert(migration.includes(token), `event origin trigger repair is missing: ${token}`);
}

assert(!migration.includes('update public.venues'), 'event origin repair must not mutate venues');
assert(!migration.includes('delete from'), 'event origin repair must not delete data');
assert(!migration.includes('grant execute'), 'event protection trigger function must not be client executable');

console.log('PASS trusted event origin transition preserves organization and source protections');
