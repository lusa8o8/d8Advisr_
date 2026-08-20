import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const failures = [];

function requireText(path, fragment, label) {
  if (!read(path).includes(fragment)) failures.push(`${label}: missing ${fragment} in ${path}`);
}

requireText(
  'lib/d8-core/src/partnerCapabilities.ts',
  "partnerType === 'venue' || partnerType === 'organizer' || partnerType === 'both'",
  'venue event capability',
);
requireText(
  'artifacts/d8advisr-partner/src/features/partner/partnerApplicationData.ts',
  "supabase.rpc('submit_partner_application'",
  'RPC-only application submission',
);
requireText(
  'artifacts/d8advisr-partner/src/pages/PartnerPortal.tsx',
  'Update and resubmit',
  'applicant resubmission',
);
requireText(
  'artifacts/d8advisr-partner/src/pages/PartnerPortal.tsx',
  'profile.review_reason',
  'applicant-visible review reason',
);
requireText(
  'artifacts/d8advisr/src/pages/AdminPanel.tsx',
  "updatePartnerApplicationStatus(sub.id, 'needs_update'",
  'admin needs-update decision',
);
requireText(
  'artifacts/d8advisr/src/pages/AdminPanel.tsx',
  'Reason shown when requesting changes or rejecting',
  'durable reason input',
);

const consumerApp = read('artifacts/d8advisr/src/App.tsx');
if (consumerApp.includes('redirectToPartner(')) {
  failures.push('consumer app still contains a partner-domain redirect');
}

const applicationData = read('artifacts/d8advisr-partner/src/features/partner/partnerApplicationData.ts');
if (applicationData.includes(".from('partner_applications')\n      .update")) {
  failures.push('partner application client still performs a direct update');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Phase 4.6D client contract checks passed.');
