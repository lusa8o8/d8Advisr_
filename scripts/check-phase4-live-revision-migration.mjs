import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const migration = await readFile(resolve(import.meta.dirname, '../supabase/migrations/20260812120000_admin_live_venue_revisions.sql'), 'utf8');
const taskProtection = await readFile(resolve(import.meta.dirname, '../supabase/migrations/20260812121000_protect_pending_live_revision_tasks.sql'), 'utf8');
const requireText = (value) => { if (!migration.includes(value)) throw new Error(`Missing live-revision contract: ${value}`); };

for (const value of [
  'create table public.venue_live_revisions',
  'venue_live_revisions_one_pending_idx',
  'alter table public.venue_live_revisions enable row level security',
  'Admins can view live venue revisions',
  'add column live_revision_id uuid references public.venue_live_revisions(id) on delete cascade',
  'function public.admin_submit_live_venue_revision(',
  'function public.admin_review_live_venue_revision(',
  'security definer',
  'set search_path = public',
  "old_venue.source is distinct from 'd8_admin'",
  "old_venue.listing_status <> 'live'",
  'old_venue.updated_at is distinct from p_expected_updated_at',
  "'description', old_venue.description, next_description",
  "'low', true, false, 'admin_live_edit'",
  'insert into public.venue_live_revisions',
  "'admin_live_revision', 'open'",
  'to_jsonb(venue) -> baseline.key is distinct from revision.previous_values -> baseline.key',
  "decision not in ('approved', 'rejected')",
  "'admin_live_revision_approved'",
  "'live_revision_status', 'pending', 'rejected'",
  'revoke all on function public.admin_submit_live_venue_revision(uuid, jsonb, timestamptz)',
  'revoke all on function public.admin_review_live_venue_revision(uuid, text, text)',
]) requireText(value);

const submitUpdate = migration.slice(migration.indexOf('if description_changed then'), migration.indexOf('if proposed_values_value <>'));
for (const forbidden of ['name =', 'city =', 'category =', 'area =', 'address =', 'price_tier =', 'avg_cost_pp =', 'cover_image =', 'vibes =']) {
  if (submitUpdate.includes(forbidden)) throw new Error(`Submission must not apply high-risk field: ${forbidden}`);
}

console.log('Phase 4 admin live venue revision migration contract checks passed.');

for (const value of [
  'function public.protect_pending_live_revision_task()',
  "revision.status = 'pending'",
  'before update or delete on public.venue_reverification_tasks',
  'Pending live revision must be approved or rejected through revision review',
]) {
  if (!taskProtection.includes(value)) throw new Error(`Missing live-revision task protection: ${value}`);
}
