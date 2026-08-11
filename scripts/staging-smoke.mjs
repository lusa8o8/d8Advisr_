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

  for (const [role, identity] of Object.entries(credentials)) {
    const accessToken = await passwordSession(url, apiKey, identity.email, identity.password);
    const context = await accountContext(url, apiKey, accessToken);
    if (role === 'admin') assert(context?.is_admin === true, 'Admin identity is not marked as admin');
    if (role === 'consumer') assert(context?.is_admin !== true, 'Consumer identity unexpectedly has admin access');
    if (role === 'partner') {
      const { response, body } = await apiRequest(url, apiKey, '/rest/v1/partner_applications?select=status,partner_type', {
        accessToken,
      });
      assert(response.ok, `Partner application read returned HTTP ${response.status}`);
      assert(Array.isArray(body) && body.length === 1, 'Partner identity needs exactly one application');
    }
    console.log(`PASS ${role} sign-in and account context`);
  }
}

const consumerEnv = await readEnv('artifacts/d8advisr/.env.staging.local');
const partnerEnv = await readEnv('artifacts/d8advisr-partner/.env.staging.local');
const identityEnv = await readEnv('.env.staging.test.local');

assert(consumerEnv.VITE_SUPABASE_URL === partnerEnv.VITE_SUPABASE_URL, 'Consumer and partner staging URLs differ');
assert(consumerEnv.VITE_SUPABASE_ANON_KEY === partnerEnv.VITE_SUPABASE_ANON_KEY, 'Consumer and partner staging keys differ');
assert(isConfigured(consumerEnv.VITE_SUPABASE_URL), 'Consumer staging URL is not configured');
assert(isConfigured(consumerEnv.VITE_SUPABASE_ANON_KEY), 'Consumer staging key is not configured');

await assertPublicCatalog(consumerEnv.VITE_SUPABASE_URL, consumerEnv.VITE_SUPABASE_ANON_KEY);
await runIdentityChecks(consumerEnv.VITE_SUPABASE_URL, consumerEnv.VITE_SUPABASE_ANON_KEY, {
  consumer: {
    email: identityEnv.STAGING_CONSUMER_EMAIL,
    password: identityEnv.STAGING_CONSUMER_PASSWORD,
  },
  partner: {
    email: identityEnv.STAGING_PARTNER_EMAIL,
    password: identityEnv.STAGING_PARTNER_PASSWORD,
  },
  admin: {
    email: identityEnv.STAGING_ADMIN_EMAIL,
    password: identityEnv.STAGING_ADMIN_PASSWORD,
  },
});

console.log('Staging smoke checks completed successfully.');
