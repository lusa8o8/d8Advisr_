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

async function request(url, key, path, token, method = 'GET', body, prefer = 'return=representation') {
  const response = await fetch(`${url}${path}`, {
    method,
    signal: AbortSignal.timeout(60000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${token ?? key}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
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
  return { token: result.body.access_token, userId: result.body.user.id };
}

const app = await env('artifacts/d8advisr-partner/.env.staging.local');
const identities = await env('.env.staging.test.local');
const url = app.VITE_SUPABASE_URL;
const key = app.VITE_SUPABASE_ANON_KEY;
assert(url?.includes('bntxnjfftikmaqnbskkq.supabase.co'), 'Refusing to run outside dedicated staging');

const [admin, venueManager, organizer, consumer] = await Promise.all([
  login(url, key, identities.STAGING_ADMIN_EMAIL, identities.STAGING_ADMIN_PASSWORD),
  login(url, key, identities.STAGING_PARTNER_EMAIL, identities.STAGING_PARTNER_PASSWORD),
  login(url, key, identities.STAGING_PARTNER_2_EMAIL, identities.STAGING_PARTNER_PASSWORD),
  login(url, key, identities.STAGING_CONSUMER_EMAIL, identities.STAGING_CONSUMER_PASSWORD),
]);

const venues = await request(url, key,
  `/rest/v1/venues?select=id,name&partner_id=eq.${venueManager.userId}&limit=1`, venueManager.token);
assert(venues.response.ok && venues.body?.length === 1, 'Staging venue-manager fixture is unavailable');
const venue = venues.body[0];

const marker = `phase46d4-workflow-${Date.now()}`;
let eventId = null;
let relationshipId = null;
let failure = null;

try {
  const created = await request(url, key, '/rest/v1/events?select=id', admin.token, 'POST', {
    title: `D4 partner workflow ${marker}`,
    city: 'Lusaka',
    category: 'Test event',
    starts_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 86400000 + 7200000).toISOString(),
    event_location_kind: 'd8_venue',
    venue_id: venue.id,
    is_free: true,
    price_pp: 0,
    currency: 'ZMW',
    partner_id: organizer.userId,
    source: 'partner',
    event_status: 'draft',
  });
  assert(created.response.ok && created.body?.[0]?.id, `Could not create partner workflow fixture: ${JSON.stringify(created.body)}`);
  eventId = created.body[0].id;

  const relationship = await request(url, key,
    `/rest/v1/event_venue_relationships?select=id,version&event_id=eq.${eventId}&is_active=eq.true`, admin.token);
  assert(relationship.response.ok && relationship.body?.length === 1, 'Canonical relationship was not created');
  relationshipId = relationship.body[0].id;
  let version = relationship.body[0].version;

  const [venueWorkflow, organizerWorkflow, consumerWorkflow] = await Promise.all([
    request(url, key, '/rest/v1/rpc/get_partner_event_venue_workflows', venueManager.token, 'POST', {}),
    request(url, key, '/rest/v1/rpc/get_partner_event_venue_workflows', organizer.token, 'POST', {}),
    request(url, key, '/rest/v1/rpc/get_partner_event_venue_workflows', consumer.token, 'POST', {}),
  ]);
  const venueRow = venueWorkflow.body?.find(row => row.relationship_id === relationshipId);
  const organizerRow = organizerWorkflow.body?.find(row => row.relationship_id === relationshipId);
  assert(venueWorkflow.response.ok && venueRow?.can_manage_venue === true && venueRow.can_manage_event === false,
    'Venue manager did not receive the safe venue workflow view');
  assert(organizerWorkflow.response.ok && organizerRow?.can_manage_event === true && organizerRow.can_manage_venue === false,
    'Organizer did not receive the safe organizer workflow view');
  assert(consumerWorkflow.response.ok && !consumerWorkflow.body?.some(row => row.relationship_id === relationshipId),
    'Consumer received an operational venue workflow row');

  const createdNotices = await request(url, key,
    `/rest/v1/partner_notifications?select=id,user_id,metadata&event_venue_relationship_id=eq.${relationshipId}`, venueManager.token);
  assert(createdNotices.response.ok && createdNotices.body?.length === 1,
    `Persisted attribution did not create exactly one venue notice: ${JSON.stringify(createdNotices.body)}`);
  assert(createdNotices.body[0].metadata?.relationship_action === 'created', 'Venue notice lacks relationship action metadata');

  const forgedNotice = await request(url, key, '/rest/v1/partner_notifications', organizer.token, 'POST', {
    user_id: organizer.userId,
    type: 'system',
    title: 'forged',
    body: 'forged',
  });
  assert(!forgedNotice.response.ok, 'Partner can forge durable partner notifications');

  const approved = await request(url, key, '/rest/v1/rpc/decide_event_venue_placement', venueManager.token, 'POST', {
    p_relationship_id: relationshipId,
    p_decision: 'approved',
    p_reason: 'D4 workflow approval',
    p_expected_version: version,
  });
  assert(approved.response.ok && approved.body?.placement_status === 'approved', 'Venue workflow approval failed');
  version = approved.body.version;

  const organizerApprovalNotices = await request(url, key,
    `/rest/v1/partner_notifications?select=id,metadata&event_venue_relationship_id=eq.${relationshipId}`, organizer.token);
  assert(organizerApprovalNotices.response.ok
    && organizerApprovalNotices.body?.filter(row => row.metadata?.relationship_action === 'placement_approved').length === 1,
  'Organizer did not receive exactly one placement decision notice');

  const disputed = await request(url, key, '/rest/v1/rpc/report_event_venue_attribution', venueManager.token, 'POST', {
    p_relationship_id: relationshipId,
    p_reason: 'D4 workflow incorrect venue report',
    p_expected_version: version,
  });
  assert(disputed.response.ok && disputed.body?.attribution_status === 'disputed', 'Venue report failed');
  version = disputed.body.version;

  const organizerDisputeNotices = await request(url, key,
    `/rest/v1/partner_notifications?select=id,metadata&event_venue_relationship_id=eq.${relationshipId}`, organizer.token);
  assert(organizerDisputeNotices.body?.filter(row => row.metadata?.relationship_action === 'attribution_disputed').length === 1,
    'Organizer did not receive exactly one attribution dispute notice');

  const responded = await request(url, key, '/rest/v1/rpc/respond_event_venue_dispute', organizer.token, 'POST', {
    p_relationship_id: relationshipId,
    p_response: 'D4 workflow organizer response',
    p_expected_version: version,
  });
  assert(responded.response.ok && responded.body?.response_reason, 'Organizer dispute response failed');

  const retriedResponse = await request(url, key, '/rest/v1/rpc/respond_event_venue_dispute', organizer.token, 'POST', {
    p_relationship_id: relationshipId,
    p_response: 'D4 workflow organizer response',
    p_expected_version: version,
  });
  assert(retriedResponse.response.ok && retriedResponse.body?.version === responded.body.version,
    'Identical organizer response retry was not idempotent');

  const venueResponseNotices = await request(url, key,
    `/rest/v1/partner_notifications?select=id,metadata&event_venue_relationship_id=eq.${relationshipId}`, venueManager.token);
  assert(venueResponseNotices.body?.filter(row => row.metadata?.relationship_action === 'dispute_response_added').length === 1,
    'Venue manager did not receive exactly one organizer-response notice');

  console.log('PASS venue manager and organizer receive safe role-specific workflow rows');
  console.log('PASS consumers cannot read partner workflow state or forge notices');
  console.log('PASS persisted attribution creates one durable venue notice');
  console.log('PASS placement decisions, disputes, and responses notify the opposite party once');
} catch (caught) {
  failure = caught;
} finally {
  if (eventId) {
    const cleanup = await request(url, key, `/rest/v1/events?id=eq.${eventId}`, admin.token, 'DELETE', undefined, 'return=minimal');
    if (!cleanup.response.ok && failure === null) failure = new Error(`Could not clean workflow fixture: ${JSON.stringify(cleanup.body)}`);
  }
}

if (failure) throw failure;
const remainingNotices = await request(url, key,
  `/rest/v1/partner_notifications?select=id&event_venue_relationship_id=eq.${relationshipId}`, admin.token);
assert(remainingNotices.response.ok && remainingNotices.body?.length === 0,
  'Relationship notification fixtures did not cascade during cleanup');
console.log('PASS workflow relationship and notification fixtures were cleaned up');
