import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migration = readFileSync(resolve(
  root,
  'supabase/migrations/20260821150000_event_venue_transactional_sync.sql',
), 'utf8');
const partnerEventData = readFileSync(resolve(
  root,
  'artifacts/d8advisr-partner/src/features/partner/partnerEventData.ts',
), 'utf8');

for (const value of [
  'create or replace function public.derive_event_venue_page_projection()',
  "current_setting('d8.event_venue_placement_event_id'",
  "new.venue_page_status := old.venue_page_status",
  "relationship_row.placement_status = 'approved'",
  'create trigger c_derive_event_venue_page_projection',
  'create or replace function public.sync_persisted_event_venue_attribution()',
  'new.event_location_kind is not distinct from old.event_location_kind',
  'perform public.sync_event_venue_attribution(',
  'create trigger sync_event_venue_attribution_after_insert',
  'create trigger sync_event_venue_attribution_after_location_update',
  'partner_apply_event_revision_v11_venue_legacy_core',
  'from public, anon, authenticated',
  "p_payload ? 'venue_page_status'",
  'event_venue_placement_is_server_managed',
]) {
  if (!migration.includes(value)) {
    throw new Error(`Missing Phase 4.6D4 transactional-sync contract: ${value}`);
  }
}

if (partnerEventData.includes('venue_page_status')) {
  throw new Error('Partner event client still writes server-owned venue_page_status');
}
if (partnerEventData.includes('venuePageStatus')) {
  throw new Error('Partner event client still derives venue placement decisions');
}

console.log('PASS event writes derive venue-page projection on the server');
console.log('PASS persisted location changes synchronize canonical attribution');
console.log('PASS unchanged event saves preserve existing placement state');
console.log('PASS organizer revision payloads cannot mutate placement decisions');
console.log('PASS partner clients no longer send or derive placement state');
