import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const platformOrganizationId = '00000000-0000-4000-8000-00000000d800';

async function readEnv(path) {
  const content = await readFile(resolve(root, path), 'utf8');
  return Object.fromEntries(content.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(url, apiKey, path, options = {}) {
  const response = await fetch(`${url}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${options.accessToken ?? apiKey}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer ?? 'return=representation',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { response, body };
}

async function session(url, apiKey, email, password) {
  const result = await request(url, apiKey, '/auth/v1/token?grant_type=password', {
    method: 'POST', body: { email, password },
  });
  assert(result.response.ok && result.body?.access_token && result.body?.user?.id, `Staging sign-in failed: HTTP ${result.response.status}`);
  return { accessToken: result.body.access_token, userId: result.body.user.id };
}

function assertRows(result, expected, label) {
  assert(result.response.ok, `${label} returned HTTP ${result.response.status}`);
  assert(Array.isArray(result.body) && result.body.length === expected, `${label} expected ${expected} rows`);
}

function assertDenied(result, label) {
  assert([401, 403].includes(result.response.status), `${label} expected HTTP 401/403, got ${result.response.status}`);
}

const client = await readEnv('artifacts/d8advisr/.env.staging.local');
const identities = await readEnv('.env.staging.test.local');
const url = client.VITE_SUPABASE_URL;
const apiKey = client.VITE_SUPABASE_ANON_KEY;
assert(url?.includes('bntxnjfftikmaqnbskkq'), 'Phase 3 tests refuse to run outside the staging project');

const consumer = await session(url, apiKey, identities.STAGING_CONSUMER_EMAIL, identities.STAGING_CONSUMER_PASSWORD);
const partner = await session(url, apiKey, identities.STAGING_PARTNER_EMAIL, identities.STAGING_PARTNER_PASSWORD);
const admin = await session(url, apiKey, identities.STAGING_ADMIN_EMAIL, identities.STAGING_ADMIN_PASSWORD);

for (const table of ['venues', 'events']) {
  const safe = await request(url, apiKey, `/rest/v1/${table}?select=id&limit=1`);
  assert(safe.response.ok, `Public ${table} compatibility read returned HTTP ${safe.response.status}`);
  const protectedRead = await request(url, apiKey, `/rest/v1/${table}?select=id,created_by&limit=1`);
  assertDenied(protectedRead, `Anonymous ${table}.created_by read`);
  const authenticatedProtectedRead = await request(url, apiKey, `/rest/v1/${table}?select=id,created_by&limit=1`, {
    accessToken: consumer.accessToken,
  });
  assertDenied(authenticatedProtectedRead, `Consumer ${table}.created_by read`);
}
console.log('PASS listing compatibility reads work and created_by remains private');

assertDenied(await request(url, apiKey, '/rest/v1/partner_organizations?select=id'), 'Anonymous organization read');
assertRows(await request(url, apiKey, '/rest/v1/partner_organizations?select=id', { accessToken: consumer.accessToken }), 0, 'Consumer organization read');

const adminOrganizations = await request(url, apiKey, `/rest/v1/partner_organizations?select=id,name,organization_type,status&id=eq.${platformOrganizationId}`, {
  accessToken: admin.accessToken,
});
assertRows(adminOrganizations, 1, 'Admin platform organization read');
assert(adminOrganizations.body[0].name === 'D8Advisr'
  && adminOrganizations.body[0].organization_type === 'platform'
  && adminOrganizations.body[0].status === 'active', 'Platform organization contract is invalid');
assertRows(await request(url, apiKey, '/rest/v1/partner_organization_memberships?select=id', { accessToken: admin.accessToken }), 0, 'Initial membership foundation');
assertRows(await request(url, apiKey, '/rest/v1/partner_organization_claims?select=id', { accessToken: admin.accessToken }), 0, 'Initial claim foundation');
console.log('PASS deterministic platform organization and empty additive tables');

const applications = await request(url, apiKey, '/rest/v1/partner_applications?select=id,organization_id', { accessToken: admin.accessToken });
assert(applications.response.ok && applications.body.length === 2, 'Expected two staging partner applications');
assert(applications.body.every(row => row.organization_id === null), 'Phase 3 unexpectedly backfilled partner applications');
const legacyVenues = await request(url, apiKey, '/rest/v1/venues?select=id,partner_id,operator_organization_id,source&partner_id=not.is.null', {
  accessToken: admin.accessToken,
});
assert(legacyVenues.response.ok && legacyVenues.body.length === 2, 'Expected two legacy-owned staging venues');
assert(legacyVenues.body.every(row => row.operator_organization_id === null && row.source === null), 'Phase 3 unexpectedly backfilled legacy venues');
console.log('PASS legacy ownership remains authoritative and unbackfilled');

for (const [rpc, args] of [
  ['organization_can', { organization_uuid: platformOrganizationId, capability: 'events' }],
  ['is_claimable_organization', { organization_uuid: platformOrganizationId, source_venue_uuid: null }],
  ['is_active_organization_member', { organization_uuid: platformOrganizationId, user_uuid: consumer.userId }],
  ['is_active_organization_member', { organization_uuid: platformOrganizationId, user_uuid: partner.userId }],
]) {
  const result = await request(url, apiKey, `/rest/v1/rpc/${rpc}`, {
    method: 'POST', accessToken: consumer.accessToken, body: args,
  });
  assert(result.response.ok && result.body === false, `${rpc} expected false for the platform/non-member case`);
}
console.log('PASS organization helpers deny unsupported capability, claims, and membership');

assertDenied(await request(url, apiKey, '/rest/v1/partner_organizations', {
  method: 'POST', accessToken: consumer.accessToken,
  body: { name: 'Unauthorized Organization', organization_type: 'venue_operator' },
}), 'Consumer organization insert');
assertDenied(await request(url, apiKey, '/rest/v1/partner_organization_memberships', {
  method: 'POST', accessToken: consumer.accessToken,
  body: { organization_id: platformOrganizationId, user_id: consumer.userId, role: 'primary_owner' },
}), 'Consumer membership insert');
assertDenied(await request(url, apiKey, '/rest/v1/partner_organization_claims', {
  method: 'POST', accessToken: consumer.accessToken,
  body: { organization_id: platformOrganizationId, claimant_user_id: consumer.userId, requested_role: 'primary_owner', evidence: {} },
}), 'Consumer platform organization claim');

const partnerVenue = legacyVenues.body.find(row => row.partner_id === partner.userId);
assert(partnerVenue, 'Primary staging partner venue is missing');
assertDenied(await request(url, apiKey, `/rest/v1/venues?id=eq.${partnerVenue.id}`, {
  method: 'PATCH', accessToken: partner.accessToken,
  body: { operator_organization_id: platformOrganizationId },
}), 'Partner direct venue organization assignment');
const unchangedVenue = await request(url, apiKey, `/rest/v1/venues?select=id,operator_organization_id&id=eq.${partnerVenue.id}`, {
  accessToken: admin.accessToken,
});
assertRows(unchangedVenue, 1, 'Post-denial venue read');
assert(unchangedVenue.body[0].operator_organization_id === null, 'Denied organization assignment changed the venue');
console.log('PASS direct organization, membership, claim, and listing ownership escalation is denied');

console.log('Phase 3 staging migration checks completed successfully.');
