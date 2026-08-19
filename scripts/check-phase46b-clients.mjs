import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const requireText = (source, values, label) => {
  for (const value of values) {
    if (!source.includes(value)) throw new Error(`Missing ${label}: ${value}`);
  }
};

const d8core = read('lib/d8-core/src/supabase.ts');
const partnerEventData = read('artifacts/d8advisr-partner/src/features/partner/partnerEventData.ts');
const partnerModels = read('artifacts/d8advisr-partner/src/features/partner/partnerModels.ts');
const partnerEditor = read('artifacts/d8advisr-partner/src/pages/PartnerEventEditor.tsx');
const adminModel = read('artifacts/d8advisr/src/features/admin/adminListingModel.ts');
const adminData = read('artifacts/d8advisr/src/features/admin/adminListingData.ts');
const adminPanel = read('artifacts/d8advisr/src/pages/AdminPanel.tsx');

requireText(d8core, [
  'event_revisions:',
  'status: \'applied\' | \'pending\' | \'approved\' | \'rejected\' | \'blocked\' | \'cancelled\'',
], 'd8-core supabase types');

requireText(partnerModels, [
  'export interface PartnerEventRevision',
  'updatedAt: row.updated_at',
], 'partner models');

requireText(partnerEventData, [
  'partner_submit_event_revision',
  'fetchPartnerEventPendingRevision',
], 'partner event data');

requireText(partnerEditor, [
  'fetchPartnerEventLatestRevision',
  'latestRevision',
  'Sensitive revision in review',
  'Previous revision was not accepted',
], 'partner event editor');

requireText(adminModel, [
  'export interface AdminEventLiveRevision',
  'adminEventLiveRevisionFromRow',
], 'admin listing model');

requireText(adminData, [
  'fetchPendingEventLiveRevisions',
  'reviewAdminLiveEventRevision',
  'admin_review_event_revision',
], 'admin listing data');

requireText(adminPanel, [
  'liveEventRevisions',
  'loadLiveEventRevisions',
  'handleReviewEventRevision',
  'Event sensitive revisions',
  'Approve revision',
  'Reject event revision',
], 'admin panel');

console.log('Phase 4.6B client integration checks passed.');