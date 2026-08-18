import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const requireText = (source, values, label) => {
  for (const value of values) {
    if (!source.includes(value)) throw new Error(`Missing ${label}: ${value}`);
  }
};
const forbidText = (source, values, label) => {
  for (const value of values) {
    if (source.includes(value)) throw new Error(`Forbidden ${label}: ${value}`);
  }
};

const migration = read('supabase/migrations/20260813100000_event_attendance_and_free_entry_contract.sql');
const supabaseTypes = read('lib/d8-core/src/supabase.ts');
const partnerData = read('artifacts/d8advisr-partner/src/features/partner/partnerEventData.ts');
const partnerEditor = read('artifacts/d8advisr-partner/src/pages/PartnerEventEditor.tsx');
const partnerDashboard = read('artifacts/d8advisr-partner/src/pages/PartnerDashboard.tsx');
const eventDetail = read('artifacts/d8advisr/src/pages/EventDetail.tsx');
const venueDetail = read('artifacts/d8advisr/src/pages/VenueDetails.tsx');
const discovery = read('artifacts/d8advisr/src/pages/HomeDiscovery.tsx');

requireText(migration, [
  'events_spots_total_nonnegative',
  'events_spots_filled_nonnegative',
  'events_filled_within_capacity',
  'events_price_pp_nonnegative',
  'events_free_entry_price_zero',
  'new.spots_filled := old.spots_filled',
  'new.spots_left := null',
  'new.price_pp := 0',
  "raise exception 'Event capacity cannot be lower than preserved registrations'",
], 'database attendance invariant');

const clientSelect = supabaseTypes.match(/export const EVENT_CLIENT_SELECT = '([^']+)'/)?.[1];
if (!clientSelect) throw new Error('EVENT_CLIENT_SELECT was not found.');
forbidText(clientSelect, ['capacity', 'spots_left'], 'legacy event client field');

requireText(partnerData, [
  "throw new Error('Attendance limit must be a whole number greater than zero')",
  "insert({ ...payload, event_status: 'draft', spots_filled: 0, created_at: now })",
], 'partner event persistence contract');
const updateBranch = partnerData.slice(partnerData.indexOf('if (editId)'), partnerData.indexOf('} else {', partnerData.indexOf('if (editId)')));
forbidText(updateBranch, ['spots_filled'], 'partner edit attendance reset');

requireText(partnerEditor, [
  'No mandatory entry fee. Food, drinks and other costs may still apply.',
  'No maximum attendance has been listed. This is not a reservation count.',
], 'partner event copy');
requireText(partnerDashboard, [
  "'Maximum attendance, not live availability'",
  "'No listed attendance limit'",
], 'partner dashboard copy');
requireText(eventDetail, [
  'This is a maximum, not live availability.',
  "? 'Free entry'",
], 'consumer event copy');
requireText(venueDetail, ["'Limited capacity'", "'Open attendance'"], 'venue event copy');
requireText(discovery, ["price: ev.is_free ? 'Free entry'", 'urgency: null'], 'discovery event copy');

forbidText([partnerDashboard, eventDetail, venueDetail, discovery].join('\n'), [
  'spots taken',
  'spots open',
  'Only ${event.spotsLeft} left',
  'event.spots_left',
  'ev.spots_left',
], 'unsupported attendance claim');

console.log('Event attendance and free-entry contract checks passed.');
