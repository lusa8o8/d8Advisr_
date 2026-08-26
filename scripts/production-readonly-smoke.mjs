import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '..');
const productionProjectRef = 'evfftzhrucwwfnertiup';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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

async function request(url, apiKey, path) {
  const response = await fetch(`${url}${path}`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Prefer: 'count=exact',
    },
  });
  const body = await response.text();
  return { response, body };
}

function exactCount(response, body) {
  const range = response.headers.get('content-range');
  const match = range?.match(/\/(\d+)$/);
  if (match) return Number(match[1]);
  const parsed = JSON.parse(body);
  return Array.isArray(parsed) ? parsed.length : null;
}

async function assertPublicRead(url, apiKey, table, minimumRows, identityColumn = 'id') {
  const { response, body } = await request(url, apiKey, `/rest/v1/${table}?select=${identityColumn}&limit=1000`);
  assert(response.status === 200, `${table} public read returned HTTP ${response.status}: ${body}`);
  const count = exactCount(response, body);
  assert(Number.isInteger(count), `${table} response did not expose a count`);
  assert(count >= minimumRows, `${table} expected at least ${minimumRows} rows, received ${count}`);
  console.log(`PASS public ${table}: ${count} rows`);
}

async function assertFilteredPublicRead(url, apiKey, label, path, minimumRows = 0) {
  const { response, body } = await request(url, apiKey, path);
  assert(response.status === 200, `${label} returned HTTP ${response.status}: ${body}`);
  const count = exactCount(response, body);
  assert(Number.isInteger(count), `${label} response did not expose a count`);
  assert(count >= minimumRows, `${label} expected at least ${minimumRows} rows, received ${count}`);
  console.log(`PASS ${label}: ${count} rows`);
  return count;
}

async function assertFilteredPublicCount(url, apiKey, label, path, expectedRows) {
  const count = await assertFilteredPublicRead(url, apiKey, label, path, expectedRows);
  assert(count === expectedRows, `${label} expected exactly ${expectedRows} rows, received ${count}`);
}

async function assertAnonymousDenied(url, apiKey, table) {
  const { response } = await request(url, apiKey, `/rest/v1/${table}?select=*&limit=1`);
  assert(
    response.status === 401 || response.status === 403,
    `${table} anonymous read expected HTTP 401/403, received ${response.status}`,
  );
  console.log(`PASS private ${table}: anonymous HTTP ${response.status}`);
}

async function assertAnonymousDeleteDenied(url, apiKey, table) {
  const response = await fetch(
    `${url}/rest/v1/${table}?id=eq.00000000-0000-4000-8000-000000000000`,
    {
      method: 'DELETE',
      headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
    },
  );
  assert(
    response.status === 401 || response.status === 403,
    `${table} anonymous delete expected HTTP 401/403, received ${response.status}`,
  );
  console.log(`PASS protected ${table}: anonymous delete HTTP ${response.status}`);
}

async function assertAnonymousInsertDenied(url, apiKey, table, body) {
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  assert(
    response.status === 401 || response.status === 403,
    `${table} anonymous insert expected HTTP 401/403, received ${response.status}`,
  );
  console.log(`PASS protected ${table}: anonymous insert HTTP ${response.status}`);
}

async function assertAnonymousProvenanceRpcDenied(url, apiKey) {
  const response = await fetch(`${url}/rest/v1/rpc/admin_replace_event_provenance`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_event_id: '00000000-0000-4000-8000-000000000000',
      p_sources: [],
      p_action_links: [],
      p_expected_updated_at: new Date(0).toISOString(),
      p_request_key: crypto.randomUUID(),
      p_mark_as_import: false,
    }),
  });
  assert(
    [401, 403, 404].includes(response.status),
    `admin_replace_event_provenance anonymous call expected HTTP 401/403/404, received ${response.status}`,
  );
  console.log(`PASS protected admin_replace_event_provenance: anonymous HTTP ${response.status}`);
}

async function assertAnonymousRetirementRpcDenied(url, apiKey, functionName, idKey) {
  const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      [idKey]: '00000000-0000-4000-8000-000000000000',
      p_expected_updated_at: new Date(0).toISOString(),
      p_reason: 'anonymous denial check',
      p_request_key: crypto.randomUUID(),
    }),
  });
  assert(
    [401, 403, 404].includes(response.status),
    `${functionName} anonymous call expected HTTP 401/403/404, received ${response.status}`,
  );
  console.log(`PASS protected ${functionName}: anonymous HTTP ${response.status}`);
}

async function assertPublicEventAttributionRpc(url, apiKey) {
  const eventResponse = await fetch(
    `${url}/rest/v1/events?select=id,source&source=in.(d8_admin,import)&event_status=in.(live,cancelled)&limit=1`,
    { headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` } },
  );
  const events = await eventResponse.json();
  assert(eventResponse.status === 200 && Array.isArray(events) && events.length === 1,
    `public attribution smoke requires one visible D8/import event: ${JSON.stringify(events)}`);

  const response = await fetch(`${url}/rest/v1/rpc/get_public_event_listing_attribution`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_event_id: events[0].id }),
  });
  const body = await response.json();
  assert(response.status === 200 && Array.isArray(body) && body.length === 1,
    `public attribution RPC returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  assert(body[0].attribution_type === 'd8advisr' && body[0].display_name === 'D8Advisr',
    `public attribution RPC returned unexpected D8 attribution: ${JSON.stringify(body[0])}`);
  console.log('PASS public event listing attribution: D8Advisr');
}

const env = await readEnv('artifacts/d8advisr/.env.local');
const url = env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const apiKey = env.VITE_SUPABASE_ANON_KEY;
assert(url && apiKey, 'Consumer .env.local must contain the main Supabase URL and anonymous key');
assert(
  new URL(url).hostname === `${productionProjectRef}.supabase.co`,
  `Refusing production smoke: consumer .env.local points to ${new URL(url).hostname}`,
);

// These minimums are the read-only baseline captured before the August migration promotion.
await assertPublicRead(url, apiKey, 'venues', 16);
await assertPublicRead(url, apiKey, 'events', 6);
await assertPublicRead(url, apiKey, 'regions', 2);
await assertPublicRead(url, apiKey, 'countries', 2, 'code');
await assertPublicRead(url, apiKey, 'listing_categories', 1);
await assertPublicRead(url, apiKey, 'listing_vibes', 1);
await assertPublicRead(url, apiKey, 'event_sources', 0);
await assertPublicRead(url, apiKey, 'event_action_links', 0);
await assertPublicEventAttributionRpc(url, apiKey);

// Mirror the canonical market predicates used by the consumer clients. Display-city
// spelling and casing are deliberately excluded from the discovery contract.
await assertFilteredPublicRead(
  url,
  apiKey,
  'canonical Lusaka venue feed',
  '/rest/v1/venues?select=id&region_id=eq.lusaka&is_active=eq.true&listing_status=eq.live&limit=1000',
  16,
);
const upcomingEventCount = await assertFilteredPublicRead(
  url,
  apiKey,
  'canonical upcoming Lusaka events',
  `/rest/v1/events?select=id&region_id=eq.lusaka&or=${encodeURIComponent(`(event_status.eq.live,and(event_status.eq.cancelled,cancelled_at.gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}))`)}&starts_at=gte.${encodeURIComponent(new Date().toISOString())}&limit=1000`,
);
if (upcomingEventCount === 0) {
  console.log('INFO canonical upcoming Lusaka events: production currently has no future live inventory');
}

await assertFilteredPublicCount(
  url,
  apiKey,
  'canonical live market metadata',
  '/rest/v1/regions?select=id,slug,administrative_area_code,administrative_area_name&id=in.(lagos,lusaka)&limit=10',
  2,
);
await assertFilteredPublicCount(
  url,
  apiKey,
  'inactive expansion markets hidden from anonymous clients',
  '/rest/v1/regions?select=id&id=in.(zm-livingstone,zm-kitwe,zm-ndola,zm-siavonga)&limit=10',
  0,
);

for (const table of [
  'plans',
  'partner_applications',
  'consumer_notifications',
  'listing_retirement_audit',
  'event_provenance_audit',
]) {
  await assertAnonymousDenied(url, apiKey, table);
}

await assertAnonymousInsertDenied(url, apiKey, 'event_sources', {
  event_id: '00000000-0000-4000-8000-000000000000',
  source_type: 'social',
  publisher_name: 'Anonymous bypass',
  url: 'https://example.com/blocked',
});
await assertAnonymousInsertDenied(url, apiKey, 'event_action_links', {
  event_id: '00000000-0000-4000-8000-000000000000',
  link_type: 'official',
  provider_name: 'Anonymous bypass',
  label: 'View official details',
  url: 'https://example.com/blocked',
});
await assertAnonymousProvenanceRpcDenied(url, apiKey);

for (const table of ['venues', 'events']) {
  await assertAnonymousDeleteDenied(url, apiKey, table);
}

await assertAnonymousRetirementRpcDenied(url, apiKey, 'admin_retire_venue', 'p_venue_id');
await assertAnonymousRetirementRpcDenied(url, apiKey, 'admin_restore_venue', 'p_venue_id');
await assertAnonymousRetirementRpcDenied(url, apiKey, 'admin_retire_event', 'p_event_id');
await assertAnonymousRetirementRpcDenied(url, apiKey, 'admin_restore_event', 'p_event_id');

console.log(`PASS production read-only smoke for ${productionProjectRef}`);
