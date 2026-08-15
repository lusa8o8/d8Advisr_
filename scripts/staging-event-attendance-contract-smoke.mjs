import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

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
  assert(result.response.ok && result.body?.access_token && result.body?.user?.id,
    `Staging sign-in failed for ${email}: HTTP ${result.response.status}`);
  return { accessToken: result.body.access_token, userId: result.body.user.id };
}

function firstRow(result, label) {
  assert(result.response.ok, `${label} returned HTTP ${result.response.status}: ${JSON.stringify(result.body)}`);
  assert(Array.isArray(result.body) && result.body.length === 1, `${label} expected exactly one row`);
  return result.body[0];
}

const client = await readEnv('artifacts/d8advisr/.env.staging.local');
const identities = await readEnv('.env.staging.test.local');
const url = client.VITE_SUPABASE_URL;
const apiKey = client.VITE_SUPABASE_ANON_KEY;
assert(url?.includes('bntxnjfftikmaqnbskkq'), 'Event contract smoke test refuses to run outside staging');

const partner = await session(url, apiKey, identities.STAGING_PARTNER_EMAIL, identities.STAGING_PARTNER_PASSWORD);
const admin = await session(url, apiKey, identities.STAGING_ADMIN_EMAIL, identities.STAGING_ADMIN_PASSWORD);
const marker = `event-contract-${Date.now()}`;
let eventId = null;
let failure = null;

try {
  const created = await request(url, apiKey, '/rest/v1/events', {
    method: 'POST',
    accessToken: partner.accessToken,
    prefer: 'return=minimal',
    body: {
      title: marker,
      description: 'Temporary staging event contract fixture',
      category: 'Test event',
      starts_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      city: 'Lusaka',
      currency: 'K',
      event_status: 'draft',
      event_location_kind: 'undisclosed',
      venue_page_status: 'hidden',
      partner_id: partner.userId,
      spots_total: 10,
      spots_filled: 7,
      is_free: true,
      price_pp: 250,
    },
  });
  assert(created.response.ok, `Partner event insert returned HTTP ${created.response.status}: ${JSON.stringify(created.body)}`);
  const inserted = firstRow(await request(url, apiKey,
    `/rest/v1/events?select=id,spots_total,spots_filled,price_pp,capacity,spots_left&title=eq.${encodeURIComponent(marker)}`,
    { accessToken: admin.accessToken }), 'Partner event insert readback');
  eventId = inserted.id;
  assert(inserted.spots_filled === 0, 'Partner insert was allowed to seed registrations');
  assert(inserted.price_pp === 0, 'Free-entry insert retained a non-zero entry price');
  assert(inserted.capacity === 10 && inserted.spots_left === null, 'Legacy attendance fields were not canonicalized');
  console.log('PASS partner insert forces zero registrations and free-entry price');

  const adminSeed = await request(url, apiKey, `/rest/v1/events?id=eq.${eventId}`, {
    method: 'PATCH', accessToken: admin.accessToken, prefer: 'return=minimal', body: { spots_filled: 4 },
  });
  assert(adminSeed.response.ok, `Admin registration fixture update returned HTTP ${adminSeed.response.status}`);
  const seeded = firstRow(await request(url, apiKey,
    `/rest/v1/events?select=spots_filled&id=eq.${eventId}`,
    { accessToken: admin.accessToken }), 'Admin registration fixture readback');
  assert(seeded.spots_filled === 4, 'Admin could not establish the preserved registration fixture');

  const partnerEdit = await request(url, apiKey, `/rest/v1/events?id=eq.${eventId}`, {
    method: 'PATCH',
    accessToken: partner.accessToken,
    prefer: 'return=minimal',
    body: { description: 'Partner edit', spots_filled: 0, price_pp: 999 },
  });
  assert(partnerEdit.response.ok, `Partner event edit returned HTTP ${partnerEdit.response.status}`);
  const edited = firstRow(await request(url, apiKey,
    `/rest/v1/events?select=spots_filled,price_pp&id=eq.${eventId}`,
    { accessToken: admin.accessToken }), 'Partner event edit readback');
  assert(edited.spots_filled === 4, 'Partner edit reset preserved registrations');
  assert(edited.price_pp === 0, 'Free-entry edit retained a non-zero entry price');
  console.log('PASS partner edits preserve registrations and zero free-entry price');

  const invalidLimit = await request(url, apiKey, `/rest/v1/events?id=eq.${eventId}`, {
    method: 'PATCH', accessToken: partner.accessToken, prefer: 'return=minimal', body: { spots_total: 3 },
  });
  assert(invalidLimit.response.status === 400,
    `Capacity below registrations expected HTTP 400, got ${invalidLimit.response.status}`);

  const unchanged = firstRow(await request(url, apiKey,
    `/rest/v1/events?select=spots_total,spots_filled&id=eq.${eventId}`,
    { accessToken: admin.accessToken }), 'Rejected capacity readback');
  assert(unchanged.spots_total === 10 && unchanged.spots_filled === 4,
    'Rejected capacity update changed attendance state');
  console.log('PASS capacity cannot be reduced below preserved registrations');
} catch (caught) {
  failure = caught;
} finally {
  if (eventId) {
    const cleanup = await request(url, apiKey, `/rest/v1/events?id=eq.${eventId}`, {
      method: 'DELETE', accessToken: admin.accessToken, prefer: 'return=minimal',
    });
    if (!cleanup.response.ok && failure === null) {
      failure = new Error(`Could not clean up event fixture: HTTP ${cleanup.response.status}`);
    }
  }
}

if (failure) throw failure;
console.log('PASS temporary event fixture cleaned up');
console.log('Staging event attendance and free-entry checks completed successfully.');
