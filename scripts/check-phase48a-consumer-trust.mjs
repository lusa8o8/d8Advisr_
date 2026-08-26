import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const detail = read('artifacts/d8advisr/src/pages/EventDetail.tsx');
const card = read('artifacts/d8advisr/src/features/events/EventTrustCard.tsx');
const data = read('artifacts/d8advisr/src/features/events/eventTrustData.ts');

for (const required of ['loadPublicEventTrust(eventId)', '<EventTrustCard', "event.listingSource === 'import'"]) {
  assert(detail.includes(required), `EventDetail is missing ${required}`);
}
for (const required of ['target="_blank"', 'rel="noopener noreferrer"', 'D8Advisr does not process this transaction', 'Information from', 'Sold out on', 'External ticket or registration details are not available right now', 'className="mt-3 min-w-0"']) {
  assert(card.includes(required), `trust card is missing ${required}`);
}
for (const required of [".from('event_sources')", ".from('event_action_links')", "supabase.rpc('get_public_event_listing_attribution'"]) {
  assert(data.includes(required), `public trust loader is missing ${required}`);
}
assert(!data.includes('internal_note'), 'consumer trust loader must never request internal source notes');
assert(!detail.includes('eventTrust={ALL_EVENTS'), 'legacy fixture routes must not receive fabricated provenance');
for (const required of ['Listed by', 'persistedListingName', "attributionType === 'partner'"]) {
  assert(detail.includes(required), `persisted event attribution is missing ${required}`);
}

console.log('PASS Phase 4.8A consumer trust integration checks');
