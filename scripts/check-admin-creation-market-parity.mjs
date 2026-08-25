import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFile(resolve(root, path), 'utf8');
const adminCreate = await read('artifacts/d8advisr/src/features/admin/AdminListingCreate.tsx');
const adminData = await read('artifacts/d8advisr/src/features/admin/adminListingCreationData.ts');
const partnerVenue = await read('artifacts/d8advisr-partner/src/pages/PartnerVenueEditor.tsx');
const migration = await read('supabase/migrations/20260825100000_admin_creation_market_contact_parity.sql');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const token of [
  "regionId: 'lusaka', city: 'Lusaka'",
  "item.regionId === event.regionId",
  "regionId: e.target.value",
  "venueId: ''",
  'Discovery market',
  'Physical city / locality',
  'WhatsApp / phone',
  'No live D8 venues are available in this market',
]) assert(adminCreate.includes(token), `Admin creation market parity is missing: ${token}`);

for (const token of ['contactPhone?: string', 'websiteUrl?: string', 'contact_phone:', 'website_url:']) {
  assert(adminData.includes(token), `Admin creation contact payload is missing: ${token}`);
}

for (const token of [
  'profile?.region_id ?? profile?.city',
  'defaultCallingCode',
  'selectedRegion?.country?.calling_code',
]) assert(partnerVenue.includes(token), `Partner venue phone prefix is missing: ${token}`);

for (const token of [
  'create or replace function public.admin_create_venue(p_payload jsonb)',
  'contact_phone = contact_phone_value',
  'website_url = website_url_value',
  'invalid_venue_website_url',
  'if existing_venue_id is not null then return existing_venue_id',
]) assert(migration.includes(token), `Admin venue contact migration is missing: ${token}`);

console.log('Admin creation market/contact parity checks passed.');
