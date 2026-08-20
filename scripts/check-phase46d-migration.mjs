import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migration = readFileSync(
  resolve(root, 'supabase/migrations/20260820110000_partner_admission_access_closure.sql'),
  'utf8',
);
const repairMigration = readFileSync(
  resolve(root, 'supabase/migrations/20260820120000_repair_event_revision_schema_contract.sql'),
  'utf8',
);

const required = [
  "when capability = 'events' then public.live_partner_type(user_uuid) in ('venue', 'organizer', 'both')",
  'revoke insert, update on public.partner_applications from authenticated',
  'create or replace function public.submit_partner_application',
  "existing_application.status not in ('needs_update', 'rejected')",
  "status = 'pending'",
  'region_id = canonical_region.id',
  'city = canonical_region.name',
  "new_status in ('needs_update', 'rejected')",
  'reviewed_by = auth.uid()',
  'review_reason text',
  'internal_review_note text',
];

for (const fragment of required) {
  if (!migration.includes(fragment)) {
    throw new Error(`Missing Phase 4.6D migration contract: ${fragment}`);
  }
}

const forbidden = [
  'grant update (name, partner_type',
  'create policy "Users can update own partner application details"',
];

for (const fragment of forbidden) {
  if (migration.includes(fragment)) {
    throw new Error(`Unsafe Phase 4.6D migration contract remains: ${fragment}`);
  }
}

for (const fragment of [
  'add column if not exists blocked_reason text',
  'add column if not exists event_id uuid references public.events(id)',
  "'revision_decision'",
]) {
  if (!repairMigration.includes(fragment)) {
    throw new Error(`Missing event revision compatibility repair: ${fragment}`);
  }
}

console.log('Phase 4.6D migration contract checks passed.');
