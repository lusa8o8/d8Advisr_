import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readEnv = async path => Object.fromEntries((await readFile(resolve(root, path), 'utf8'))
  .split(/\r?\n/).map(line => line.trim())
  .filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const client = await readEnv('artifacts/d8advisr/.env.staging.local');
const identities = await readEnv('.env.staging.test.local');
const url = client.VITE_SUPABASE_URL;
const apiKey = client.VITE_SUPABASE_ANON_KEY;
assert(url?.includes('bntxnjfftikmaqnbskkq'), 'Phase 4.5 tests refuse to run outside staging');

async function request(path, accessToken = apiKey, options = {}) {
  const response = await fetch(`${url}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body };
}

async function session(email, password) {
  const result = await request('/auth/v1/token?grant_type=password', apiKey, {
    method: 'POST', body: { email, password },
  });
  assert(result.response.ok && result.body?.access_token, `Sign-in failed: HTTP ${result.response.status}`);
  return result.body.access_token;
}

const [consumer, partner, admin] = await Promise.all([
  session(identities.STAGING_CONSUMER_EMAIL, identities.STAGING_CONSUMER_PASSWORD),
  session(identities.STAGING_PARTNER_EMAIL, identities.STAGING_PARTNER_PASSWORD),
  session(identities.STAGING_ADMIN_EMAIL, identities.STAGING_ADMIN_PASSWORD),
]);

for (const [name, path, expectedMinimum] of [
  ['regions', '/rest/v1/regions?select=id,name,currency_code&order=id', 2],
  ['areas', '/rest/v1/region_areas?select=id,region_id,name&order=sort_order', 14],
  ['categories', '/rest/v1/listing_categories?select=id,label,applies_to&order=sort_order', 13],
  ['vibes', '/rest/v1/listing_vibes?select=id,label&order=sort_order', 49],
]) {
  const result = await request(path);
  assert(result.response.ok && result.body.length >= expectedMinimum,
    `Public ${name} unavailable: HTTP ${result.response.status}`);
  console.log(`PASS public ${name}: ${result.body.length}`);
}

for (const [role, token] of [['consumer', consumer], ['partner', partner]]) {
  const denied = await request('/rest/v1/rpc/admin_listing_reference_exceptions', token, {
    method: 'POST', body: {},
  });
  assert([401, 403].includes(denied.response.status),
    `${role} exception report leaked: HTTP ${denied.response.status}`);
  console.log(`PASS ${role} cannot read reference exceptions`);
}

const exceptions = await request('/rest/v1/rpc/admin_listing_reference_exceptions', admin, {
  method: 'POST', body: {},
});
assert(exceptions.response.ok, `Admin exception report failed: HTTP ${exceptions.response.status}`);
const values = new Set(exceptions.body.map(row => row.raw_value));
assert(!values.has('DJ'), 'DJ remains unexpectedly unmapped');
for (const expected of ['Test Venue', 'K', 'loud', 'Staging']) {
  assert(values.has(expected), `Expected staging exception missing: ${expected}`);
}
console.log(`PASS admin-only exception report: ${exceptions.body.length} intentional staging rows`);

const venues = await request(
  '/rest/v1/venues?select=id,region_id,area_id,area_source,category_id,price_level',
  consumer,
);
assert(venues.response.ok && venues.body.length > 0, 'Consumer canonical venue read failed');
assert(venues.body.every(row => row.region_id === 'lusaka'), 'A live staging venue lacks canonical Lusaka region');
assert(venues.body.some(row => row.area_id && row.area_source === 'catalog'), 'No catalog-backed live area found');
assert(venues.body.filter(row => row.category_id === null).length <= 2,
  'Unexpected live venue category exceptions found');
console.log(`PASS canonical consumer venue backfill: ${venues.body.length} live rows`);

const events = await request('/rest/v1/events?select=id,region_id,category_id,currency', consumer);
assert(events.response.ok && events.body.length > 0, 'Consumer canonical event read failed');
assert(events.body.every(row => row.region_id === 'lusaka' && row.category_id && row.currency === 'ZMW'),
  'A live event has inconsistent canonical region/category/currency');
console.log(`PASS canonical consumer event backfill: ${events.body.length} live rows`);
