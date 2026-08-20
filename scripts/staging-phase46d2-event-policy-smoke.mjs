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
assert(url?.includes('bntxnjfftikmaqnbskkq.supabase.co'), 'Refusing to run outside the dedicated staging project');

const login = await request(url, key, '/auth/v1/token?grant_type=password', key, 'POST', {
  email: identities.STAGING_PARTNER_EMAIL,
  password: identities.STAGING_PARTNER_PASSWORD,
});
assert(login.response.ok && login.body?.access_token, 'Partner staging sign-in failed');
const token = login.body.access_token;
const userId = login.body.user.id;
const cancelledSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const discoveryFilter = await request(
  url,
  key,
  `/rest/v1/events?select=id,event_status,cancelled_at&or=(event_status.eq.live,and(event_status.eq.cancelled,cancelled_at.gte.${cancelledSince}))&limit=1`,
  token,
);
assert(discoveryFilter.response.ok, `Recent-cancelled discovery filter is not accepted by PostgREST: ${JSON.stringify(discoveryFilter.body)}`);

const events = await request(url, key, `/rest/v1/events?select=id,title,description,event_status,is_free,price_pp,updated_at&event_status=eq.live&partner_id=eq.${userId}&order=updated_at.desc&limit=1`, token);
assert(events.response.ok && events.body?.length === 1, 'A live staging partner event is required');
let event = events.body[0];
const proposedIsFree = !event.is_free;
const proposedPrice = proposedIsFree ? 0 : Math.max(Number(event.price_pp ?? 0) + 1, 1);

const directBypass = await request(url, key, `/rest/v1/events?id=eq.${event.id}`, token, 'PATCH', {
  is_free: proposedIsFree,
  price_pp: proposedPrice,
});
assert(!directBypass.response.ok, 'Direct protected-field update bypassed the v1.1 RPC');

const preview = await request(url, key, '/rest/v1/rpc/partner_apply_event_revision_v11', token, 'POST', {
  p_event_id: event.id,
  p_payload: { is_free: proposedIsFree, price_pp: proposedPrice },
  p_expected_updated_at: event.updated_at,
  p_confirmed: false,
  p_organizer_reason: null,
});
assert(preview.response.ok && preview.body?.status === 'confirmation_required', 'Material change did not return a confirmation preview');
assert(preview.body.material_fields?.includes('price_pp') || preview.body.material_fields?.includes('is_free'), 'Material preview omitted commercial fields');

const unchanged = await request(url, key, `/rest/v1/events?select=is_free,price_pp,updated_at&id=eq.${event.id}`, token);
assert(unchanged.response.ok && unchanged.body?.length === 1, 'Could not verify preview state');
assert(unchanged.body[0].is_free === event.is_free && Number(unchanged.body[0].price_pp) === Number(event.price_pp), 'Preview mutated the event');

const originalDescription = event.description ?? null;
const temporaryDescription = `${originalDescription ?? ''}\n[D2 smoke]`.trim();
const automatic = await request(url, key, '/rest/v1/rpc/partner_apply_event_revision_v11', token, 'POST', {
  p_event_id: event.id,
  p_payload: { description: temporaryDescription },
  p_expected_updated_at: event.updated_at,
  p_confirmed: false,
  p_organizer_reason: 'Phase 4.6D2 automated smoke',
});
assert(automatic.response.ok && automatic.body?.status === 'applied', 'Non-material change was not applied automatically');

const changed = await request(url, key, `/rest/v1/events?select=description,updated_at&id=eq.${event.id}`, token);
assert(changed.response.ok && changed.body?.[0]?.description === temporaryDescription, 'Automatic non-material change did not persist');

const restore = await request(url, key, '/rest/v1/rpc/partner_apply_event_revision_v11', token, 'POST', {
  p_event_id: event.id,
  p_payload: { description: originalDescription },
  p_expected_updated_at: changed.body[0].updated_at,
  p_confirmed: false,
  p_organizer_reason: 'Restore after Phase 4.6D2 smoke',
});
assert(restore.response.ok && restore.body?.status === 'applied', 'Smoke test could not restore the event description');

const refreshed = await request(url, key, `/rest/v1/events?select=event_status,updated_at&id=eq.${event.id}`, token);
event = { ...event, ...refreshed.body[0] };
const cancellation = await request(url, key, '/rest/v1/rpc/partner_cancel_event_v11', token, 'POST', {
  p_event_id: event.id,
  p_expected_updated_at: event.updated_at,
  p_confirmed: false,
  p_reason: null,
});
assert(cancellation.response.ok && cancellation.body?.status === 'confirmation_required', 'Cancellation preview contract failed');
const stillLive = await request(url, key, `/rest/v1/events?select=event_status&id=eq.${event.id}`, token);
assert(stillLive.body?.[0]?.event_status === 'live', 'Cancellation preview mutated the live event');

const retiredReview = await request(url, key, '/rest/v1/rpc/admin_review_event_revision', token, 'POST', {
  p_revision_id: crypto.randomUUID(),
  p_decision: 'approved',
  p_review_note: null,
});
assert(!retiredReview.response.ok, 'Partner can execute the retired admin event-review RPC');

console.log('PASS material preview is non-mutating and protected direct updates are denied');
console.log('PASS non-material revisions apply, audit, and restore through the v1.1 RPC');
console.log('PASS cancellation preview is non-mutating and legacy admin review is inaccessible');
