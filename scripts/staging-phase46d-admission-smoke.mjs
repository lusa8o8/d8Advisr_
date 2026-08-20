import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

async function env(path) {
  const source = await readFile(resolve(root, path), 'utf8');
  return Object.fromEntries(source.split(/\r?\n/).map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(url, key, path, token, method = 'GET', body) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { response, body: parsed };
}

const app = await env('artifacts/d8advisr-partner/.env.staging.local');
const identities = await env('.env.staging.test.local');
const url = app.VITE_SUPABASE_URL;
const key = app.VITE_SUPABASE_ANON_KEY;

const login = await request(url, key, '/auth/v1/token?grant_type=password', key, 'POST', {
  email: identities.STAGING_PARTNER_EMAIL,
  password: identities.STAGING_PARTNER_PASSWORD,
});
assert(login.response.ok && login.body?.access_token && login.body?.user?.id, 'Partner staging sign-in failed');
const token = login.body.access_token;
const userId = login.body.user.id;

const application = await request(
  url,
  key,
  '/rest/v1/partner_applications?select=id,status,partner_type,city,region_id,review_reason,reviewed_at,submitted_at',
  token,
);
assert(application.response.ok && application.body?.length === 1, 'Partner application contract is unavailable');
assert(application.body[0].status === 'live', 'Staging partner must remain approved');
assert(application.body[0].region_id === 'lusaka', 'Application region was not canonically backfilled');

const directEscalation = await request(
  url,
  key,
  `/rest/v1/partner_applications?id=eq.${application.body[0].id}`,
  token,
  'PATCH',
  { partner_type: 'organizer' },
);
assert(!directEscalation.response.ok, 'Approved partner can still directly change application type');

const invalidResubmit = await request(url, key, '/rest/v1/rpc/submit_partner_application', token, 'POST', {
  p_name: 'Must not replace live application',
  p_partner_type: 'organizer',
  p_region_id: 'lusaka',
  p_contact: '+260000000000',
});
assert(!invalidResubmit.response.ok, 'Approved application was unexpectedly resubmitted');

for (const capability of ['events', 'venues']) {
  const result = await request(url, key, '/rest/v1/rpc/live_partner_can', token, 'POST', {
    user_uuid: userId,
    capability,
  });
  assert(result.response.ok && result.body === true, `Staging both partner lacks ${capability} capability`);
}

console.log('PASS application review columns and canonical region backfill');
console.log('PASS approved application type cannot be directly escalated or resubmitted');
console.log('PASS approved both partner retains venue and event capabilities');
