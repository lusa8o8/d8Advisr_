import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFile(resolve(root, path), 'utf8');
const migration = await read('supabase/migrations/20260824180000_phase47c2a_venue_region_edits.sql');
const adminData = await read('artifacts/d8advisr/src/features/admin/adminListingData.ts');
const draftEditor = await read('artifacts/d8advisr/src/features/admin/AdminVenueDraftEdit.tsx');
const liveEditor = await read('artifacts/d8advisr/src/features/admin/AdminVenueLiveEdit.tsx');
const partnerData = await read('artifacts/d8advisr-partner/src/features/partner/partnerVenueData.ts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const token of [
  'create or replace function public.enforce_partner_venue_region_scope()',
  'partner_venue_region_mismatch',
  'partner_venue_region_change_not_allowed',
  'admin_update_draft_venue_phase47c1_core',
  'admin_submit_live_venue_revision_phase47c1_core',
  "jsonb_build_object('region_id', old_venue.region_id)",
  "jsonb_build_object('region_id', selected_region_id)",
  "field_name, old_value, new_value, risk_level",
  "p_payload - 'region_id'",
]) assert(migration.includes(token), `Phase 4.7C2A migration is missing: ${token}`);

assert(adminData.includes('region_id: input.regionId'), 'Admin venue edits must submit region_id');
assert(adminData.includes('category,city,region_id,area'), 'Admin venue reads must include region_id');
for (const [name, source] of [['draft', draftEditor], ['live', liveEditor]]) {
  assert(source.includes('regionId: venue.regionId'), `${name} venue editor must initialize the canonical ID`);
  assert(source.includes('value={item.id}'), `${name} venue editor options must use IDs, not names`);
  assert(source.includes('Physical city / locality'), `${name} venue editor must keep physical locality separate`);
  assert(!source.includes("item.name === draft.city || item.id === draft.city"), `${name} venue editor must not infer market from city`);
}
assert(partnerData.includes('region_id: application.region_id'), 'Partner venue writes must carry approved region_id');
assert(partnerData.includes(".select('id,name,region_id,"), 'Partner venue reads must retain canonical scope');

console.log('Phase 4.7C2A venue region edit contract checks passed.');
