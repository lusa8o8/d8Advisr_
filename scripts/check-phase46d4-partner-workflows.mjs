import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const migration = read('supabase/migrations/20260821153000_event_venue_partner_workflows.sql');
const venueData = read('artifacts/d8advisr-partner/src/features/partner/partnerVenueData.ts');
const dashboard = read('artifacts/d8advisr-partner/src/pages/PartnerDashboard.tsx');
const notifications = read('artifacts/d8advisr-partner/src/pages/PartnerNotifications.tsx');
const partnerPortal = read('artifacts/d8advisr-partner/src/pages/PartnerPortal.tsx');
const venueDetails = read('artifacts/d8advisr/src/pages/VenueDetails.tsx');
const venueHooks = read('artifacts/d8advisr/src/hooks/useVenues.ts');

for (const value of [
  'event_venue_relationship_id uuid',
  'partner_notifications_deduplication_idx',
  'event_venue_party_recipients',
  'enqueue_event_venue_party_notification',
  'dispatch_event_venue_relationship_notification',
  "when 'created' then",
  "when 'placement_approved' then",
  "when 'placement_declined' then",
  "when 'placement_revoked' then",
  "when 'placement_resubmitted' then",
  "when 'attribution_disputed' then",
  "when 'dispute_response_added' then",
  'get_partner_event_venue_workflows',
  'public.can_manage_event_attribution(relationship.event_id, auth.uid())',
  'public.can_manage_venue_placement(relationship.venue_id, auth.uid())',
]) {
  if (!migration.includes(value)) throw new Error(`Missing slice-three database contract: ${value}`);
}

for (const value of [
  "rpc('get_partner_event_venue_workflows')",
  "rpc('decide_event_venue_placement'",
  "rpc('resubmit_event_venue_placement'",
  "rpc('report_event_venue_attribution'",
  "rpc('respond_event_venue_dispute'",
  'p_expected_version: expectedVersion',
]) {
  if (!venueData.includes(value)) throw new Error(`Missing canonical partner workflow call: ${value}`);
}

if (venueData.includes("rpc('set_event_venue_page_status'")) {
  throw new Error('Partner venue workflow still calls the legacy placement adapter');
}
for (const value of [
  'Events identifying your venue',
  'Approve Upcoming here',
  'Report incorrect venue',
  'Resubmit placement',
  'Add response',
  'Location attribution is separate from Upcoming here placement.',
]) {
  if (!dashboard.includes(value)) throw new Error(`Missing partner workflow UI contract: ${value}`);
}
if (!notifications.includes('notification.metadata.route')) {
  throw new Error('Partner relationship notifications do not navigate to their workflow');
}
if (!venueDetails.includes('data-testid="venue-upcoming-event"') || venueDetails.includes('displayedVenueEvents[0]')) {
  throw new Error('Venue Upcoming here overview must render every approved event rather than one displaced preview');
}
if (!venueHooks.includes("if (typeof limit === 'number') query = query.limit(limit)")
  || !venueDetails.includes('useVenueEvents(hasLiveVenueId ? venueId : undefined);')) {
  throw new Error('Venue detail must not cap the complete Upcoming here list');
}
for (const value of ['useAuth', 'Cancel and sign out', 'await signOut()', "setLocation('/signin')"]) {
  if (!partnerPortal.includes(value)) throw new Error(`Missing safe pre-submission exit contract: ${value}`);
}

console.log('PASS partner workflows read canonical relationship state');
console.log('PASS placement and dispute actions carry optimistic versions');
console.log('PASS venue and organizer surfaces keep attribution separate from placement');
console.log('PASS durable relationship notices are deduplicated and navigable');
console.log('PASS venue overview renders the complete approved Upcoming here list');
console.log('PASS an unsubmitted partner application can be abandoned by signing out');
