import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const env = path => Object.fromEntries(readFileSync(resolve(root, path), 'utf8')
  .split(/\r?\n/).map(line => line.trim())
  .filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
const client = env('artifacts/d8advisr/.env.staging.local');
const identities = env('.env.staging.test.local');
const url = client.VITE_SUPABASE_URL;
const key = client.VITE_SUPABASE_ANON_KEY;
if (!url?.includes('bntxnjfftikmaqnbskkq')) throw new Error('Phase 4.6A smoke test refuses to run outside staging');

const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function request(path, token = key, method = 'GET', body, prefer = ['PATCH', 'DELETE'].includes(method) ? 'return=minimal' : 'return=representation') {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: prefer },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  return { response, data };
}
async function signIn(email, password) {
  const result = await request('/auth/v1/token?grant_type=password', key, 'POST', { email, password });
  assert(result.response.ok && result.data?.access_token && result.data?.user?.id, `Sign-in failed for ${email}: HTTP ${result.response.status}`);
  return { token: result.data.access_token, id: result.data.user.id };
}
async function one(path, token, label) {
  const result = await request(path, token);
  assert(result.response.ok, `${label}: HTTP ${result.response.status} ${JSON.stringify(result.data)}`);
  assert(Array.isArray(result.data) && result.data.length === 1, `${label}: expected one row`);
  return result.data[0];
}
async function expectDenied(result, label) {
  assert([400, 401, 403, 409].includes(result.response.status), `${label}: expected denial, got HTTP ${result.response.status}`);
}

const partner = await signIn(identities.STAGING_PARTNER_EMAIL, identities.STAGING_PARTNER_PASSWORD);
const admin = await signIn(identities.STAGING_ADMIN_EMAIL, identities.STAGING_ADMIN_PASSWORD);
const consumer = await signIn(identities.STAGING_CONSUMER_EMAIL, identities.STAGING_CONSUMER_PASSWORD);
const policy = { p_policy_id: 'partner-event-publishing-v1.0', p_policy_version: '1.0', p_acknowledged: true };

const exception = await one('/rest/v1/event_commercial_migration_exceptions?select=event_id,reason,previous_status,event_snapshot&reason=eq.live_paid_event_requires_positive_price', admin.token, 'Migration exception');
assert(exception.previous_status === 'live', 'Invalid legacy event was not recorded as previously live');
const quarantined = await one(`/rest/v1/events?select=event_status,is_free,price_pp&id=eq.${exception.event_id}`, admin.token, 'Quarantined event');
assert(quarantined.event_status === 'draft' && !quarantined.is_free && Number(quarantined.price_pp) === 0, 'Invalid legacy event was silently changed instead of quarantined');

const legacy = await request('/rest/v1/events?select=id,first_published_at,initial_published_price,initial_published_currency,commercial_baseline_source&commercial_baseline_source=eq.legacy_backfill', admin.token);
assert(legacy.response.ok && legacy.data.length >= 5, 'Valid legacy live baselines were not backfilled');
assert(legacy.data.every(row => row.first_published_at && row.initial_published_price != null && row.initial_published_currency), 'Legacy baseline is incomplete');
console.log('PASS invalid legacy event quarantined and valid legacy baselines preserved');

const platformAdmin = await request('/rest/v1/rpc/is_platform_admin', admin.token, 'POST', { user_uuid: admin.id });
assert(platformAdmin.response.ok && platformAdmin.data === true, 'Current admin was not backfilled as platform admin');
const consumerAdmin = await request('/rest/v1/rpc/is_platform_admin', consumer.token, 'POST', { user_uuid: consumer.id });
assert(consumerAdmin.response.ok && consumerAdmin.data === false, 'Consumer received platform admin scope');
const consumerAssignments = await request('/rest/v1/admin_access_assignments?select=id,user_id,role', consumer.token);
assert(consumerAssignments.response.ok && consumerAssignments.data.length === 0, 'Admin scope assignments leaked to consumer');
console.log('PASS additive admin scope backfill and isolation');

async function ensurePartnerDraft(title, price) {
  const existing = await request(`/rest/v1/events?select=id,event_status,is_free,price_pp,first_published_at&title=eq.${encodeURIComponent(title)}`, partner.token);
  assert(existing.response.ok, `Fixture lookup failed: HTTP ${existing.response.status}`);
  if (existing.data.length) return existing.data[0];
  const created = await request('/rest/v1/events?select=id,event_status,is_free,price_pp,first_published_at', partner.token, 'POST', {
    title, description: 'Persistent Phase 4.6A staging contract fixture', category: 'Community Event',
    starts_at: '2030-08-18T18:00:00+02:00', city: 'Lusaka', region_id: 'lusaka',
    currency: 'ZMW', event_status: 'draft', event_location_kind: 'undisclosed',
    venue_page_status: 'hidden', partner_id: partner.id, spots_total: 0, spots_filled: 0,
    is_free: false, price_pp: price, frequency: 'one-off', vibes: [], images: [],
  });
  assert(created.response.ok && created.data?.[0]?.id, `Partner draft creation failed: HTTP ${created.response.status} ${JSON.stringify(created.data)}`);
  return created.data[0];
}

const paid = await ensurePartnerDraft('Phase 4.6A paid contract fixture', 150.50);
if (!paid.first_published_at) {
  await expectDenied(await request(`/rest/v1/events?id=eq.${paid.id}`, partner.token, 'PATCH', { event_status: 'live' }), 'Direct draft publication');
  await expectDenied(await request('/rest/v1/rpc/publish_event_with_policy', partner.token, 'POST', { ...policy, p_event_id: paid.id, p_acknowledged: false, p_request_key: '46a00000-0000-4000-8000-000000000001' }), 'Publication without acknowledgement');
  await expectDenied(await request('/rest/v1/rpc/publish_event_with_policy', consumer.token, 'POST', { ...policy, p_event_id: paid.id, p_request_key: '46a00000-0000-4000-8000-000000000002' }), 'Consumer publication');
  const published = await request('/rest/v1/rpc/publish_event_with_policy', partner.token, 'POST', { ...policy, p_event_id: paid.id, p_request_key: '46a00000-0000-4000-8000-000000000003' });
  assert(published.response.ok, `Partner publication failed: HTTP ${published.response.status} ${JSON.stringify(published.data)}`);
  const retry = await request('/rest/v1/rpc/publish_event_with_policy', partner.token, 'POST', { ...policy, p_event_id: paid.id, p_request_key: '46a00000-0000-4000-8000-000000000003' });
  assert(retry.response.ok, 'Idempotent publication retry failed');
}
const acknowledgements = await request(`/rest/v1/event_publication_acknowledgements?select=id,event_id,policy_id,policy_version,policy_content_hash,request_key&event_id=eq.${paid.id}`, partner.token);
assert(acknowledgements.response.ok, 'Publication acknowledgements could not be read');
assert(acknowledgements.data.filter(row => row.request_key === '46a00000-0000-4000-8000-000000000003').length === 1, 'First-publication acknowledgement was missing or duplicated');
assert(new Set(acknowledgements.data.map(row => row.request_key)).size === acknowledgements.data.length, 'An acknowledgement request key was duplicated');
let paidState = await one(`/rest/v1/events?select=event_status,is_free,price_pp,currency,first_published_at,initial_published_price,initial_published_currency&id=eq.${paid.id}`, admin.token, 'Paid fixture');
assert(paidState.event_status === 'live' && paidState.first_published_at, 'Publication baseline was not established');
await expectDenied(await request(`/rest/v1/events?id=eq.${paid.id}`, partner.token, 'PATCH', { price_pp: Number(paidState.price_pp) + 1 }), 'Partner price increase');
await expectDenied(await request(`/rest/v1/events?id=eq.${paid.id}`, admin.token, 'PATCH', { price_pp: Number(paidState.price_pp) + 1 }), 'Admin price increase');
if (Number(paidState.price_pp) > 100) {
  const reduction = await request(`/rest/v1/events?id=eq.${paid.id}`, partner.token, 'PATCH', { price_pp: 100 });
  assert(reduction.response.ok, `Price reduction failed: HTTP ${reduction.response.status} ${JSON.stringify(reduction.data)}`);
}
await expectDenied(await request(`/rest/v1/events?id=eq.${paid.id}`, partner.token, 'PATCH', { price_pp: 101 }), 'Increase after reduction');
await expectDenied(await request(`/rest/v1/events?id=eq.${paid.id}`, admin.token, 'PATCH', { currency: 'NGN' }), 'Currency change');
const paused = await request(`/rest/v1/events?id=eq.${paid.id}`, partner.token, 'PATCH', { event_status: 'paused' });
assert(paused.response.ok, 'Partner could not pause published event');
await expectDenied(await request(`/rest/v1/events?id=eq.${paid.id}`, partner.token, 'PATCH', { event_status: 'live' }), 'Direct resume');
const resumed = await request('/rest/v1/rpc/publish_event_with_policy', partner.token, 'POST', { ...policy, p_event_id: paid.id, p_request_key: '46a00000-0000-4000-8000-000000000004' });
assert(resumed.response.ok, `Policy resume failed: HTTP ${resumed.response.status}`);
console.log('PASS partner publication, acknowledgement, monotonic price, currency, and resume protections');

const transition = await ensurePartnerDraft('Phase 4.6A paid-to-free fixture', 50);
if (!transition.first_published_at) {
  const result = await request('/rest/v1/rpc/publish_event_with_policy', partner.token, 'POST', { ...policy, p_event_id: transition.id, p_request_key: '46a00000-0000-4000-8000-000000000005' });
  assert(result.response.ok, 'Paid-to-free fixture publication failed');
}
let transitionState = await one(`/rest/v1/events?select=is_free,price_pp,first_published_at&id=eq.${transition.id}`, admin.token, 'Paid-to-free fixture');
if (!transitionState.is_free) {
  const free = await request(`/rest/v1/events?id=eq.${transition.id}`, partner.token, 'PATCH', { is_free: true, price_pp: 0 });
  assert(free.response.ok, `Paid-to-free change failed: HTTP ${free.response.status}`);
}
await expectDenied(await request(`/rest/v1/events?id=eq.${transition.id}`, partner.token, 'PATCH', { is_free: false, price_pp: 25 }), 'Free-to-paid change');
console.log('PASS paid-to-free allowed and subsequent free-to-paid blocked');

const adminRequest = '46a00000-0000-4000-8000-000000000006';
const adminPayload = {
  request_key: adminRequest, title: 'Phase 4.6A admin publication fixture', city: 'Lusaka',
  category: 'Community Event', starts_at: '2030-08-19T18:00:00+02:00', attribution: 'd8advisr',
  publication_status: 'live', event_location_kind: 'undisclosed', price_pp: 25.50, currency: 'ZMW',
  capacity: 0, is_free: false, images: [], vibes: [], frequency: 'one-off',
  policy_id: 'partner-event-publishing-v1.0', policy_version: '1.0', policy_acknowledged: true,
};
await expectDenied(await request('/rest/v1/rpc/admin_create_event', admin.token, 'POST', {
  p_payload: { ...adminPayload, request_key: '46a00000-0000-4000-8000-000000000007', title: 'Phase 4.6A denied admin fixture', policy_acknowledged: false },
}), 'Admin publication without acknowledgement');
const adminCreated = await request('/rest/v1/rpc/admin_create_event', admin.token, 'POST', { p_payload: adminPayload });
assert(adminCreated.response.ok && typeof adminCreated.data === 'string', `Admin acknowledged publication failed: HTTP ${adminCreated.response.status} ${JSON.stringify(adminCreated.data)}`);
const adminEvent = await one(`/rest/v1/events?select=event_status,price_pp,first_published_at,commercial_baseline_source&id=eq.${adminCreated.data}`, admin.token, 'Admin event');
assert(adminEvent.event_status === 'live' && Number(adminEvent.price_pp) === 25.5 && adminEvent.first_published_at, 'Admin event did not use decimal publication contract');
console.log('PASS admin publication uses the shared acknowledged contract');

const adminDraftPayload = {
  request_key: '46a00000-0000-4000-8000-000000000008', title: 'Phase 4.6A admin draft browser fixture',
  city: 'Lusaka', category: 'Community Event', description: 'Matches the admin browser payload shape.',
  starts_at: '2030-08-26T10:17:00.000Z', ends_at: null, attribution: 'd8advisr',
  publication_status: 'draft', event_location_kind: 'undisclosed', venue_id: null,
  external_location_name: null, external_location_address: null, price_pp: 0, currency: 'K',
  capacity: 0, is_free: true, is_featured: false, cover_image: null, images: [], vibes: [], emoji: '📅',
  frequency: 'one-off', policy_id: 'partner-event-publishing-v1.0', policy_version: '1.0',
  policy_acknowledged: false,
};
const adminDraftCreated = await request('/rest/v1/rpc/admin_create_event', admin.token, 'POST', { p_payload: adminDraftPayload });
assert(adminDraftCreated.response.ok && typeof adminDraftCreated.data === 'string', `Admin draft creation failed: HTTP ${adminDraftCreated.response.status} ${JSON.stringify(adminDraftCreated.data)}`);
const adminDraft = await one(`/rest/v1/events?select=event_status,is_free,price_pp,spots_total,currency,first_published_at&id=eq.${adminDraftCreated.data}`, admin.token, 'Admin draft event');
assert(adminDraft.event_status === 'draft' && adminDraft.is_free && Number(adminDraft.price_pp) === 0, 'Admin free draft did not preserve draft/free state');
assert(Number(adminDraft.spots_total) === 0 && adminDraft.currency === 'ZMW' && adminDraft.first_published_at === null, 'Admin open-attendance draft did not apply canonical region or publication state');
console.log('PASS admin free/open-attendance draft matches the browser payload contract');

console.log('Phase 4.6A staging commercial checks completed successfully.');
