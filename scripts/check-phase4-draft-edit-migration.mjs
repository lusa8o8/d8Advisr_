import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migration = await readFile(
  resolve(root, 'supabase/migrations/20260812110000_admin_draft_venue_editing.sql'),
  'utf8',
);
const conflictCorrection = await readFile(
  resolve(root, 'supabase/migrations/20260812111000_fix_draft_edit_conflict_error.sql'),
  'utf8',
);

function requireText(value, label = value) {
  if (!migration.includes(value)) throw new Error(`Missing draft-edit contract: ${label}`);
}

for (const value of [
  'function public.admin_update_draft_venue(',
  'security definer',
  'set search_path = public',
  'if not public.is_admin_user()',
  "old_venue.source is distinct from 'd8_admin'",
  'old_venue.partner_id is not null',
  "old_venue.listing_status not in ('draft', 'submitted', 'under_review', 'needs_update')",
  'old_venue.is_active',
  'old_venue.updated_at is distinct from p_expected_updated_at',
  "using errcode = '40001'",
  'jsonb_object_keys(p_payload)',
  'insert into public.venue_change_log',
  "'admin_draft_correction'",
  'where change.old_value is distinct from change.new_value',
  'revoke all on function public.admin_update_draft_venue(uuid, jsonb, timestamptz)',
  'grant execute on function public.admin_update_draft_venue(uuid, jsonb, timestamptz)',
]) requireText(value);

for (const forbiddenAssignment of [
  'partner_id =',
  'operator_organization_id =',
  'created_by =',
  'source =',
  'listing_status =',
  'verification_status =',
  'is_active =',
  'tier =',
  'rating =',
]) {
  const updateBody = migration.slice(migration.indexOf('update public.venues'), migration.indexOf('returning * into updated_venue'));
  if (updateBody.includes(`\n    ${forbiddenAssignment}`)) throw new Error(`Draft editor must preserve protected field: ${forbiddenAssignment}`);
}

if (!conflictCorrection.includes("'using errcode = ''40001'''")) {
  throw new Error('Draft editor conflict correction must find the retryable SQLSTATE');
}
if (!conflictCorrection.includes("'using errcode = ''P0001'''")) {
  throw new Error('Draft editor conflict correction must install a non-retryable SQLSTATE');
}

console.log('Phase 4 admin draft venue editing migration contract checks passed.');
