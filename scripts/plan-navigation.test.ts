import assert from 'node:assert/strict';
import {
  createPlanGeneratorPath,
  getPlanGeneratorReturnPath,
  normalizePlanReturnPath,
} from '../artifacts/d8advisr/src/lib/planNavigation.ts';

assert.equal(
  createPlanGeneratorPath('/map'),
  '/plan/generate?returnTo=%2Fmap',
  'Map-origin Surprise Me must preserve Map as its return destination',
);

const anchorParams = new URLSearchParams({ venueId: 'venue-1', venueName: 'D8 Cinema' });
const anchoredPath = createPlanGeneratorPath('/venue/venue-1', anchorParams);
const anchoredSearch = anchoredPath.slice(anchoredPath.indexOf('?'));
assert.equal(getPlanGeneratorReturnPath(anchoredSearch), '/venue/venue-1');
assert.equal(new URLSearchParams(anchoredSearch).get('venueId'), 'venue-1');

assert.equal(createPlanGeneratorPath('/plans'), '/plan/generate?returnTo=%2Fplans');
assert.equal(getPlanGeneratorReturnPath(''), '/plans', 'Direct entry must fall back to My Plans');

for (const unsafePath of [
  'https://example.com',
  '//example.com',
  '/',
  '/admin',
  '/signin',
  '/plan/generate?returnTo=/map',
]) {
  assert.equal(normalizePlanReturnPath(unsafePath), '/plans', `${unsafePath} must use the safe fallback`);
}

console.log('PASS plan builder preserves safe consumer return destinations');
