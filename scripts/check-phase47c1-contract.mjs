import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFile(resolve(root, path), 'utf8');
const migration = await read('supabase/migrations/20260824150000_phase47c1_canonical_write_foundation.sql');
const profile = await read('lib/d8-core/src/useProfile.ts');
const region = await read('lib/d8-core/src/useRegion.ts');
const onboarding = await read('artifacts/d8advisr/src/pages/InitialPreferences.tsx');
const settings = await read('artifacts/d8advisr/src/pages/Settings.tsx');
const adminData = await read('artifacts/d8advisr/src/features/admin/adminListingCreationData.ts');
const partnerVenue = await read('artifacts/d8advisr-partner/src/features/partner/partnerVenueData.ts');
const partnerEvent = await read('artifacts/d8advisr-partner/src/features/partner/partnerEventData.ts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const token of [
  'add column if not exists region_id text',
  'create or replace function public.resolve_listing_region_id',
  'ambiguous_legacy_region:',
  'unknown_legacy_region:',
  'alter column city drop default',
  'alter table public.venues alter column region_id set not null',
  'alter table public.events alter column region_id set not null',
  'new.currency := selected_region.currency_code',
  "jsonb_build_object('publication_status','draft','city',selected_region_id)",
]) assert(migration.includes(token), `Phase 4.7C1 migration is missing: ${token}`);

assert(!migration.includes('new.city := selected_region.name'), 'Market selection must not overwrite physical city');
assert(migration.includes('if match_count > 1'), 'Legacy display-name ambiguity must fail explicitly');
assert(migration.includes('if exists (select 1 from public.venues where region_id is null)'), 'Venue gaps must abort');
assert(migration.includes('if exists (select 1 from public.events where region_id is null)'), 'Event gaps must abort');

assert(profile.includes('region_id: string | null'), 'Shared consumer profile type must expose region_id');
assert(region.includes('profile?.region_id ?? profile?.city'), 'Region hook must prefer canonical profile region_id');
assert(onboarding.includes('region_id: city'), 'Onboarding must persist canonical region_id');
assert(onboarding.includes('What would you like to explore first?'), 'Onboarding copy must describe discovery selection');
assert(settings.includes("region_id: c.id, city: c.id"), 'Settings must cross the compatibility boundary safely');
assert(adminData.includes('region_id: input.regionId'), 'Admin creation must submit region_id');
assert(partnerVenue.includes('region_id: application.region_id'), 'Partner venue creation must submit region_id');
assert(partnerEvent.includes('region_id: application.region_id'), 'Partner event creation must submit region_id');
assert(!partnerEvent.includes("currency: city === 'Lusaka'"), 'Partner client must not derive event currency from display city');

console.log('Phase 4.7C1 canonical write contract checks passed.');
