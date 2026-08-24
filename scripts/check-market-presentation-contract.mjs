import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFile(resolve(root, path), 'utf8');
const migration = await read('supabase/migrations/20260824170000_market_presentation_metadata.sql');
const map = await read('artifacts/d8advisr/src/pages/MapView.tsx');
const partner = await read('artifacts/d8advisr-partner/src/pages/PartnerPortal.tsx');
const admin = await read('artifacts/d8advisr/src/pages/AdminPanel.tsx');
const region = await read('lib/d8-core/src/useRegion.ts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const token of [
  'add column calling_code text',
  "when 'NG' then '+234'",
  "when 'ZM' then '+260'",
  'alter column calling_code set not null',
  'add column center_lat double precision',
  "when 'lagos' then 6.5244",
  "when 'lusaka' then -15.3875",
  'regions_live_center_required',
]) assert(migration.includes(token), `Market presentation migration is missing: ${token}`);

assert(region.includes("country:countries(calling_code)"), 'Live market query must include its country calling code');
assert(map.includes('activeRegion.center_lat'), 'Empty map must use the active market center');
assert(!map.includes('DEFAULT_MAP_CENTER'), 'Map must not retain a Lusaka-only empty-market fallback');
assert(map.includes('zoom={activeRegion.default_zoom}'), 'Map zoom must come from market metadata');
assert(partner.includes('const selectRegion = (regionId: string)'), 'Partner application must handle market selection explicitly');
assert(partner.includes('nextCallingCode'), 'Partner application must derive the calling prefix from the selected market');
assert(partner.includes("trimmed && trimmed !== previousCallingCode"), 'Calling prefix autofill must preserve a user-entered number');
assert(admin.includes("if (view === 'submissions') void loadSubmissions()"), 'Admin must refresh submissions when the queue opens');

console.log('Market presentation and submissions refresh contract checks passed.');
