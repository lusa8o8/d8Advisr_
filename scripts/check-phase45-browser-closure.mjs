import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');
const eventData = read('artifacts/d8advisr-partner/src/features/partner/partnerEventData.ts');
const eventModel = read('artifacts/d8advisr-partner/src/features/partner/partnerModels.ts');
const eventEditor = read('artifacts/d8advisr-partner/src/pages/PartnerEventEditor.tsx');
const venueEditor = read('artifacts/d8advisr-partner/src/pages/PartnerVenueEditor.tsx');
const eventDetail = read('artifacts/d8advisr/src/pages/EventDetail.tsx');
const venueDetail = read('artifacts/d8advisr/src/pages/VenueDetails.tsx');

const requireText = (source, values, label) => {
  for (const value of values) {
    if (!source.includes(value)) throw new Error(`Missing ${label}: ${value}`);
  }
};

requireText(eventModel, [
  'description: String(row.description',
  'startsAt: row.starts_at',
  'priceAmount: pricePp',
  'vibes: Array.isArray(row.vibes)',
], 'event edit model field');
requireText(eventData, [
  'vibes: eventData.vibes',
  "insert({ ...payload, spots_filled: 0, created_at: now })",
], 'event persistence contract');
if (eventData.includes('spots_total: spotsTotal, spots_filled: 0')) {
  throw new Error('Event edits must not reset existing attendance.');
}
requireText(eventEditor, [
  'loading || referencesLoading || !profile',
  ":v2`",
  'localSchedule(existing.startsAt)',
  'setDesc(existing.description)',
  'setSelectedVibes(existing.vibes)',
  'vibeOptions.map',
  'vibes: selectedVibes',
], 'event editor recovery contract');
requireText(eventDetail, [
  'hasCapacity: spotsTotal > 0',
  'const hasCapacity = event.hasCapacity !== false',
  'No attendance limit has been set for this event.',
], 'consumer open-attendance contract');
requireText(venueDetail, [
  'hasCapacity: event.spots_total > 0',
  "event.hasCapacity === false ? 'Open attendance'",
], 'venue event open-attendance contract');
requireText(venueEditor, [
  'const movePhoto =',
  'const makeCover =',
  'Make cover',
  'ChevronLeft',
  'ChevronRight',
], 'partner venue cover contract');

console.log('Phase 4.5 browser closure contract checks passed.');