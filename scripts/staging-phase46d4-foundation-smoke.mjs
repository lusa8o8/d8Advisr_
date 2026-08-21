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
  const attempts = method === 'GET' ? 2 : 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
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
    } catch (error) {
      if (attempt === attempts) throw error;
      console.warn(`WARN retrying timed-out read: ${path.split('?')[0]}`);
    }
  }
  throw new Error('unreachable request state');
}

async function login(url, key, email, password) {
  const result = await request(url, key, '/auth/v1/token?grant_type=password', key, 'POST', { email, password });
  assert(result.response.ok && result.body?.access_token, `Staging sign-in failed for ${email}`);
  return { token: result.body.access_token, userId: result.body.user.id };
}

function assertDenied(result, label) {
  assert(!result.response.ok && [400, 401, 403].includes(result.response.status),
    `${label} expected denial, got HTTP ${result.response.status}: ${JSON.stringify(result.body)}`);
}

const app = await env('artifacts/d8advisr-partner/.env.staging.local');
const identities = await env('.env.staging.test.local');
const url = app.VITE_SUPABASE_URL;
const key = app.VITE_SUPABASE_ANON_KEY;
assert(url?.includes('bntxnjfftikmaqnbskkq.supabase.co'), 'Refusing to run outside dedicated staging');

const [admin, venueManager, outsider, consumer] = await Promise.all([
  login(url, key, identities.STAGING_ADMIN_EMAIL, identities.STAGING_ADMIN_PASSWORD),
  login(url, key, identities.STAGING_PARTNER_EMAIL, identities.STAGING_PARTNER_PASSWORD),
  login(url, key, identities.STAGING_PARTNER_2_EMAIL, identities.STAGING_PARTNER_PASSWORD),
  login(url, key, identities.STAGING_CONSUMER_EMAIL, identities.STAGING_CONSUMER_PASSWORD),
]);
console.log('PASS staging role sessions established');

console.log('Checking the staging venue fixture...');
const venues = await request(
  url, key,
  `/rest/v1/venues?select=id,name,partner_id,operator_organization_id&partner_id=eq.${venueManager.userId}&limit=1`,
  venueManager.token,
);
assert(venues.response.ok && venues.body?.length === 1, 'Staging venue manager requires one legacy or organization-backed venue');
const venue = venues.body[0];
console.log('PASS staging venue fixture is available');

const relationshipReadiness = await request(
  url, key, '/rest/v1/event_venue_relationships?select=id&limit=1', admin.token,
);
assert(relationshipReadiness.response.ok, `Relationship API unavailable: ${JSON.stringify(relationshipReadiness.body)}`);
console.log('PASS relationship API is available');

const marker = `phase46d4-${Date.now()}`;
let eventId = null;
let relationshipId = null;
let failure = null;

try {
  console.log('Creating the isolated D4 draft fixture...');
  const created = await request(url, key, '/rest/v1/events?select=id', admin.token, 'POST', {
    title: `D4 relationship fixture ${marker}`,
    city: 'Lusaka',
    category: 'Test event',
    starts_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 86400000 + 7200000).toISOString(),
    event_location_kind: 'd8_venue',
    venue_id: venue.id,
    venue_page_status: 'requested',
    is_free: true,
    price_pp: 0,
    currency: 'ZMW',
    organizer_organization_id: '00000000-0000-4000-8000-00000000d800',
    source: 'd8_admin',
    event_status: 'draft',
  });
  assert(created.response.ok && created.body?.[0]?.id, `Could not create D4 fixture: ${JSON.stringify(created.body)}`);
  eventId = created.body[0].id;
  console.log('PASS isolated D4 draft fixture created');

  const eventAuthority = await request(url, key, '/rest/v1/rpc/can_manage_event_attribution', admin.token, 'POST', {
    event_uuid: eventId,
    user_uuid: admin.userId,
  });
  assert(eventAuthority.response.ok && eventAuthority.body === true, 'Admin event-attribution authority helper failed');
  console.log('PASS event-attribution authority helper');

  const automaticRows = await request(url, key,
    `/rest/v1/event_venue_relationships?select=id,placement_status&event_id=eq.${eventId}&is_active=eq.true`,
    admin.token);
  assert(automaticRows.response.ok && automaticRows.body?.length === 1, 'Event insert did not synchronize attribution');
  relationshipId = automaticRows.body[0].id;
  assert(automaticRows.body[0].placement_status === 'requested', 'Third-party venue did not begin as requested');
  console.log('PASS automatic relationship synchronization');

  const firstSync = await request(url, key, '/rest/v1/rpc/sync_event_venue_attribution', admin.token, 'POST', {
    p_event_id: eventId,
    p_reason: 'D4 explicit idempotency retry',
  });
  assert(firstSync.response.ok && firstSync.body?.action === 'preserved', `Explicit relationship sync did not preserve: ${JSON.stringify(firstSync.body)}`);

  console.log('Checking idempotent relationship synchronization...');
  const secondSync = await request(url, key, '/rest/v1/rpc/sync_event_venue_attribution', admin.token, 'POST', {
    p_event_id: eventId,
    p_reason: 'D4 idempotency retry',
  });
  assert(secondSync.response.ok && secondSync.body?.action === 'preserved', 'Repeated sync did not preserve the active relationship');
  console.log('PASS idempotent relationship synchronization');

  const activeRows = await request(url, key,
    `/rest/v1/event_venue_relationships?select=id,placement_status,attribution_status,version&event_id=eq.${eventId}&is_active=eq.true`,
    admin.token);
  assert(activeRows.response.ok && activeRows.body?.length === 1, 'Repeated sync created duplicate active relationships');
  let relationship = activeRows.body[0];
  console.log('PASS exactly one active relationship is visible to admin');

  const consumerRows = await request(url, key,
    `/rest/v1/event_venue_relationships?select=id&event_id=eq.${eventId}`, consumer.token);
  assert(consumerRows.response.ok && consumerRows.body?.length === 0, 'Consumer can read operational relationship rows');
  console.log('PASS consumer cannot read operational relationship rows');

  const outsiderDecision = await request(url, key, '/rest/v1/rpc/decide_event_venue_placement', outsider.token, 'POST', {
    p_relationship_id: relationshipId,
    p_decision: 'approved',
    p_reason: 'must be denied',
    p_expected_version: relationship.version,
  });
  assertDenied(outsiderDecision, 'Unrelated partner placement decision');
  console.log('PASS unrelated partner cannot decide placement');

  const venueAuthority = await request(url, key, '/rest/v1/rpc/can_manage_venue_placement', venueManager.token, 'POST', {
    venue_uuid: venue.id,
    user_uuid: venueManager.userId,
  });
  assert(venueAuthority.response.ok && venueAuthority.body === true, 'Venue-placement authority helper failed');
  console.log('PASS venue-placement authority helper');

  const staleDecision = await request(url, key, '/rest/v1/rpc/decide_event_venue_placement', venueManager.token, 'POST', {
    p_relationship_id: relationshipId,
    p_decision: 'approved',
    p_reason: 'stale write test',
    p_expected_version: relationship.version - 1,
  });
  assertDenied(staleDecision, 'Stale placement decision');
  console.log('PASS stale placement write is rejected');

  const approved = await request(url, key, '/rest/v1/rpc/decide_event_venue_placement', venueManager.token, 'POST', {
    p_relationship_id: relationshipId,
    p_decision: 'approved',
    p_reason: 'D4 staging approval',
    p_expected_version: relationship.version,
  });
  assert(approved.response.ok && approved.body?.placement_status === 'approved', `Venue approval failed: ${JSON.stringify(approved.body)}`);
  relationship = approved.body;

  const projection = await request(url, key, `/rest/v1/events?select=venue_page_status&id=eq.${eventId}`, admin.token);
  assert(projection.body?.[0]?.venue_page_status === 'approved', 'Legacy projection did not reflect venue approval');

  const directProjection = await request(url, key, `/rest/v1/events?id=eq.${eventId}`, admin.token, 'PATCH', {
    venue_page_status: 'hidden',
  });
  assertDenied(directProjection, 'Direct legacy projection update');

  const preserved = await request(url, key, '/rest/v1/rpc/sync_event_venue_attribution', admin.token, 'POST', {
    p_event_id: eventId,
    p_reason: 'D4 approval preservation',
  });
  assert(preserved.response.ok && preserved.body?.relationship?.placement_status === 'approved', 'Ordinary synchronization reset approval');
  relationship = preserved.body.relationship;

  const disputed = await request(url, key, '/rest/v1/rpc/report_event_venue_attribution', venueManager.token, 'POST', {
    p_relationship_id: relationshipId,
    p_reason: 'D4 staging incorrect-location exercise',
    p_expected_version: relationship.version,
  });
  assert(disputed.response.ok && disputed.body?.attribution_status === 'disputed', `Attribution dispute failed: ${JSON.stringify(disputed.body)}`);
  relationship = disputed.body;

  const hiddenProjection = await request(url, key, `/rest/v1/events?select=venue_page_status&id=eq.${eventId}`, admin.token);
  assert(hiddenProjection.body?.[0]?.venue_page_status === 'hidden', 'Dispute did not suppress the legacy public placement');

  const response = await request(url, key, '/rest/v1/rpc/respond_event_venue_dispute', admin.token, 'POST', {
    p_relationship_id: relationshipId,
    p_response: 'D4 staging organizer response',
    p_expected_version: relationship.version,
  });
  assert(response.response.ok && response.body?.response_reason, 'Organizer dispute response was not recorded');
  relationship = response.body;

  const resolved = await request(url, key, '/rest/v1/rpc/resolve_event_venue_dispute', admin.token, 'POST', {
    p_relationship_id: relationshipId,
    p_resolution: 'confirmed',
    p_reason: 'D4 staging relationship confirmed',
    p_expected_version: relationship.version,
  });
  assert(resolved.response.ok && resolved.body?.attribution_status === 'resolved_confirmed', 'Admin dispute resolution failed');
  relationship = resolved.body;

  const revoked = await request(url, key, '/rest/v1/rpc/decide_event_venue_placement', venueManager.token, 'POST', {
    p_relationship_id: relationshipId,
    p_decision: 'revoked',
    p_reason: 'D4 staging revocation',
    p_expected_version: relationship.version,
  });
  assert(revoked.response.ok && revoked.body?.placement_status === 'revoked', 'Venue revocation failed');
  relationship = revoked.body;

  const resubmitted = await request(url, key, '/rest/v1/rpc/resubmit_event_venue_placement', admin.token, 'POST', {
    p_relationship_id: relationshipId,
    p_reason: 'D4 staging resubmission',
    p_expected_version: relationship.version,
  });
  assert(resubmitted.response.ok && resubmitted.body?.placement_status === 'requested', 'Organizer resubmission failed');
  relationship = resubmitted.body;

  const declined = await request(url, key, '/rest/v1/rpc/decide_event_venue_placement', venueManager.token, 'POST', {
    p_relationship_id: relationshipId,
    p_decision: 'declined',
    p_reason: 'D4 staging decline',
    p_expected_version: relationship.version,
  });
  assert(declined.response.ok && declined.body?.placement_status === 'declined', 'Venue decline failed');

  const audit = await request(url, key,
    `/rest/v1/event_venue_relationship_audit?select=action&relationship_id=eq.${relationshipId}&order=created_at.asc`,
    admin.token);
  assert(audit.response.ok && audit.body?.length >= 7, 'Relationship transition audit is incomplete');
  for (const action of [
    'created', 'placement_approved', 'attribution_disputed',
    'dispute_response_added', 'dispute_resolved_confirmed',
    'placement_revoked', 'placement_resubmitted', 'placement_declined',
  ]) {
    assert(audit.body.some(row => row.action === action), `Missing relationship audit action: ${action}`);
  }

  console.log('PASS persisted venue synchronization is idempotent and preserves decisions');
  console.log('PASS consumer, unrelated-partner, stale-write, and direct-write isolation');
  console.log('PASS venue approval/revocation/decline and compatibility projection');
  console.log('PASS dispute response/resolution and immutable transition audit');
} catch (caught) {
  failure = caught;
} finally {
  if (eventId) {
    console.log('Cleaning up the isolated D4 draft fixture...');
    try {
      const cleanup = await request(url, key, `/rest/v1/events?id=eq.${eventId}`, admin.token, 'DELETE', undefined, 'return=minimal');
      if (!cleanup.response.ok && failure === null) {
        failure = new Error(`Could not clean up D4 event fixture: ${JSON.stringify(cleanup.body)}`);
      }
    } catch (cleanupError) {
      if (failure === null) failure = cleanupError;
      else console.warn(`WARN cleanup deferred after staging failure: ${cleanupError.message}`);
    }
  }
}

if (failure) throw failure;

const remaining = await request(url, key,
  `/rest/v1/event_venue_relationships?select=id&event_id=eq.${eventId}`, admin.token);
assert(remaining.response.ok && remaining.body?.length === 0, 'D4 relationship fixture did not cascade on event cleanup');
console.log('PASS D4 staging fixture and relationship history were cleaned up');
