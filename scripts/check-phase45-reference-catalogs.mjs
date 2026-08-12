import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sql = await readFile(resolve(
  import.meta.dirname,
  '../supabase/migrations/20260812130000_listing_reference_catalogs.sql',
), 'utf8');
const requireText = value => {
  if (!sql.includes(value)) throw new Error(`Missing Phase 4.5 reference contract: ${value}`);
};
for (const value of [
  'create table public.region_areas',
  'create table public.listing_categories',
  'create table public.listing_category_aliases',
  'create table public.listing_vibes',
  'create table public.listing_vibe_aliases',
  'create table public.venue_vibes',
  'create table public.event_vibes',
  'add column if not exists region_id text references public.regions',
  'add column if not exists area_id text references public.region_areas',
  'add column if not exists category_id text references public.listing_categories',
  'add column if not exists price_level smallint check (price_level between 1 and 4)',
  'function public.apply_venue_reference_fields()',
  'function public.apply_event_reference_fields()',
  'category_not_valid_for_venue',
  'category_not_valid_for_event',
  'area_not_in_selected_region',
  'new.currency := selected_region.currency_code',
  'create policy public_active_region_areas',
  'create policy admin_region_areas',
  'grant select on public.regions',
  'function public.admin_listing_reference_exceptions()',
  'revoke all on function public.admin_listing_reference_exceptions() from public',
]) requireText(value);
if (sql.includes('grant select on public.profiles to anon')) {
  throw new Error('Phase 4.5 must not expose profiles to anonymous users.');
}
if (sql.includes('postgis')) throw new Error('PostGIS is intentionally outside Phase 4.5.');
for (const legacy of ['Test Venue', 'loud']) {
  if (sql.includes(legacy)) throw new Error(`Intentional exception was incorrectly mapped: ${legacy}`);
}
console.log('Phase 4.5 listing reference catalog contract checks passed.');
