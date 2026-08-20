import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const failures = [];

function requireText(path, expected, label) {
  const source = read(path);
  if (!source.includes(expected)) failures.push(`${label}: missing ${JSON.stringify(expected)} in ${path}`);
}

requireText('lib/d8-core/src/auth.tsx', "event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN'", 'same-user auth refresh');
requireText('lib/d8-core/src/auth.tsx', 'current?.id === session.user.id ? current : session.user', 'stable auth identity');
requireText('lib/d8-core/src/auth.tsx', "supabase.auth.signOut({ scope: 'local' })", 'origin-local portal logout');
requireText('artifacts/d8advisr/src/App.tsx', 'user?.id', 'consumer guard identity dependency');
requireText('artifacts/d8advisr-partner/src/App.tsx', 'user?.id', 'partner guard identity dependency');
requireText('artifacts/d8advisr/src/pages/AdminPanel.tsx', "searchParams.get('section')", 'URL-addressable admin section');
requireText('artifacts/d8advisr/src/features/admin/AdminListingCreate.tsx', 'useSessionDraft', 'admin create recovery');
requireText('artifacts/d8advisr/src/pages/SignIn.tsx', "isAdminSignIn = nextPath === '/admin'", 'admin email/password-only sign-in');
requireText('artifacts/d8advisr/src/pages/SignIn.tsx', '<form onSubmit={handleSignIn}', 'semantic sign-in form');
requireText('artifacts/d8advisr/src/pages/InitialPreferences.tsx', 'useSessionDraft', 'consumer onboarding recovery');
requireText('artifacts/d8advisr-partner/src/pages/PartnerVenueEditor.tsx', 'readSessionDraft', 'partner venue recovery');
requireText('artifacts/d8advisr-partner/src/pages/PartnerEventEditor.tsx', 'readSessionDraft', 'partner event recovery');

const consumerApp = read('artifacts/d8advisr/src/App.tsx');
if (consumerApp.includes('redirectToPartner(')) {
  failures.push('consumer routing: partner status must not redirect away from the consumer client');
}

const capabilities = read('lib/d8-core/src/partnerCapabilities.ts');
if (!capabilities.includes("partnerType === 'venue' || partnerType === 'organizer' || partnerType === 'both'")) {
  failures.push('partner capabilities: venue operators must receive event tools');
}

for (const path of [
  'artifacts/d8advisr/src/pages/SignIn.tsx',
  'artifacts/d8advisr/src/pages/SignUp.tsx',
  'artifacts/d8advisr/src/pages/PasswordUpdate.tsx',
  'artifacts/d8advisr-partner/src/pages/SignIn.tsx',
  'artifacts/d8advisr-partner/src/pages/SignUp.tsx',
  'artifacts/d8advisr-partner/src/pages/PasswordUpdate.tsx',
]) {
  const source = read(path);
  if (source.includes('useSessionDraft') || source.includes('writeSessionDraft')) {
    failures.push(`credential safety: ${path} must not persist credential form state`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Session lifecycle static checks passed.');
