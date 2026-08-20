import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const failures = [];

function requireText(path, fragment, label) {
  if (!read(path).includes(fragment)) failures.push(`${label}: missing ${fragment} in ${path}`);
}

requireText('artifacts/d8advisr-partner/src/features/partner/partnerEventData.ts', "supabase.rpc('partner_apply_event_revision_v11'", 'partner v1.1 revision RPC');
requireText('artifacts/d8advisr-partner/src/pages/PartnerEventEditor.tsx', 'Confirm material event changes', 'material before/after confirmation');
requireText('artifacts/d8advisr-partner/src/pages/PartnerEventEditor.tsx', 'pendingMaterialInputRef', 'confirmed revision media reuse');
requireText('artifacts/d8advisr-partner/src/features/partner/partnerEventData.ts', "supabase.rpc('partner_cancel_event_v11'", 'partner cancellation RPC');
requireText('artifacts/d8advisr-partner/src/pages/PartnerDashboard.tsx', 'Confirm cancellation', 'strong cancellation confirmation');
requireText('artifacts/d8advisr/src/pages/AdminPanel.tsx', 'Event change history', 'admin read-only event history');
requireText('artifacts/d8advisr/src/pages/EventDetail.tsx', 'This event has been cancelled', 'consumer cancellation state');
requireText('artifacts/d8advisr/src/hooks/useVenues.ts', ".in('event_status', ['live', 'cancelled'])", 'recent cancellation discovery');
requireText('artifacts/d8advisr/src/pages/NotificationsCenter.tsx', "n.type === 'event_price_changed'", 'price change notification UI');
requireText('lib/d8-core/src/legal.tsx', 'D8 does not routinely pre-review event publication or edits', 'public v1.1 policy');

for (const [path, forbidden, label] of [
  ['artifacts/d8advisr/src/pages/AdminPanel.tsx', 'admin_review_event_revision', 'retired admin review RPC'],
  ['artifacts/d8advisr/src/pages/AdminPanel.tsx', 'Event sensitive revisions', 'retired event review queue'],
  ['artifacts/d8advisr-partner/src/pages/PartnerDashboard.tsx', '⏳ In review', 'retired partner event review badge'],
  ['lib/d8-core/src/legal.tsx', 'A published free event cannot later become paid', 'superseded permanent free lock'],
  ['lib/d8-core/src/legal.tsx', 'More than 72 hours before start', 'superseded time threshold'],
]) {
  if (read(path).includes(forbidden)) failures.push(`${label}: forbidden text remains in ${path}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Phase 4.6D2 client contract checks passed.');
