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
const types = read('lib/d8-core/src/types.ts');
const eventPolicy = read('lib/d8-core/src/eventPolicy.ts');
const hook = read('artifacts/d8advisr/src/hooks/useConsumerNotifications.ts');
const notifCenter = read('artifacts/d8advisr/src/pages/NotificationsCenter.tsx');
const eventDetail = read('artifacts/d8advisr/src/pages/EventDetail.tsx');
const sharedUI = read('artifacts/d8advisr/src/components/SharedUI.tsx');
const desktopShell = read('artifacts/d8advisr/src/components/DesktopShell.tsx');
const partnerEditor = read('artifacts/d8advisr-partner/src/pages/PartnerEventEditor.tsx');

requireText(d8core, [
  'event_interests:',
  'consumer_notifications:',
], 'd8-core supabase types');

requireText(types, [
  'export interface EventInterest',
  'export interface ConsumerNotification',
], 'd8-core types');

requireText(eventPolicy, [
  'parseEventPriceInput',
], 'event policy');

requireText(hook, [
  'useConsumerNotifications',
  'consumer_notifications',
  'markRead',
  'markAllRead',
  'unreadCount',
], 'useConsumerNotifications hook');

requireText(notifCenter, [
  'useConsumerNotifications',
  'event_rescheduled',
  'event_relocated',
  'event_price_reduced',
  'markAllRead',
], 'NotificationsCenter page');

requireText(eventDetail, [
  'event_interests',
  'toggle_event_interest',
  'useAuth',
], 'EventDetail page');

requireText(sharedUI, [
  'useConsumerNotifications',
  'unreadCount',
], 'SharedUI component');

requireText(desktopShell, [
  'useConsumerNotifications',
  'unreadCount',
], 'DesktopShell component');

requireText(partnerEditor, [
  'effectiveIsFree',
], 'PartnerEventEditor page');

console.log('Phase 4.6C client integration checks passed.');