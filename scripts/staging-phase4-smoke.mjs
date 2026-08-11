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

function assertDenied(result, label) {
  assert([401, 403].includes(result.response.status), `${label} expected HTTP 401/403, got ${result.response.status}`);
}

function assertRows(result, expected, label) {
  assert(result.response.ok, `${label} returned HTTP ${result.response.status}`);
  assert(Array.isArray(result.body) && result.body.length === expected, `${label} expected ${expected} rows`);
}

async function create(url, apiKey, accessToken, functionName, payload) {
  return request(url, apiKey, `/rest/v1/rpc/${functionName}`, {
    method: 'POST', accessToken, body: { p_payload: payload },
  });
}

const client = await readEnv('artifacts/d8advisr/.env.staging.local');
const identities = await readEnv('.env.staging.test.local');
const url = client.VITE_SUPABASE_URL;
const apiKey = client.VITE_SUPABASE_ANON_KEY;
assert(url?.includes('bntxnjfftikmaqnbskkq'), 'Phase 4 tests refuse to run outside the staging project');

const consumer = await session(url, apiKey, identities.STAGING_CONSUMER_EMAIL, identities.STAGING_CONSUMER_PASSWORD);
const partner = await session(url, apiKey, identities.STAGING_PARTNER_EMAIL, identities.STAGING_PARTNER_PASSWORD);
const admin = await session(url, apiKey, identities.STAGING_ADMIN_EMAIL, identities.STAGING_ADMIN_PASSWORD);

const marker = `phase4-${Date.now()}`;
let venueId = null;
let eventId = null;
let failure = null;

try {
  const unauthorizedVenue = {
    name: `Unauthorized ${marker}`, city: 'Lusaka', category: 'Test',
    attribution: 'unclaimed', publication_status: 'draft',
  };
  assertDenied(await create(url, apiKey, consumer.accessToken, 'admin_create_venue', unauthorizedVenue), 'Consumer admin venue RPC');
  assertDenied(await create(url, apiKey, partner.accessToken, 'admin_create_venue', unauthorizedVenue), 'Partner admin venue RPC');
  assertDenied(await create(url, apiKey, consumer.accessToken, 'admin_create_event', {
    title: `Unauthorized ${marker}`, city: 'Lusaka', starts_at: new Date(Date.now() + 86400000).toISOString(),
    attribution: 'd8advisr', publication_status: 'live', event_location_kind: 'undisclosed',
  }), 'Consumer admin event RPC');
  console.log('PASS consumer and partner identities cannot call admin creation RPCs');

  const missingAttribution = await create(url, apiKey, admin.accessToken, 'admin_create_venue', {
    name: `Invalid ${marker}`, city: 'Lusaka', category: 'Test',
  });
  assert(missingAttribution.response.status === 400, `Missing attribution expected HTTP 400, got ${missingAttribution.response.status}`);
  console.log('PASS admin creation requires explicit attribution');

  const venueCreate = await create(url, apiKey, admin.accessToken, 'admin_create_venue', {
    name: `Unclaimed ${marker}`,
    city: 'Lusaka',
    category: 'Test venue',
    attribution: 'unclaimed',
    description: 'Temporary Phase 4 staging verification fixture',
  });
  assert(venueCreate.response.ok && typeof venueCreate.body === 'string', `Admin venue RPC failed: HTTP ${venueCreate.response.status}`);
  venueId = venueCreate.body;

  const adminVenue = await request(url, apiKey, `/rest/v1/venues?select=id,partner_id,operator_organization_id,source,listing_status,is_active,verification_status&id=eq.${venueId}`, {
    accessToken: admin.accessToken,
  });
  assertRows(adminVenue, 1, 'Admin draft venue read');
  assert(adminVenue.body[0].partner_id === null && adminVenue.body[0].operator_organization_id === null, 'Unclaimed venue has an owner');
  assert(adminVenue.body[0].source === 'd8_admin', 'Admin venue source is incorrect');
  assert(adminVenue.body[0].listing_status === 'draft' && adminVenue.body[0].is_active === false && adminVenue.body[0].verification_status === 'unverified', 'Admin venue did not default safely to draft');
  assertRows(await request(url, apiKey, `/rest/v1/venues?select=id&id=eq.${venueId}`), 0, 'Anonymous draft venue visibility');
  console.log('PASS unclaimed venue has no fake owner and defaults to a private draft');

  const eventCreate = await create(url, apiKey, admin.accessToken, 'admin_create_event', {
    title: `D8 ${marker}`,
    city: 'Lusaka',
    category: 'Test event',
    starts_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    attribution: 'd8advisr',
    publication_status: 'live',
    event_location_kind: 'external',
    external_location_name: 'Phase 4 staging test location',
    is_free: true,
  });
  assert(eventCreate.response.ok && typeof eventCreate.body === 'string', `Admin event RPC failed: HTTP ${eventCreate.response.status}`);
  eventId = eventCreate.body;

  const publicEvent = await request(url, apiKey, `/rest/v1/events?select=id,partner_id,organizer_organization_id,source,event_status,title&id=eq.${eventId}`);
  assertRows(publicEvent, 1, 'Anonymous live D8 event visibility');
  assert(publicEvent.body[0].partner_id === null, 'D8 event has a fake partner owner');
  assert(publicEvent.body[0].organizer_organization_id === platformOrganizationId, 'D8 event is missing platform attribution');
  assert(publicEvent.body[0].source === 'd8_admin' && publicEvent.body[0].event_status === 'live', 'D8 event publication contract is incorrect');
  console.log('PASS explicitly published D8 event is public with platform attribution');

  const audit = await request(url, apiKey, `/rest/v1/listing_admin_audit_log?select=venue_id,event_id,action,attribution,publication_status,actor_id&or=(venue_id.eq.${venueId},event_id.eq.${eventId})`, {
    accessToken: admin.accessToken,
  });
  assertRows(audit, 2, 'Admin creation audit read');
  assert(audit.body.every(row => row.action === 'created' && row.actor_id === admin.userId), 'Creation audit actor/action is incorrect');
  assertRows(await request(url, apiKey, '/rest/v1/listing_admin_audit_log?select=id', { accessToken: consumer.accessToken }), 0, 'Consumer audit visibility');
  assertDenied(await request(url, apiKey, '/rest/v1/listing_admin_audit_log?select=id'), 'Anonymous audit visibility');
  console.log('PASS creation audit is complete and admin-only');
} catch (caught) {
  failure = caught;
} finally {
  for (const [table, id] of [['events', eventId], ['venues', venueId]]) {
    if (!id) continue;
    const cleanup = await request(url, apiKey, `/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE', accessToken: admin.accessToken, prefer: 'return=minimal',
    });
    if (!cleanup.response.ok && failure === null) {
      failure = new Error(`Could not clean up Phase 4 ${table} fixture: HTTP ${cleanup.response.status}`);
    }
  }
}

if (failure) throw failure;

const remainingAudit = await request(url, apiKey, `/rest/v1/listing_admin_audit_log?select=id&or=(venue_id.eq.${venueId},event_id.eq.${eventId})`, {
  accessToken: admin.accessToken,
});
assertRows(remainingAudit, 0, 'Cascaded fixture audit cleanup');
console.log('PASS Phase 4 fixtures and audit rows were cleaned up');
console.log('Phase 4 staging admin creation checks completed successfully.');
