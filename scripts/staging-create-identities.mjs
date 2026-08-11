import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

if (!process.argv.includes('--confirm-staging')) {
  throw new Error('Refusing to create users without --confirm-staging');
}

const workspaceRoot = resolve(import.meta.dirname, '..');

async function readEnv(relativePath) {
  const content = await readFile(resolve(workspaceRoot, relativePath), 'utf8');
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function assertConfigured(value, name) {
  if (!value || /replace-with|placeholder|your-/i.test(value)) {
    throw new Error(`${name} is not configured`);
  }
}

const clientEnv = await readEnv('artifacts/d8advisr/.env.staging.local');
const identities = await readEnv('.env.staging.test.local');
const expectedProject = 'bntxnjfftikmaqnbskkq';

assertConfigured(clientEnv.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL');
assertConfigured(clientEnv.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY');
if (!clientEnv.VITE_SUPABASE_URL.includes(expectedProject)) {
  throw new Error(`Refusing to create users outside staging project ${expectedProject}`);
}

const users = [
  ['consumer', identities.STAGING_CONSUMER_EMAIL, identities.STAGING_CONSUMER_PASSWORD],
  ['partner', identities.STAGING_PARTNER_EMAIL, identities.STAGING_PARTNER_PASSWORD],
  ['admin', identities.STAGING_ADMIN_EMAIL, identities.STAGING_ADMIN_PASSWORD],
];

for (const [role, email, password] of users) {
  assertConfigured(email, `${role} email`);
  assertConfigured(password, `${role} password`);
  const response = await fetch(`${clientEnv.VITE_SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: clientEnv.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${clientEnv.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      data: { full_name: `D8 Staging ${role[0].toUpperCase()}${role.slice(1)}` },
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(body?.msg ?? body?.message ?? 'unknown Auth error');
    if (/already registered|already exists/i.test(message)) {
      console.log(`EXISTS ${role}: ${email}`);
      continue;
    }
    throw new Error(`Failed to create ${role} (${email}): HTTP ${response.status} ${message}`);
  }
  console.log(`CREATED ${role}: ${email}${body?.session ? ' (confirmed)' : ' (confirmation required)'}`);
}

console.log('Auth identity creation completed without exposing credentials.');
