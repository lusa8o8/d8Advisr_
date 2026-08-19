import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const requireText = (source, values, label) => {
  for (const value of values) if (!source.includes(value)) throw new Error(`Missing ${label}: ${value}`);
};
const forbidText = (source, values, label) => {
  for (const value of values) if (source.includes(value)) throw new Error(`Forbidden ${label}: ${value}`);
};

const policyDoc = read('docs/policies/partner-event-publishing-policy-v1.0.md');
const policy = read('lib/d8-core/src/eventPolicy.ts');
const legal = read('lib/d8-core/src/legal.tsx');
const partnerRoutes = read('artifacts/d8advisr-partner/src/App.tsx');
const consumerRoutes = read('artifacts/d8advisr/src/App.tsx');
const partnerData = read('artifacts/d8advisr-partner/src/features/partner/partnerEventData.ts');
const partnerEditor = read('artifacts/d8advisr-partner/src/pages/PartnerEventEditor.tsx');
const dashboard = read('artifacts/d8advisr-partner/src/pages/PartnerDashboard.tsx');
const adminData = read('artifacts/d8advisr/src/features/admin/adminListingCreationData.ts');
const adminCreate = read('artifacts/d8advisr/src/features/admin/AdminListingCreate.tsx');
const migration = read('supabase/migrations/20260818100000_event_commercial_foundation.sql');
const hash = createHash('sha256').update(policyDoc).digest('hex');

requireText(policy, [hash, "EVENT_PUBLISHING_POLICY_ID = 'partner-event-publishing-v1.0'", "EVENT_PUBLISHING_POLICY_VERSION = '1.0'", 'parseEventPriceInput', 'parseEventCapacityInput', 'EVENT_EMOJI_OPTIONS', 'canPublishedPriceChange'], 'shared event policy');
requireText(migration, [hash], 'database policy hash');
requireText(legal, ['PartnerPoliciesPage', 'EventPublishingPolicyPage', 'EVENT_PUBLISHING_ACKNOWLEDGEMENT'], 'public policy pages');
for (const routes of [partnerRoutes, consumerRoutes]) requireText(routes, ['/partner-policies', '/partner-policies/event-publishing'], 'public policy routes');

requireText(partnerData, [
  'parseEventPriceInput(eventData.price, eventData.isFree)',
  "event_status: 'draft'",
  "supabase.rpc('publish_event_with_policy'",
  'EVENT_PUBLISHING_POLICY_ID',
  'EVENT_PUBLISHING_POLICY_VERSION',
], 'partner publication integration');
forbidText(partnerData, [
  "event_status: eventData.publishNow ? 'live' : 'draft'",
  ".update({ event_status: 'live'",
], 'direct partner publication');
requireText(partnerEditor, ['Confirm event publication', 'EVENT_PUBLISHING_ACKNOWLEDGEMENT', 'canPublishedPriceChange', 'Review and publish'], 'partner publication confirmation');
requireText(dashboard, ['Review &amp; publish', 'Review &amp; resume'], 'dashboard publication routing');
requireText(adminData, ['policy_id: EVENT_PUBLISHING_POLICY_ID', 'policy_acknowledged: Boolean(input.policyAcknowledged)', 'throw new Error(error.message)'], 'admin publication payload');
requireText(adminCreate, ['parseEventPriceInput(event.price, event.isFree)', 'parseEventCapacityInput(event.capacity)', 'EVENT_EMOJI_OPTIONS', 'selectedRegion?.currency_code ?? event.currency', 'Confirm event publication', 'EVENT_PUBLISHING_ACKNOWLEDGEMENT'], 'admin publication confirmation');

console.log('Phase 4.6A client and policy contract checks passed.');
