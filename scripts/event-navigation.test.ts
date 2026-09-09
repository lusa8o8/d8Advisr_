import assert from 'node:assert/strict';
import {
  createEventDetailPath,
  getEventReturnPath,
  normalizeEventReturnPath,
} from '../artifacts/d8advisr/src/lib/eventNavigation.ts';
import { createPlanGeneratorPath, getPlanGeneratorReturnPath } from '../artifacts/d8advisr/src/lib/planNavigation.ts';

const eventFromHome = createEventDetailPath('event-1', '/home');
assert.equal(eventFromHome, '/event/event-1?returnTo=%2Fhome');
assert.equal(getEventReturnPath(eventFromHome.slice(eventFromHome.indexOf('?'))), '/home');

const eventFromVenue = createEventDetailPath('event-1', '/venue/venue-1');
assert.equal(getEventReturnPath(eventFromVenue.slice(eventFromVenue.indexOf('?'))), '/venue/venue-1');

const generatorPath = createPlanGeneratorPath(eventFromHome);
assert.equal(
  getPlanGeneratorReturnPath(generatorPath.slice(generatorPath.indexOf('?'))),
  eventFromHome,
  'Plan builder must return to the event while retaining the event origin',
);

for (const unsafePath of ['https://example.com', '//example.com', '/', '/admin', '/event/other', '/plan/generate']) {
  assert.equal(normalizeEventReturnPath(unsafePath), '/home', `${unsafePath} must use the Home fallback`);
}

console.log('PASS event detail preserves its origin without browser-history loops');
