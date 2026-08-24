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

async function assertPublicRead(url, apiKey, table, minimumRows) {
  const { response, body } = await request(url, apiKey, `/rest/v1/${table}?select=id&limit=1000`);
  assert(response.status === 200, `${table} public read returned HTTP ${response.status}: ${body}`);
  const count = exactCount(response, body);
  assert(Number.isInteger(count), `${table} response did not expose a count`);
  assert(count >= minimumRows, `${table} expected at least ${minimumRows} rows, received ${count}`);
  console.log(`PASS public ${table}: ${count} rows`);
}

async function assertAnonymousDenied(url, apiKey, table) {
  const { response } = await request(url, apiKey, `/rest/v1/${table}?select=*&limit=1`);
  assert(
    response.status === 401 || response.status === 403,
    `${table} anonymous read expected HTTP 401/403, received ${response.status}`,
  );
  console.log(`PASS private ${table}: anonymous HTTP ${response.status}`);
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
await assertPublicRead(url, apiKey, 'listing_categories', 1);
await assertPublicRead(url, apiKey, 'listing_vibes', 1);

for (const table of ['plans', 'partner_applications', 'consumer_notifications']) {
  await assertAnonymousDenied(url, apiKey, table);
}

console.log(`PASS production read-only smoke for ${productionProjectRef}`);
