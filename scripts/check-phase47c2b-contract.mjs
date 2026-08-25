import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFile(resolve(root, path), 'utf8');
const migration = await read('supabase/migrations/20260824200000_phase47c2b_event_region_edits.sql');
const triggerOrderRepair = await read('supabase/migrations/20260825110000_fix_event_venue_region_trigger_order.sql');
const adminData = await read('artifacts/d8advisr/src/features/admin/adminListingData.ts');
const adminModel = await read('artifacts/d8advisr/src/features/admin/adminListingModel.ts');
const draftEditor = await read('artifacts/d8advisr/src/features/admin/AdminEventDraftEdit.tsx');
const liveEditor = await read('artifacts/d8advisr/src/features/admin/AdminEventLiveEdit.tsx');
const partnerData = await read('artifacts/d8advisr-partner/src/features/partner/partnerEventData.ts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const token of [
  'create or replace function public.enforce_partner_event_region_scope()',
  'partner_event_region_mismatch',
  'partner_event_region_change_not_allowed',
  'create or replace function public.enforce_event_venue_region_scope()',
  'event_venue_must_belong_to_selected_market',
  'admin_update_draft_event_phase47c1_core',
  'admin_apply_event_revision_v11_phase47c1_core',
  "array_append(combined_material, 'region_id')",
  "jsonb_build_object('region_id', old_event.region_id)",
  "jsonb_build_object('region_id', selected_region_id)",
  'partner_apply_event_revision_v11_phase47c1_core',
  "p_payload - 'region_id'",
]) assert(migration.includes(token), `Phase 4.7C2B migration is missing: ${token}`);

assert(adminData.includes(".select('id,region_id,venue_id"), 'Admin event reads must include region_id');
assert(adminModel.includes('regionId: row.region_id'), 'Admin event model must retain canonical region_id');
for (const [name, source] of [['draft', draftEditor], ['live', liveEditor]]) {
  assert(source.includes('regionId: event.regionId'), `${name} event editor must initialize region_id`);
  assert(source.includes('region_id: draft.regionId'), `${name} event editor must submit region_id`);
  assert(source.includes('value={item.id}'), `${name} event editor options must use IDs`);
  assert(source.includes('Physical city / locality'), `${name} event editor must keep locality separate`);
  assert(!source.includes("item.name === draft.city || item.id === draft.city"), `${name} event editor must not infer market from city`);
}
assert(partnerData.includes(".select('event_status, updated_at, region_id')"), 'Partner live edits must read current canonical scope');
assert(partnerData.includes('region_id: application.region_id'), 'Partner event writes must carry approved region_id');

assert(triggerOrderRepair.includes('drop trigger if exists "01_enforce_event_venue_region_scope"'), 'The premature cross-market trigger must be removed');
assert(triggerOrderRepair.includes('create trigger "c_enforce_event_venue_region_scope"'), 'The cross-market guard must run after canonical a_/b_ triggers');
assert(triggerOrderRepair.indexOf('drop trigger if exists "01_enforce_event_venue_region_scope"') < triggerOrderRepair.indexOf('create trigger "c_enforce_event_venue_region_scope"'), 'The replacement guard must be ordered after removal');

console.log('Phase 4.7C2B event region edit contract checks passed.');
