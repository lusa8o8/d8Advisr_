import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function source(relativePath) {
  return readFile(resolve(root, relativePath), 'utf8');
}

const [hooks, home, map, venueData, partnerHook, eventEditor, productionSmoke] = await Promise.all([
  source('artifacts/d8advisr/src/hooks/useVenues.ts'),
  source('artifacts/d8advisr/src/pages/HomeDiscovery.tsx'),
  source('artifacts/d8advisr/src/pages/MapView.tsx'),
  source('artifacts/d8advisr-partner/src/features/partner/partnerVenueData.ts'),
  source('artifacts/d8advisr-partner/src/hooks/usePartner.ts'),
  source('artifacts/d8advisr-partner/src/pages/PartnerEventEditor.tsx'),
  source('scripts/production-readonly-smoke.mjs'),
]);

assert(hooks.includes('export function useVenues(regionId?: string)'), 'Venue hook must accept a canonical region id');
assert(hooks.includes('export function useEvents(regionId?: string'), 'Event hook must accept a canonical region id');
assert((hooks.match(/query\.eq\('region_id', regionId\)/g) ?? []).length === 2, 'Venue and event feeds must both filter by region_id');
assert(!hooks.includes("query.eq('city', city)"), 'Consumer discovery must not filter by display city');
assert(home.includes('useVenues(activeRegion.id)'), 'Home venue feed must use activeRegion.id');
assert(home.includes('useEvents(activeRegion.id, 6)'), 'Home event feed must use activeRegion.id');
assert(map.includes('useVenues(activeRegion.id)'), 'Map venue feed must use activeRegion.id');

assert(venueData.includes('fetchVenueOptions(userId: string, regionId: string)'), 'Partner venue picker must require a canonical region id');
assert(venueData.includes(".eq('region_id', regionId)"), 'Partner venue picker must filter by region_id');
assert(!venueData.includes("query.eq('city', city)"), 'Partner venue picker must not filter by display city');
assert(partnerHook.includes('fetchVenueOptions(userId, application.region_id)'), 'Partner loader must pass application.region_id');
assert(partnerHook.includes('if (application.region_id)'), 'Partner loader must safely handle a missing legacy region id');
assert(eventEditor.includes("useListingReferences('event', profile?.region_id ?? undefined)"), 'Partner event references must use profile.region_id');
assert(eventEditor.includes('regions.find(r => r.id === profile?.region_id)'), 'Partner event currency must resolve from profile.region_id');

assert(productionSmoke.includes('canonical Lusaka venue feed'), 'Production smoke must exercise the canonical venue predicate');
assert(productionSmoke.includes('canonical upcoming Lusaka events'), 'Production smoke must exercise the canonical event predicate');
assert(productionSmoke.includes('region_id=eq.lusaka'), 'Production smoke must filter inventory by canonical region_id');

console.log('Phase 4.7A client geography contract checks passed.');
