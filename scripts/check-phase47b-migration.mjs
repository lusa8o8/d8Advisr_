import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migrationPath = resolve(root, 'supabase/migrations/20260824120000_phase47b_country_market_catalog.sql');
const sql = await readFile(migrationPath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const token of [
  'create table public.countries',
  "('NG', 'Nigeria', '002', true)",
  "('ZM', 'Zambia', '002', true)",
  'regions_country_slug_unique unique (country_code, slug)',
  'regions_country_code_fkey foreign key (country_code)',
  'admin_access_assignments_country_code_fkey',
  "('zm-livingstone', 'livingstone', 'Livingstone'",
  "('zm-kitwe', 'kitwe', 'Kitwe'",
  "('zm-ndola', 'ndola', 'Ndola'",
  "('zm-siavonga', 'siavonga', 'Siavonga'",
  'countries_public_active',
  'countries_admin_manage',
]) {
  assert(sql.includes(token), `Phase 4.7B migration is missing: ${token}`);
}

assert((sql.match(/'Africa\/Lusaka', false\)/g) ?? []).length === 4, 'All four new markets must remain inactive');
assert(!/update\s+public\.(profiles|venues|events)\b/i.test(sql), 'Phase 4.7B must not mutate profiles or listing data');
assert(!/delete\s+from\s+public\./i.test(sql), 'Phase 4.7B must not delete public data');
assert(!/drop\s+(table|column|constraint)\b/i.test(sql), 'Phase 4.7B must remain additive');
assert(sql.includes('raise exception \'Phase 4.7B refused:'), 'Live-data contradictions must abort transactionally');

console.log('Phase 4.7B additive migration contract checks passed.');
