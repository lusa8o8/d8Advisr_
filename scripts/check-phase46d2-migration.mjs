import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migration = readFileSync(
  resolve(root, 'supabase/migrations/20260820140000_event_policy_v11_apply_audit_notify.sql'),
  'utf8',
);

const required = [
  'partner_apply_event_revision_v11',
  "'status', 'confirmation_required'",
  "'partner-event-publishing-v1.1'",
  "'MATERIAL_CONFIRMED'",
  "'NON_MATERIAL_AUTOMATIC'",
  'event_revision_rpc_required',
  "perform set_config('d8.event_revision_event_id'",
  'dispatch_event_change_notifications',
  "'event_price_changed'",
  'partner_cancel_event_v11',
  "event_status = 'cancelled'",
  "cancelled_at >= now() - interval '24 hours'",
  "status = 'cancelled'",
  'revoke execute on function public.admin_review_event_revision',
  'drop function if exists public.partner_submit_event_revision',
];

for (const fragment of required) {
  if (!migration.includes(fragment)) {
    throw new Error(`Missing Phase 4.6D2 database contract: ${fragment}`);
  }
}

for (const forbidden of [
  'published_free_event_cannot_become_paid',
  'published_event_price_cannot_increase',
  "'status', 'pending'",
]) {
  if (migration.includes(forbidden)) {
    throw new Error(`Superseded event policy remains in D2 migration: ${forbidden}`);
  }
}

console.log('Phase 4.6D2 migration contract checks passed.');
