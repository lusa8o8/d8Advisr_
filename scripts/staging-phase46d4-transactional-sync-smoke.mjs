import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const platformOrganizationId = '00000000-0000-4000-8000-00000000d800';

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

const app = await env('artifacts/d8advisr-partner/.env.staging.local');
const identities = await env('.env.staging.test.local');
const url = app.VITE_SUPABASE_URL;
const key = app.VITE_SUPABASE_ANON_KEY;
assert(url?.includes('bntxnjfftikmaqnbskkq.supabase.co'), 'Refusing to run outside dedicated staging');

const [admin, venueManager] = await Promise.all([
  login(url, key, identities.STAGING_ADMIN_EMAIL, identities.STAGING_ADMIN_PASSWORD),
  login(url, key, identities.STAGING_PARTNER_EMAIL, identities.STAGING_PARTNER_PASSWORD),
]);

const managedVenues = await request(
  url, key,
  `/rest/v1/venues?select=id,name,partner_id&partner_id=eq.${venueManager.userId}&limit=1`,
  venueManager.token,
);
assert(managedVenues.response.ok && managedVenues.body?.length === 1, 'Staging partner requires one managed venue');
const managedVenue = managedVenues.body[0];

const marker = `phase46d4-sync-${Date.now()}`;
let temporaryVenueId = null;
let eventId = null;
let failure = null;

try {
  const temporaryVenue = await request(url, key, '/rest/v1/rpc/admin_create_venue', admin.token, 'POST', {
    p_payload: {
      request_key: crypto.randomUUID(),
      name: `D4 temporary venue ${marker}`,
      city: 'Lusaka',
      category: 'Test venue',
      attribution: 'unclaimed',
      publication_status: 'draft',
    },
  });
  assert(temporaryVenue.response.ok && typeof temporaryVenue.body === 'string', `Temporary venue creation failed: ${JSON.stringify(temporaryVenue.body)}`);
  temporaryVenueId = temporaryVenue.body;

  const event = await request(url, key, '/rest/v1/events?select=id', admin.token, 'POST', {
    title: `D4 transactional fixture ${marker}`,
    city: 'Lusaka',
    category: 'Test event',
    starts_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 86400000 + 7200000).toISOString(),
    event_location_kind: 'd8_venue',
    venue_id: managedVenue.id,
    venue_page_status: 'approved',
    is_free: true,
    price_pp: 0,
    currency: 'ZMW',
    organizer_organization_id: platformOrganizationId,
    source: 'd8_admin',
    event_status: 'draft',
  });
  assert(event.response.ok && event.body?.[0]?.id, `Transactional event creation failed: ${JSON.stringify(event.body)}`);
  eventId = event.body[0].id;

  const createdState = await request(url, key,
    `/rest/v1/events?select=venue_id,venue_page_status,description&id=eq.${eventId}`,
    admin.token);
  assert(createdState.body?.[0]?.venue_page_status === 'requested', 'Client-supplied approval survived event creation');

  const createdRelationships = await request(url, key,
    `/rest/v1/event_venue_relationships?select=id,venue_id,placement_status,attribution_status,is_active,version&event_id=eq.${eventId}&is_active=eq.true`,
    admin.token);
  assert(createdRelationships.response.ok && createdRelationships.body?.length === 1, 'Event insert did not create one canonical relationship');
  let relationship = createdRelationships.body[0];
  assert(relationship.venue_id === managedVenue.id && relationship.placement_status === 'requested', 'Initial canonical relationship is incorrect');

  const approved = await request(url, key, '/rest/v1/rpc/decide_event_venue_placement', venueManager.token, 'POST', {
    p_relationship_id: relationship.id,
    p_decision: 'approved',
    p_reason: 'D4 transactional-sync approval',
    p_expected_version: relationship.version,
  });
  assert(approved.response.ok && approved.body?.placement_status === 'approved', 'Venue manager could not approve the fixture');
  relationship = approved.body;

  const ordinaryEdit = await request(url, key, `/rest/v1/events?id=eq.${eventId}`, admin.token, 'PATCH', {
    description: 'Ordinary edit must preserve placement',
  }, 'return=minimal');
  assert(ordinaryEdit.response.ok, `Ordinary edit failed: ${JSON.stringify(ordinaryEdit.body)}`);

  const afterOrdinaryEdit = await request(url, key,
    `/rest/v1/event_venue_relationships?select=id,placement_status,version&event_id=eq.${eventId}&is_active=eq.true`,
    admin.token);
  assert(afterOrdinaryEdit.body?.[0]?.placement_status === 'approved', 'Ordinary edit reset venue approval');
  assert(afterOrdinaryEdit.body?.[0]?.version === relationship.version, 'Ordinary edit churned relationship version');

  const maliciousProjection = await request(url, key, `/rest/v1/events?id=eq.${eventId}`, admin.token, 'PATCH', {
    venue_page_status: 'rejected',
  }, 'return=minimal');
  assert(maliciousProjection.response.ok, 'Server-owned projection guard rejected instead of neutralizing a draft write');
  const guardedProjection = await request(url, key,
    `/rest/v1/events?select=venue_page_status&id=eq.${eventId}`, admin.token);
  assert(guardedProjection.body?.[0]?.venue_page_status === 'approved', 'Direct draft write changed server-owned placement');

  const organizerPayload = await request(url, key, '/rest/v1/rpc/partner_apply_event_revision_v11', venueManager.token, 'POST', {
    p_event_id: crypto.randomUUID(),
    p_payload: { venue_page_status: 'approved' },
    p_expected_updated_at: new Date().toISOString(),
    p_confirmed: true,
    p_organizer_reason: 'must be rejected before event lookup',
  });
  assert(!organizerPayload.response.ok && JSON.stringify(organizerPayload.body).includes('event_venue_placement_is_server_managed'),
    'Organizer revision payload can still write placement state');

  const venueChange = await request(url, key, `/rest/v1/events?id=eq.${eventId}`, admin.token, 'PATCH', {
    venue_id: temporaryVenueId,
  }, 'return=minimal');
  assert(venueChange.response.ok, `D8 venue change failed: ${JSON.stringify(venueChange.body)}`);

  const relationshipHandoff = await request(url, key,
    `/rest/v1/event_venue_relationships?select=id,venue_id,placement_status,attribution_status,is_active,withdrawal_reason&event_id=eq.${eventId}&order=created_at.asc`,
    admin.token);
  assert(relationshipHandoff.response.ok && relationshipHandoff.body?.length === 2, 'Venue change did not retain old and create new relationship history');
  const oldRelationship = relationshipHandoff.body.find(row => row.venue_id === managedVenue.id);
  const newRelationship = relationshipHandoff.body.find(row => row.venue_id === temporaryVenueId);
  assert(oldRelationship?.is_active === false && oldRelationship.attribution_status === 'withdrawn', 'Old venue relationship was not withdrawn');
  assert(newRelationship?.is_active === true && newRelationship.placement_status === 'requested', 'New venue relationship did not start requested');

  const externalChange = await request(url, key, `/rest/v1/events?id=eq.${eventId}`, admin.token, 'PATCH', {
    event_location_kind: 'external',
    venue_id: null,
    external_location_name: 'D4 external fixture',
  }, 'return=minimal');
  assert(externalChange.response.ok, `External location change failed: ${JSON.stringify(externalChange.body)}`);

  const finalEvent = await request(url, key,
    `/rest/v1/events?select=venue_id,event_location_kind,venue_page_status&id=eq.${eventId}`, admin.token);
  assert(finalEvent.body?.[0]?.event_location_kind === 'external'
    && finalEvent.body[0].venue_id === null
    && finalEvent.body[0].venue_page_status === 'hidden', 'External location did not clear venue placement');
  const activeAfterExternal = await request(url, key,
    `/rest/v1/event_venue_relationships?select=id&event_id=eq.${eventId}&is_active=eq.true`, admin.token);
  assert(activeAfterExternal.response.ok && activeAfterExternal.body?.length === 0, 'External location left an active D8 venue relationship');

  console.log('PASS event insert derives projection and creates canonical attribution');
  console.log('PASS ordinary edits and direct placement writes cannot reset approval');
  console.log('PASS organizer live-revision payload cannot write placement state');
  console.log('PASS D8 venue changes withdraw old and create new relationship atomically');
  console.log('PASS external location changes withdraw active D8 venue attribution');
} catch (caught) {
  failure = caught;
} finally {
  for (const [table, id] of [['events', eventId], ['venues', temporaryVenueId]]) {
    if (!id) continue;
    try {
      const cleanup = await request(url, key, `/rest/v1/${table}?id=eq.${id}`, admin.token, 'DELETE', undefined, 'return=minimal');
      if (!cleanup.response.ok && failure === null) failure = new Error(`Could not clean up ${table} fixture: ${JSON.stringify(cleanup.body)}`);
    } catch (cleanupError) {
      if (failure === null) failure = cleanupError;
      else console.warn(`WARN cleanup deferred for ${table}: ${cleanupError.message}`);
    }
  }
}

if (failure) throw failure;
console.log('PASS transactional-sync staging fixtures were cleaned up');
