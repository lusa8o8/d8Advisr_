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

requireText('artifacts/d8advisr/src/features/admin/adminEventProvenanceData.ts', [
  "supabase.rpc('admin_replace_event_provenance'",
  "p_expected_updated_at: expectedUpdatedAt",
  "p_request_key: requestKey",
  "p_mark_as_import: markAsImport",
  ".from('event_sources')",
  ".from('event_action_links')",
], 'admin provenance data boundary');

requireText('artifacts/d8advisr/src/features/admin/AdminEventProvenanceEditor.tsx', [
  'Imported events need at least one evidence source before saving.',
  'Only verified sources can be public or primary.',
  'Events can have at most 10 evidence sources.',
  'Events can have at most 5 external actions.',
  'Internal verification note (never public)',
  'Last checked',
  'Primary consumer action',
  "rel=\"noopener noreferrer\"",
], 'admin provenance editor');

requireText('artifacts/d8advisr/src/features/admin/AdminListingCreate.tsx', [
  'event-provenance',
  'validateEventProvenanceDraft(eventProvenance)',
  "eventProvenance.isImported ? 'draft' : publicationStatus",
  "attachProvenance ? 'draft' : requestedPublication",
  'replaceAdminEventProvenance(',
  'if (requestedPublication === \'live\') await publishAdminEvent(id)',
  'await onEventCreated(id)',
], 'admin event create integration');

requireText('artifacts/d8advisr/src/pages/AdminPanel.tsx', [
  '<AdminEventProvenanceManager',
  "['d8_admin', 'import'].includes(selectedEvent.source ?? '')",
  "selectedEvent.source === 'import' ? 'Researched import'",
  'onEventCreated={async id =>',
], 'admin event detail integration');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('PASS Phase 4.8A admin provenance client contract');
