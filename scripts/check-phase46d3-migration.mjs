import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migration = [readFileSync(
  resolve(root, 'supabase/migrations/20260821120000_admin_event_policy_v11_parity.sql'),
  'utf8',
), readFileSync(
  resolve(root, 'supabase/migrations/20260821121000_normalize_admin_event_revision_timestamps.sql'),
  'utf8',
)].join('\n');

const required = [
  'create or replace function public.publish_event_with_policy',
  "p_policy_id is distinct from 'partner-event-publishing-v1.1'",
  "policy_hash constant text := 'e3933f5bc2fdb5679e56a72e1393b79c457d4fa007a354ba2f94545c6438c71a'",
  'create or replace function public.admin_apply_event_revision_v11',
  "'status', 'confirmation_required'",
  "'MATERIAL_CONFIRMED'",
  "'NON_MATERIAL_AUTOMATIC'",
  'dispatch_event_change_notifications',
  "perform set_config('d8.event_revision_event_id'",
  'create or replace function public.admin_cancel_event_v11',
  "new.event_status = 'cancelled'",
  'revoke execute on function public.admin_update_live_event',
  'admin_apply_event_revision_v11_core',
  "to_jsonb((normalized_payload ->> 'starts_at')::timestamptz)",
];

for (const fragment of required) {
  if (!migration.includes(fragment)) {
    throw new Error(`Missing Phase 4.6D3 database contract: ${fragment}`);
  }
}

for (const forbidden of [
  'published_free_event_cannot_become_paid',
  'published_event_price_cannot_increase',
  'and not public.is_admin_user()',
]) {
  if (migration.includes(forbidden)) {
    throw new Error(`Superseded admin policy remains in D3 migration: ${forbidden}`);
  }
}

console.log('Phase 4.6D3 migration contract checks passed.');
