import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`Missing ${label}: ${text}`);
};

const migration = read('supabase/migrations/20260825140000_admin_listing_retirement_read_contract.sql');
const model = read('artifacts/d8advisr/src/features/admin/adminListingModel.ts');
const data = read('artifacts/d8advisr/src/features/admin/adminListingData.ts');
const admin = read('artifacts/d8advisr/src/pages/AdminPanel.tsx');
const partnerVenue = read('artifacts/d8advisr-partner/src/features/partner/partnerVenueData.ts');
const partnerEvent = read('artifacts/d8advisr-partner/src/features/partner/partnerEventData.ts');

for (const fragment of [
  'retired_at is null',
  '"Public can view live venues"',
  '"Venue partners can view own venues"',
  '"Public can view live and cancelled event history"',
  '"Partners can view own events"',
]) requireText(migration, fragment, 'retirement-aware RLS');

for (const fragment of ['retiredAt: string | null', "'retired'", 'retirementReason']) {
  requireText(model, fragment, 'admin retirement model');
}

for (const fragment of [
  'retireAdminVenue', 'restoreAdminVenue', 'retireAdminEvent', 'restoreAdminEvent',
  ".is('retired_at', null)", ".is('venues.retired_at', null)",
]) requireText(data, fragment, 'admin retirement data contract');

for (const fragment of [
  "openAdminSection('retired', 'retired')", "view === 'retired'", 'Retired listings',
  'Review and retire', 'Restore to review', 'retirementReason.trim().length < 3',
  'currentVenues', 'currentEvents', 'Upcoming live events must be cancelled first',
]) requireText(admin, fragment, 'admin retirement UI');

requireText(partnerVenue, ".is('retired_at', null)", 'partner venue retirement filter');
requireText(partnerEvent, ".is('retired_at', null)", 'partner event retirement filter');

console.log('PASS admin listing retirement client/read contract');
