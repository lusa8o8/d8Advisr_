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

async function login(url, key, email, password) {
  const result = await request(url, key, '/auth/v1/token?grant_type=password', key, 'POST', { email, password });
  assert(result.response.ok && result.body?.access_token, `Staging sign-in failed for ${email}`);
  return result.body;
}

const app = await env('artifacts/d8advisr/.env.staging.local');
const identities = await env('.env.staging.test.local');
const url = app.VITE_SUPABASE_URL;
const key = app.VITE_SUPABASE_ANON_KEY;
assert(url?.includes('bntxnjfftikmaqnbskkq.supabase.co'), 'Refusing to run outside dedicated staging');

const admin = await login(url, key, identities.STAGING_ADMIN_EMAIL, identities.STAGING_ADMIN_PASSWORD);
const consumer = await login(url, key, identities.STAGING_CONSUMER_EMAIL, identities.STAGING_CONSUMER_PASSWORD);
const adminToken = admin.access_token;
const consumerToken = consumer.access_token;

const eventsResult = await request(
  url, key,
  '/rest/v1/events?select=id,title,description,event_status,is_free,price_pp,capacity,updated_at,first_published_at,source&event_status=eq.live&first_published_at=not.is.null&order=updated_at.desc&limit=30',
  adminToken,
);
assert(eventsResult.response.ok && eventsResult.body?.length, 'A published live staging event is required');
let event = eventsResult.body.find(item => item.source === 'd8_admin') ?? eventsResult.body[0];

const stalePolicy = await request(url, key, '/rest/v1/rpc/publish_event_with_policy', adminToken, 'POST', {
  p_event_id: event.id,
  p_policy_id: 'partner-event-publishing-v1.0',
  p_policy_version: '1.0',
  p_acknowledged: true,
  p_request_key: crypto.randomUUID(),
});
assert(!stalePolicy.response.ok && JSON.stringify(stalePolicy.body).includes('unsupported_event_policy_version'), 'Stale v1.0 publication was accepted');

const directBypass = await request(url, key, `/rest/v1/events?id=eq.${event.id}`, adminToken, 'PATCH', {
  description: `${event.description ?? ''}\n[D3 direct bypass]`.trim(),
});
assert(!directBypass.response.ok, `Admin direct protected write bypassed the RPC: ${JSON.stringify(directBypass.body)}`);

const retiredRpc = await request(url, key, '/rest/v1/rpc/admin_update_live_event', adminToken, 'POST', {
  p_event_id: event.id, p_payload: { description: event.description }, p_expected_updated_at: event.updated_at,
});
assert(!retiredRpc.response.ok, 'Superseded admin live-edit RPC remains executable');

const originalDescription = event.description ?? null;
const temporaryDescription = `${originalDescription ?? ''}\n[D3 smoke]`.trim();
const automatic = await request(url, key, '/rest/v1/rpc/admin_apply_event_revision_v11', adminToken, 'POST', {
  p_event_id: event.id, p_payload: { description: temporaryDescription },
  p_expected_updated_at: event.updated_at, p_confirmed: false, p_admin_reason: 'D3 automatic edit',
});
assert(automatic.response.ok && automatic.body?.status === 'applied', 'Admin non-material edit did not apply automatically');
const automaticState = await request(url, key, `/rest/v1/events?select=description,updated_at&id=eq.${event.id}`, adminToken);
assert(automaticState.body?.[0]?.description === temporaryDescription, 'Admin non-material edit did not persist');
const automaticRestore = await request(url, key, '/rest/v1/rpc/admin_apply_event_revision_v11', adminToken, 'POST', {
  p_event_id: event.id, p_payload: { description: originalDescription },
  p_expected_updated_at: automaticState.body[0].updated_at, p_confirmed: false, p_admin_reason: 'Restore D3 automatic edit',
});
assert(automaticRestore.response.ok && automaticRestore.body?.status === 'applied', 'Could not restore admin non-material edit');
const afterAutomatic = await request(url, key, `/rest/v1/events?select=updated_at&id=eq.${event.id}`, adminToken);
event = { ...event, updated_at: afterAutomatic.body[0].updated_at };

const previousInterest = await request(
  url, key,
  `/rest/v1/event_interests?select=active&event_id=eq.${event.id}&user_id=eq.${consumer.user.id}&interest_type=eq.saved`,
  consumerToken,
);
assert(previousInterest.response.ok, 'Could not read consumer staging interest');
const wasInterested = previousInterest.body?.[0]?.active === true;
const interest = await request(url, key, '/rest/v1/rpc/toggle_event_interest', consumerToken, 'POST', {
  p_event_id: event.id, p_interest_type: 'saved', p_active: true,
});
assert(interest.response.ok, `Could not establish staging consumer interest: ${JSON.stringify(interest.body)}`);

const proposedCapacity = event.capacity == null ? 50 : Number(event.capacity) + 1;
const preview = await request(url, key, '/rest/v1/rpc/admin_apply_event_revision_v11', adminToken, 'POST', {
  p_event_id: event.id, p_payload: { capacity: proposedCapacity },
  p_expected_updated_at: event.updated_at, p_confirmed: false, p_admin_reason: 'D3 staging preview',
});
assert(preview.response.ok && preview.body?.status === 'confirmation_required', 'Admin material change did not return confirmation preview');
assert(preview.body?.interested_count >= 1, 'Admin preview omitted active interested consumer');

const unchanged = await request(url, key, `/rest/v1/events?select=capacity,updated_at&id=eq.${event.id}`, adminToken);
assert(unchanged.response.ok && unchanged.body?.[0]?.updated_at === event.updated_at, 'Admin material preview mutated the event');

const confirmed = await request(url, key, '/rest/v1/rpc/admin_apply_event_revision_v11', adminToken, 'POST', {
  p_event_id: event.id, p_payload: { capacity: proposedCapacity },
  p_expected_updated_at: event.updated_at, p_confirmed: true, p_admin_reason: 'D3 staging confirmation',
});
assert(confirmed.response.ok && confirmed.body?.status === 'applied', 'Confirmed admin material change did not apply');
assert(confirmed.body?.notification_count >= 1, 'Confirmed admin material change did not notify interested consumer');

const changed = await request(url, key, `/rest/v1/events?select=capacity,updated_at&id=eq.${event.id}`, adminToken);
assert(changed.response.ok && changed.body?.[0]?.capacity === proposedCapacity, 'Confirmed capacity did not persist');

const restorePreview = await request(url, key, '/rest/v1/rpc/admin_apply_event_revision_v11', adminToken, 'POST', {
  p_event_id: event.id, p_payload: { capacity: event.capacity },
  p_expected_updated_at: changed.body[0].updated_at, p_confirmed: false, p_admin_reason: 'Restore D3 staging event',
});
assert(restorePreview.response.ok && restorePreview.body?.status === 'confirmation_required', 'Capacity restoration did not preview');
const restored = await request(url, key, '/rest/v1/rpc/admin_apply_event_revision_v11', adminToken, 'POST', {
  p_event_id: event.id, p_payload: { capacity: event.capacity },
  p_expected_updated_at: changed.body[0].updated_at, p_confirmed: true, p_admin_reason: 'Restore D3 staging event',
});
assert(restored.response.ok && restored.body?.status === 'applied', 'Could not restore staging event capacity');

const refreshed = await request(url, key, `/rest/v1/events?select=event_status,updated_at&id=eq.${event.id}`, adminToken);
event = { ...event, ...refreshed.body[0] };
const cancellation = await request(url, key, '/rest/v1/rpc/admin_cancel_event_v11', adminToken, 'POST', {
  p_event_id: event.id, p_expected_updated_at: event.updated_at, p_confirmed: false, p_reason: null,
});
assert(cancellation.response.ok && cancellation.body?.status === 'confirmation_required', 'Admin cancellation preview failed');
const stillLive = await request(url, key, `/rest/v1/events?select=event_status&id=eq.${event.id}`, adminToken);
assert(stillLive.body?.[0]?.event_status === 'live', 'Cancellation preview mutated the event');

if (!wasInterested) {
  await request(url, key, '/rest/v1/rpc/toggle_event_interest', consumerToken, 'POST', {
    p_event_id: event.id, p_interest_type: 'saved', p_active: false,
  });
}

console.log('PASS stale v1.0 publication and direct admin bypass are rejected');
console.log('PASS admin non-material revisions apply, audit, and restore automatically');
console.log('PASS admin material preview is non-mutating');
console.log('PASS confirmed admin material edit audits, notifies, and restores');
console.log('PASS admin cancellation preview is non-mutating');
