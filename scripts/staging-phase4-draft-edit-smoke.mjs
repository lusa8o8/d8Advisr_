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
  assert(result.response.ok && result.body?.access_token, `Staging sign-in failed: HTTP ${result.response.status}`);
  return { accessToken: result.body.access_token, userId: result.body.user.id };
}

async function createVenue(url, apiKey, accessToken, payload) {
  return request(url, apiKey, '/rest/v1/rpc/admin_create_venue', {
    method: 'POST', accessToken, body: { p_payload: payload },
  });
}

async function editVenue(url, apiKey, accessToken, venueId, payload, expectedUpdatedAt) {
  return request(url, apiKey, '/rest/v1/rpc/admin_update_draft_venue', {
    method: 'POST', accessToken,
    body: { p_venue_id: venueId, p_payload: payload, p_expected_updated_at: expectedUpdatedAt },
  });
}

const client = await readEnv('artifacts/d8advisr/.env.staging.local');
const identities = await readEnv('.env.staging.test.local');
const url = client.VITE_SUPABASE_URL;
const apiKey = client.VITE_SUPABASE_ANON_KEY;
assert(url?.includes('bntxnjfftikmaqnbskkq'), 'Draft-edit tests refuse to run outside the staging project');

const consumer = await session(url, apiKey, identities.STAGING_CONSUMER_EMAIL, identities.STAGING_CONSUMER_PASSWORD);
const partner = await session(url, apiKey, identities.STAGING_PARTNER_EMAIL, identities.STAGING_PARTNER_PASSWORD);
const admin = await session(url, apiKey, identities.STAGING_ADMIN_EMAIL, identities.STAGING_ADMIN_PASSWORD);

const marker = `draft-edit-${Date.now()}`;
let venueId = null;
let failure = null;

try {
  const created = await createVenue(url, apiKey, admin.accessToken, {
    request_key: crypto.randomUUID(),
    name: `Original ${marker}`,
    city: 'Lusaka',
    category: 'Test venue',
    area: 'Original area',
    description: 'Original description',
    attribution: 'unclaimed',
    publication_status: 'draft',
  });
  assert(created.response.ok && typeof created.body === 'string', `Draft fixture creation failed: HTTP ${created.response.status}`);
  venueId = created.body;

  const before = await request(url, apiKey, `/rest/v1/venues?select=id,name,city,category,area,description,avg_cost_pp,vibes,source,partner_id,operator_organization_id,listing_status,is_active,verification_status,tier,updated_at&id=eq.${venueId}`, { accessToken: admin.accessToken });
  assert(before.response.ok && before.body?.length === 1, 'Admin could not read draft fixture');
  const original = before.body[0];

  for (const [label, identity] of [['consumer', consumer], ['partner', partner]]) {
    const denied = await editVenue(url, apiKey, identity.accessToken, venueId, { name: `Denied ${marker}` }, original.updated_at);
    assert([401, 403].includes(denied.response.status), `${label} draft edit expected HTTP 401/403, got ${denied.response.status}`);
  }
  console.log('PASS consumer and partner identities cannot edit admin venue drafts');

  const unsupported = await editVenue(url, apiKey, admin.accessToken, venueId, { listing_status: 'live' }, original.updated_at);
  assert(!unsupported.response.ok && unsupported.body?.code === '22023', 'Unsupported publication field was not rejected');
  console.log('PASS draft editor rejects protected/unknown payload fields');

  const edited = await editVenue(url, apiKey, admin.accessToken, venueId, {
    name: `Corrected ${marker}`,
    area: 'Kabulonga',
    description: 'Corrected before approval',
    avg_cost_pp: 275,
    images: ['https://example.com/cover.jpg', 'https://example.com/gallery.jpg'],
    cover_image: 'https://example.com/cover.jpg',
    vibes: ['Romantic', 'Relaxing'],
  }, original.updated_at);
  assert(edited.response.ok && edited.body?.id === venueId, `Eligible draft edit failed: HTTP ${edited.response.status}`);
  assert(edited.body.name === `Corrected ${marker}` && edited.body.area === 'Kabulonga', 'Draft edit values were not applied');
  assert(edited.body.avg_cost_pp === 275 && edited.body.vibes?.join('|') === 'Romantic|Relaxing', 'Draft cost/vibes were not applied');
  assert(edited.body.cover_image === 'https://example.com/cover.jpg' && edited.body.images?.length === 2, 'Draft gallery was not applied');
  assert(edited.body.source === original.source && edited.body.partner_id === original.partner_id, 'Draft edit changed provenance/ownership');
  assert(edited.body.listing_status === 'draft' && edited.body.is_active === false && edited.body.verification_status === 'unverified', 'Draft edit changed publication/verification state');
  assert(edited.body.tier === original.tier, 'Draft edit changed tier');
  console.log('PASS eligible admin draft fields update while protected state is preserved');

  const audit = await request(url, apiKey, `/rest/v1/venue_change_log?select=field_name,changed_by,reverification_reason,created_reverification&venue_id=eq.${venueId}&reverification_reason=eq.admin_draft_correction`, { accessToken: admin.accessToken });
  assert(audit.response.ok && audit.body.length === 7, `Expected 7 draft correction audit rows, got ${audit.body?.length}`);
  assert(audit.body.every(row => row.changed_by === admin.userId && row.reverification_reason === 'admin_draft_correction' && row.created_reverification === false), 'Draft audit actor/reason is incorrect');
  assert(new Set(audit.body.map(row => row.field_name)).size === 7, 'Draft audit contains duplicate fields');
  console.log('PASS each changed field has an atomic admin audit row');

  const stale = await editVenue(url, apiKey, admin.accessToken, venueId, { description: 'Stale overwrite' }, original.updated_at);
  assert(!stale.response.ok, `Stale edit unexpectedly succeeded: HTTP ${stale.response.status}`);
  assert(stale.body?.code === 'P0001', `Stale edit expected non-retryable conflict P0001, got ${stale.body?.code}`);
  console.log('PASS stale admin writes are rejected');

  const sources = await request(url, apiKey, '/rest/v1/venues?select=id,updated_at,source,partner_id,listing_status&or=(partner_id.not.is.null,source.is.null)&limit=20', { accessToken: admin.accessToken });
  assert(sources.response.ok, 'Could not load ineligible staging venue samples');
  const partnerVenue = sources.body.find(row => row.partner_id);
  const legacyVenue = sources.body.find(row => row.source === null && !row.partner_id);
  assert(partnerVenue && legacyVenue, 'Staging is missing partner/legacy denial samples');

  for (const [label, sample] of [['partner-owned', partnerVenue], ['legacy', legacyVenue]]) {
    const denied = await editVenue(url, apiKey, admin.accessToken, sample.id, { description: `Denied ${marker}` }, sample.updated_at);
    assert(denied.response.status === 403, `${label} venue edit expected HTTP 403, got ${denied.response.status}`);
  }
  console.log('PASS partner-owned and legacy venues cannot use the bounded editor');

  const approve = await request(url, apiKey, '/rest/v1/rpc/admin_update_venue_listing_status', {
    method: 'POST', accessToken: admin.accessToken,
    body: { venue_id: venueId, new_status: 'live', reason: null },
  });
  assert(approve.response.ok && approve.body?.listing_status === 'live', 'Could not publish draft fixture for live denial test');

  const liveDenied = await editVenue(url, apiKey, admin.accessToken, venueId, { description: 'Live overwrite' }, approve.body.updated_at);
  assert(liveDenied.response.status === 403, `Live venue edit expected HTTP 403, got ${liveDenied.response.status}`);
  console.log('PASS live D8-admin venues cannot use the draft editor');
} catch (caught) {
  failure = caught;
} finally {
  if (venueId) {
    const cleanup = await request(url, apiKey, `/rest/v1/venues?id=eq.${venueId}`, {
      method: 'DELETE', accessToken: admin.accessToken, prefer: 'return=minimal',
    });
    if (!cleanup.response.ok && failure === null) failure = new Error(`Could not clean up draft-edit fixture: HTTP ${cleanup.response.status}`);
  }
}

if (failure) throw failure;

const remainingAudit = await request(url, apiKey, `/rest/v1/venue_change_log?select=id&venue_id=eq.${venueId}`, { accessToken: admin.accessToken });
assert(remainingAudit.response.ok && remainingAudit.body.length === 0, 'Draft-edit audit cleanup did not cascade');
console.log('PASS draft-edit fixture and audit history were cleaned up');
console.log('Phase 4 staging admin draft venue editing checks completed successfully.');
