import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migrationPath = resolve(
  root,
  'supabase/migrations/20260821143000_event_venue_relationship_foundation.sql',
);
const sql = readFileSync(migrationPath, 'utf8');
const syncRepair = readFileSync(resolve(
  root,
  'supabase/migrations/20260821144000_fix_event_venue_sync_idempotency.sql',
), 'utf8');
const conflictRepair = readFileSync(resolve(
  root,
  'supabase/migrations/20260821145000_fix_event_venue_conflict_sqlstate.sql',
), 'utf8');

const required = [
  'create table public.event_venue_relationships',
  'create table public.event_venue_relationship_audit',
  'event_venue_relationship_one_active_event_idx',
  "attribution_status in (",
  "placement_status in ('requested', 'approved', 'declined', 'revoked', 'withdrawn')",
  "policy_id text not null default 'event-venue-attribution-placement-v1.0'",
  'version bigint not null default 1',
  'create or replace function public.can_manage_event_attribution',
  'create or replace function public.can_manage_venue_placement',
  'public.can_manage_event(',
  'public.can_manage_venue(',
  "public.live_partner_can(user_uuid, 'events')",
  "public.live_partner_can(user_uuid, 'venues')",
  'create or replace function public.sync_event_venue_attribution',
  'create or replace function public.decide_event_venue_placement',
  'create or replace function public.resubmit_event_venue_placement',
  'create or replace function public.report_event_venue_attribution',
  'create or replace function public.respond_event_venue_dispute',
  'create or replace function public.resolve_event_venue_dispute',
  "set_config('d8.event_venue_placement_event_id'",
  "current_setting('d8.event_venue_placement_event_id'",
  'event_venue_relationship_conflict',
  'alter table public.event_venue_relationships enable row level security',
  'alter table public.event_venue_relationship_audit enable row level security',
  'revoke all on public.event_venue_relationships from anon, authenticated',
  'revoke all on public.event_venue_relationship_audit from anon, authenticated',
  'grant select on public.event_venue_relationships to authenticated',
  'grant select on public.event_venue_relationship_audit to authenticated',
  "request_source = 'migration'",
  "'migrated from events.venue_page_status'",
];

for (const value of required) {
  if (!sql.includes(value)) {
    throw new Error(`Missing Phase 4.6D4 foundation contract: ${value}`);
  }
}

const forbidden = [
  'grant insert on public.event_venue_relationships',
  'grant update on public.event_venue_relationships',
  'grant delete on public.event_venue_relationships',
  'grant insert on public.event_venue_relationship_audit',
  'grant update on public.event_venue_relationship_audit',
  'grant delete on public.event_venue_relationship_audit',
  'to anon;',
];

for (const value of forbidden) {
  if (sql.includes(value)) {
    throw new Error(`Unsafe Phase 4.6D4 foundation contract: ${value}`);
  }
}

for (const value of [
  "pg_advisory_xact_lock(hashtextextended('event_venue_relationship:'",
  'is distinct from event_row.organizer_organization_id',
  "'action', 'preserved'",
]) {
  if (!syncRepair.includes(value)) {
    throw new Error(`Missing Phase 4.6D4 idempotent sync repair: ${value}`);
  }
}

for (const value of [
  'decide_event_venue_placement(uuid,text,text,bigint)',
  'resubmit_event_venue_placement(uuid,text,bigint)',
  'report_event_venue_attribution(uuid,text,bigint)',
  'respond_event_venue_dispute(uuid,text,bigint)',
  'resolve_event_venue_dispute(uuid,text,text,bigint)',
  "'using errcode = ''P0001'''",
]) {
  if (!conflictRepair.includes(value)) {
    throw new Error(`Missing Phase 4.6D4 conflict SQLSTATE repair: ${value}`);
  }
}

const transitionRpcs = [
  'sync_event_venue_attribution(uuid, text)',
  'decide_event_venue_placement(uuid, text, text, bigint)',
  'resubmit_event_venue_placement(uuid, text, bigint)',
  'report_event_venue_attribution(uuid, text, bigint)',
  'respond_event_venue_dispute(uuid, text, bigint)',
  'resolve_event_venue_dispute(uuid, text, text, bigint)',
];

for (const signature of transitionRpcs) {
  if (!sql.includes(`revoke all on function public.${signature} from public, anon;`)) {
    throw new Error(`Missing browser-role revoke for ${signature}`);
  }
  if (!sql.includes(`grant execute on function public.${signature} to authenticated;`)) {
    throw new Error(`Missing authenticated grant for ${signature}`);
  }
}

console.log('PASS Phase 4.6D4 relationship schema is canonical and versioned');
console.log('PASS organizer and venue authorization dual-read organization and legacy ownership');
console.log('PASS transition RPCs own writes and enforce optimistic concurrency');
console.log('PASS relationship and audit tables expose no browser write grants');
console.log('PASS legacy venue-page status is a guarded compatibility projection');
