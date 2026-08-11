import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '..');
const requireIdentities = process.argv.includes('--require-identities');

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isConfigured(value) {
  return Boolean(value) && !/replace-with|placeholder|your-/i.test(value);
}

async function apiRequest(url, apiKey, path, options = {}) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${options.accessToken ?? apiKey}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer ?? 'count=exact',
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { response, body };
}

async function passwordSession(url, apiKey, email, password) {
  const result = await apiRequest(url, apiKey, '/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
  assert(result.response.ok, `Sign-in failed for ${email}: HTTP ${result.response.status}`);
  assert(result.body?.access_token, `Sign-in for ${email} returned no access token`);
  return result.body.access_token;
}

async function assertPublicCatalog(url, apiKey) {
  const expectations = [
    ['regions', 2],
    ['venues', 15],
    ['events', 5],
  ];
  for (const [table, minimum] of expectations) {
    const { response, body } = await apiRequest(url, apiKey, `/rest/v1/${table}?select=id`);
    assert(response.status === 200, `${table} public read returned HTTP ${response.status}`);
    assert(Array.isArray(body) && body.length >= minimum, `${table} expected at least ${minimum} rows`);
    console.log(`PASS public ${table}: ${body.length} rows`);
  }

  for (const table of ['plans', 'partner_applications']) {
    const { response } = await apiRequest(url, apiKey, `/rest/v1/${table}?select=id&limit=1`);
    assert(response.status === 401, `${table} anonymous read expected HTTP 401, got ${response.status}`);
    console.log(`PASS private ${table}: anonymous HTTP 401`);
  }
}

async function accountContext(url, apiKey, accessToken) {
  const { response, body } = await apiRequest(url, apiKey, '/rest/v1/rpc/get_current_account_context', {
    method: 'POST',
    accessToken,
    body: {},
  });
  assert(response.ok, `Account context returned HTTP ${response.status}`);
  assert(Array.isArray(body) && body.length === 1, 'Account context expected exactly one row');
  return body[0];
}

async function currentUser(url, apiKey, accessToken) {
  const { response, body } = await apiRequest(url, apiKey, '/auth/v1/user', { accessToken });
  assert(response.ok && body?.id, `Current user lookup returned HTTP ${response.status}`);
  return body;
}

async function runIdentityChecks(url, apiKey, credentials) {
  const configured = Object.values(credentials).every(identity =>
    isConfigured(identity.email) && isConfigured(identity.password),
  );
  if (!configured) {
    if (requireIdentities) throw new Error('Staging identity credentials are not fully configured');
    console.log('SKIP identity checks: fill .env.staging.test.local and create the three Auth users');
    return;
  }

  const sessions = {};
  for (const [label, identity] of Object.entries(credentials)) {
    const accessToken = await passwordSession(url, apiKey, identity.email, identity.password);
    const context = await accountContext(url, apiKey, accessToken);
    const user = await currentUser(url, apiKey, accessToken);
    assert(context?.scope === identity.scope, `${label} identity returned account scope ${context?.scope ?? 'unknown'}`);
    if (identity.scope === 'partner') {
      const { response, body } = await apiRequest(url, apiKey, '/rest/v1/partner_applications?select=status,partner_type', {
        accessToken,
      });
      assert(response.ok, `Partner application read returned HTTP ${response.status}`);
      assert(Array.isArray(body) && body.length === 1, 'Partner identity needs exactly one application');
    }
    sessions[label] = { accessToken, userId: user.id };
    console.log(`PASS ${label} sign-in and ${identity.scope} account context`);
  }
  return sessions;
}

async function expectRows(url, apiKey, accessToken, path, expected, label) {
  const { response, body } = await apiRequest(url, apiKey, path, { accessToken });
  assert(response.ok, `${label} returned HTTP ${response.status}`);
  assert(Array.isArray(body) && body.length === expected, `${label} expected ${expected} rows`);
}

async function expectNoOpUpdate(url, apiKey, accessToken, path, body, label) {
  const result = await apiRequest(url, apiKey, path, {
    method: 'PATCH',
    accessToken,
    prefer: 'return=representation',
    body,
  });
  assert(result.response.ok, `${label} returned HTTP ${result.response.status}`);
  assert(Array.isArray(result.body) && result.body.length === 0, `${label} unexpectedly updated a row`);
}

async function assertRoleIsolation(url, apiKey, sessions) {
  const draftVenueId = '00000000-0000-4000-8000-00000000b002';
  const secondPartnerApplicationId = '00000000-0000-4000-8000-00000000a002';

  await expectRows(url, apiKey, sessions.consumer.accessToken, `/rest/v1/profiles?select=id&id=eq.${sessions.consumer2.userId}`, 0, 'Consumer cross-profile read');
  await expectRows(url, apiKey, sessions.consumer2.accessToken, `/rest/v1/profiles?select=id&id=eq.${sessions.consumer.userId}`, 0, 'Consumer 2 cross-profile read');
  await expectNoOpUpdate(url, apiKey, sessions.consumer.accessToken, `/rest/v1/profiles?id=eq.${sessions.consumer2.userId}`, { city: 'Lusaka' }, 'Consumer cross-profile update');

  await expectRows(url, apiKey, sessions.partner.accessToken, `/rest/v1/partner_applications?select=id&id=eq.${secondPartnerApplicationId}`, 0, 'Partner cross-application read');
  await expectNoOpUpdate(url, apiKey, sessions.partner.accessToken, `/rest/v1/partner_applications?id=eq.${secondPartnerApplicationId}`, { name: 'D8 Staging Partner Two' }, 'Partner cross-application update');

  const draftPath = `/rest/v1/venues?select=id&id=eq.${draftVenueId}`;
  await expectRows(url, apiKey, sessions.partner2.accessToken, draftPath, 1, 'Draft venue owner read');
  await expectRows(url, apiKey, sessions.partner.accessToken, draftPath, 0, 'Cross-partner draft venue read');
  await expectRows(url, apiKey, sessions.consumer.accessToken, draftPath, 0, 'Consumer draft venue read');
  await expectRows(url, apiKey, sessions.admin.accessToken, draftPath, 1, 'Admin draft venue read');
  await expectRows(url, apiKey, undefined, draftPath, 0, 'Anonymous draft venue read');

  const protectedColumn = await apiRequest(url, apiKey, `/rest/v1/profiles?id=eq.${sessions.consumer.userId}`, {
    method: 'PATCH',
    accessToken: sessions.consumer.accessToken,
    prefer: 'return=representation',
    body: { is_admin: false },
  });
  assert(!protectedColumn.response.ok, 'Consumer unexpectedly received protected profile-column update access');

  const adminRpc = await apiRequest(url, apiKey, '/rest/v1/rpc/admin_update_partner_application_status', {
    method: 'POST',
    accessToken: sessions.consumer.accessToken,
    body: { application_id: secondPartnerApplicationId, new_status: 'live' },
  });
  assert(!adminRpc.response.ok, 'Consumer unexpectedly invoked an admin-only RPC');

  console.log('PASS cross-account reads and safe no-op updates are isolated');
  console.log('PASS draft venue visibility is owner/admin only');
  console.log('PASS protected profile columns and admin RPC reject consumers');
}

const consumerEnv = await readEnv('artifacts/d8advisr/.env.staging.local');
const partnerEnv = await readEnv('artifacts/d8advisr-partner/.env.staging.local');
const identityEnv = await readEnv('.env.staging.test.local');

assert(consumerEnv.VITE_SUPABASE_URL === partnerEnv.VITE_SUPABASE_URL, 'Consumer and partner staging URLs differ');
assert(consumerEnv.VITE_SUPABASE_ANON_KEY === partnerEnv.VITE_SUPABASE_ANON_KEY, 'Consumer and partner staging keys differ');
assert(isConfigured(consumerEnv.VITE_SUPABASE_URL), 'Consumer staging URL is not configured');
assert(isConfigured(consumerEnv.VITE_SUPABASE_ANON_KEY), 'Consumer staging key is not configured');

await assertPublicCatalog(consumerEnv.VITE_SUPABASE_URL, consumerEnv.VITE_SUPABASE_ANON_KEY);
const sessions = await runIdentityChecks(consumerEnv.VITE_SUPABASE_URL, consumerEnv.VITE_SUPABASE_ANON_KEY, {
  consumer: {
    email: identityEnv.STAGING_CONSUMER_EMAIL,
    password: identityEnv.STAGING_CONSUMER_PASSWORD,
    scope: 'consumer',
  },
  consumer2: {
    email: identityEnv.STAGING_CONSUMER_2_EMAIL,
    password: identityEnv.STAGING_CONSUMER_PASSWORD,
    scope: 'consumer',
  },
  partner: {
    email: identityEnv.STAGING_PARTNER_EMAIL,
    password: identityEnv.STAGING_PARTNER_PASSWORD,
    scope: 'partner',
  },
  partner2: {
    email: identityEnv.STAGING_PARTNER_2_EMAIL,
    password: identityEnv.STAGING_PARTNER_PASSWORD,
    scope: 'partner',
  },
  admin: {
    email: identityEnv.STAGING_ADMIN_EMAIL,
    password: identityEnv.STAGING_ADMIN_PASSWORD,
    scope: 'admin',
  },
});

if (sessions) {
  await assertRoleIsolation(consumerEnv.VITE_SUPABASE_URL, consumerEnv.VITE_SUPABASE_ANON_KEY, sessions);
}

console.log('Staging smoke checks completed successfully.');
