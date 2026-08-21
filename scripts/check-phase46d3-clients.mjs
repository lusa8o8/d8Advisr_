import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const failures = [];

function requireText(path, fragments, label) {
  const source = read(path);
  for (const fragment of fragments) {
    if (!source.includes(fragment)) failures.push(`${label}: missing ${fragment} in ${path}`);
  }
}

requireText('artifacts/d8advisr/src/features/admin/adminListingData.ts', [
  "supabase.rpc('admin_apply_event_revision_v11'",
  "supabase.rpc('admin_cancel_event_v11'",
], 'admin v1.1 RPCs');
requireText('artifacts/d8advisr/src/features/admin/AdminEventLiveEdit.tsx', [
  'Confirm material event changes',
  'materialPreview.previous_values',
  'Confirm and apply',
  'Cancel this event?',
  'EVENT_PUBLISHING_POLICY_VERSION',
], 'admin event confirmation UI');
requireText('artifacts/d8advisr/src/features/admin/AdminListingCreate.tsx', [
  'EVENT_PUBLISHING_POLICY_VERSION',
  'EVENT_PUBLISHING_ACKNOWLEDGEMENT',
], 'admin first-publication UI');

for (const forbidden of [
  'cannot be converted to a paid event',
  'Max ${event.currency}',
  'disabled={event.isFree}',
]) {
  if (read('artifacts/d8advisr/src/features/admin/AdminEventLiveEdit.tsx').includes(forbidden)) {
    failures.push(`superseded admin restriction remains: ${forbidden}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Phase 4.6D3 client contract checks passed.');
