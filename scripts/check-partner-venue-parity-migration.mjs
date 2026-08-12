import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve(
  import.meta.dirname,
  '../supabase/migrations/20260812170000_partner_venue_detail_parity.sql',
), 'utf8');
const grants = readFileSync(resolve(
  import.meta.dirname,
  '../supabase/migrations/20260812171000_grant_venue_contact_columns.sql',
), 'utf8');
const reviewOrder = readFileSync(resolve(
  import.meta.dirname,
  '../supabase/migrations/20260812172000_fix_partner_venue_review_order.sql',
), 'utf8');
const websiteValidation = readFileSync(resolve(
  import.meta.dirname,
  '../supabase/migrations/20260812173000_validate_venue_website_urls.sql',
), 'utf8');
const revisionWebsiteValidation = readFileSync(resolve(
  import.meta.dirname,
  '../supabase/migrations/20260812174000_validate_venue_revision_website_urls.sql',
), 'utf8');
const partnerEditor = readFileSync(resolve(
  import.meta.dirname,
  '../artifacts/d8advisr-partner/src/pages/PartnerVenueEditor.tsx',
), 'utf8');
const adminPanel = readFileSync(resolve(
  import.meta.dirname,
  '../artifacts/d8advisr/src/pages/AdminPanel.tsx',
), 'utf8');
const adminReview = readFileSync(resolve(
  import.meta.dirname,
  '../artifacts/d8advisr/src/features/admin/AdminVenueLiveEdit.tsx',
), 'utf8');

for (const value of [
  'add column if not exists contact_phone text',
  'add column if not exists website_url text',
  "'price_tier','avg_cost_pp','vibes','contact_phone','website_url'",
  'vibes_must_be_array',
  'average_cost_must_be_number',
  'invalid_price_tier',
  "field_name, old_value, new_value, risk_level",
  "'partner_live_revision_approved'",
  "'partner_live_revision_status'",
  "contact_phone = case when revision.proposed_values ? 'contact_phone'",
  "website_url = case when revision.proposed_values ? 'website_url'",
]) {
  if (!sql.includes(value)) throw new Error(`Missing partner venue parity contract: ${value}`);
}
for (const [source, value] of [
  [adminPanel, '|| selectedPendingLiveRevision) && ('],
  [adminPanel, 'Partner changes are awaiting review below'],
  [adminReview, "field === 'images'"],
  [adminReview, 'Proposed venue photo'],
  [adminReview, 'PRICE_LABELS'],
]) {
  if (!source.includes(value)) {
    throw new Error(`Missing admin partner revision presentation: ${value}`);
  }
}
const revisionUpdate = reviewOrder.indexOf('update public.venue_live_revisions set');
const taskUpdate = reviewOrder.indexOf('update public.venue_reverification_tasks');
if (revisionUpdate < 0 || taskUpdate < 0 || revisionUpdate > taskUpdate) {
  throw new Error('Partner revision must be resolved before its protected task.');
}
if (!websiteValidation.includes('venues_website_url_scheme')
  || !websiteValidation.includes("'^https?://[^[:space:]]+$'")) {
  throw new Error('Venue website URLs must be constrained to HTTP/HTTPS.');
}
if (!revisionWebsiteValidation.includes('venue_live_revisions_website_url_scheme')
  || !revisionWebsiteValidation.includes("proposed_values ? 'website_url'")
  || !revisionWebsiteValidation.includes(') not valid;')) {
  throw new Error('Pending venue revisions must reject unsafe website URLs.');
}
for (const value of [
  'Choose venue type',
  'Area not listed',
  'vibeOptions.map',
  'vibes: selectedVibes',
  'priceTier: priceTier || undefined',
  'const cityId                      = selectedRegion?.id',
  'normalizedRegionValue(region.name) === profileRegionValue',
]) {
  if (!partnerEditor.includes(value)) {
    throw new Error(`Missing controlled partner venue field: ${value}`);
  }
}

if (sql.includes('description = case when revision.proposed_values')) {
  throw new Error('Description must remain an immediate low-risk partner update.');
}
for (const value of [
  'grant select (contact_phone, website_url)',
  'grant insert (contact_phone, website_url)',
  'grant update (contact_phone, website_url)',
]) {
  if (!grants.includes(value)) throw new Error(`Missing explicit venue contact grant: ${value}`);
}

console.log('Partner venue parity migration contract checks passed.');
