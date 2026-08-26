import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '..');
const defaultManifest = resolve(workspaceRoot, 'data/event-imports/lusaka-launch-v1.json');
const mainProjectRef = 'evfftzhrucwwfnertiup';
const allowedCategories = new Set([
  'Live Music',
  'Sports & Fitness',
  'Activity & Experience',
  'Arts & Culture',
  'Cinema',
  'Market & Street Food',
  'Nightlife',
  'Social & Mixer',
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readEnv(path) {
  const content = await readFile(path, 'utf8');
  return Object.fromEntries(content.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }));
}

function assertHttpUrl(value, label) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`${label} must be a valid URL`); }
  assert(['http:', 'https:'].includes(parsed.protocol), `${label} must use HTTP(S)`);
}

function validateManifest(manifest) {
  assert(manifest.schema_version === 1, 'Unsupported event import manifest schema');
  assert(manifest.market?.region_id && manifest.market?.city, 'Manifest market is incomplete');
  assert(Array.isArray(manifest.drafts), 'Manifest drafts must be an array');
  assert(Array.isArray(manifest.holds), 'Manifest holds must be an array');

  const recordIds = new Set();
  const requestKeys = new Set();
  for (const record of manifest.drafts) {
    assert(record.disposition === 'draft_ready', `${record.record_id}: only draft_ready records can be imported`);
    assert(record.record_id && !recordIds.has(record.record_id), `${record.record_id}: duplicate record ID`);
    recordIds.add(record.record_id);
    for (const [kind, requestKey] of Object.entries(record.request_keys ?? {})) {
      assert(uuidPattern.test(requestKey), `${record.record_id}: invalid ${kind} request key`);
      assert(!requestKeys.has(requestKey), `${record.record_id}: duplicate request key`);
      requestKeys.add(requestKey);
    }
    assert(uuidPattern.test(record.request_keys?.event ?? ''), `${record.record_id}: event request key required`);
    assert(uuidPattern.test(record.request_keys?.provenance ?? ''), `${record.record_id}: provenance request key required`);
    assert(record.event?.title?.trim(), `${record.record_id}: title required`);
    assert(allowedCategories.has(record.event?.category), `${record.record_id}: unsupported category`);
    assert(Date.parse(record.event?.starts_at) > Date.now(), `${record.record_id}: event must start in the future`);
    assert(record.event?.event_location_kind === 'external', `${record.record_id}: reviewed imports must use an explicit external location`);
    assert(record.event?.external_location_name?.trim(), `${record.record_id}: external location name required`);
    assert(Number.isFinite(record.event?.price_pp) && record.event.price_pp >= 0, `${record.record_id}: invalid price`);
    assert(record.event?.currency === manifest.market.currency_code, `${record.record_id}: currency must match market`);
    assert(record.event?.is_free ? record.event.price_pp === 0 : record.event.price_pp > 0, `${record.record_id}: free/paid state and price disagree`);
    assert(Number.isInteger(record.event?.capacity) && record.event.capacity >= 0, `${record.record_id}: invalid capacity`);

    assert(Array.isArray(record.sources) && record.sources.length > 0, `${record.record_id}: verified evidence required`);
    assert(record.sources.some(source => source.verification_status === 'verified' && source.is_primary && source.show_publicly), `${record.record_id}: verified public primary source required`);
    for (const [index, source] of record.sources.entries()) {
      assertHttpUrl(source.url, `${record.record_id}: source ${index + 1}`);
      assert(Date.parse(source.observed_at) <= Date.now(), `${record.record_id}: source observation cannot be in the future`);
    }

    assert(Array.isArray(record.action_links) && record.action_links.length > 0, `${record.record_id}: consumer action required`);
    assert(record.action_links.some(link => link.status === 'active' && link.is_primary), `${record.record_id}: active primary action required`);
    for (const [index, link] of record.action_links.entries()) assertHttpUrl(link.url, `${record.record_id}: action ${index + 1}`);
  }

  for (const hold of manifest.holds) {
    assert(hold.record_id && !recordIds.has(hold.record_id), `${hold.record_id}: duplicate/overlapping hold ID`);
    recordIds.add(hold.record_id);
    assert(['taxonomy_hold', 'fact_conflict', 'source_hold'].includes(hold.reason_code), `${hold.record_id}: invalid hold reason`);
    if (hold.source_url) assertHttpUrl(hold.source_url, `${hold.record_id}: hold source`);
  }
}

async function apiRequest(baseUrl, apiKey, accessToken, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}: ${body}`);
  return body ? JSON.parse(body) : null;
}

async function resolveAdminAccessToken(baseUrl, apiKey) {
  if (process.env.D8_ADMIN_ACCESS_TOKEN) return process.env.D8_ADMIN_ACCESS_TOKEN;
  const email = process.env.D8_ADMIN_EMAIL;
  const password = process.env.D8_ADMIN_PASSWORD;
  assert(email && password, 'Set D8_ADMIN_ACCESS_TOKEN or D8_ADMIN_EMAIL and D8_ADMIN_PASSWORD before using --apply');
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Admin sign-in failed with HTTP ${response.status}`);
  const session = await response.json();
  assert(session.access_token, 'Admin sign-in did not return an access token');
  return session.access_token;
}

async function importRecord(config, manifest, record) {
  const eventPayload = {
    request_key: record.request_keys.event,
    region_id: manifest.market.region_id,
    city: manifest.market.city,
    ...record.event,
    attribution: 'unclaimed',
    publication_status: 'draft',
    venue_id: null,
    images: [],
    cover_image: null,
  };
  const eventId = await apiRequest(config.baseUrl, config.apiKey, config.accessToken, '/rest/v1/rpc/admin_create_event', {
    method: 'POST',
    body: JSON.stringify({ p_payload: eventPayload }),
  });
  assert(typeof eventId === 'string' && uuidPattern.test(eventId), `${record.record_id}: create RPC returned an invalid event ID`);

  const eventRows = await apiRequest(
    config.baseUrl,
    config.apiKey,
    config.accessToken,
    `/rest/v1/events?select=id,title,source,event_status,updated_at,event_sources(id),event_action_links(id)&id=eq.${encodeURIComponent(eventId)}`,
  );
  assert(eventRows.length === 1, `${record.record_id}: created event could not be reloaded`);
  if (eventRows[0].source !== 'import') {
    assert(eventRows[0].source === 'd8_admin', `${record.record_id}: existing event has an unexpected origin`);
    assert(eventRows[0].event_sources.length === 0 && eventRows[0].event_action_links.length === 0,
      `${record.record_id}: refusing to overwrite evidence added outside this manifest`);
  }

  await apiRequest(config.baseUrl, config.apiKey, config.accessToken, '/rest/v1/rpc/admin_replace_event_provenance', {
    method: 'POST',
    body: JSON.stringify({
      p_event_id: eventId,
      p_sources: record.sources,
      p_action_links: record.action_links,
      p_expected_updated_at: eventRows[0].updated_at,
      p_request_key: record.request_keys.provenance,
      p_mark_as_import: eventRows[0].source !== 'import',
    }),
  });

  const verification = await apiRequest(
    config.baseUrl,
    config.apiKey,
    config.accessToken,
    `/rest/v1/events?select=id,source,event_status,event_sources(id),event_action_links(id)&id=eq.${encodeURIComponent(eventId)}`,
  );
  const saved = verification[0];
  assert(saved?.source === 'import', `${record.record_id}: event origin was not marked import`);
  assert(saved?.event_status === 'draft', `${record.record_id}: imported event did not remain a draft`);
  assert(saved?.event_sources?.length === record.sources.length, `${record.record_id}: source count mismatch`);
  assert(saved?.event_action_links?.length === record.action_links.length, `${record.record_id}: action count mismatch`);
  console.log(`IMPORTED ${record.record_id} -> ${eventId} (draft)`);
}

const manifestPath = resolve(process.cwd(), argValue('--manifest') ?? defaultManifest);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
validateManifest(manifest);
console.log(`PASS manifest ${manifest.manifest_id}: ${manifest.drafts.length} draft-ready, ${manifest.holds.length} held`);

if (!process.argv.includes('--apply')) {
  console.log('DRY RUN only. No database writes were made.');
  process.exit(0);
}

assert(process.argv.includes('--confirm-main'), 'Applying to the main project requires --confirm-main');
assert(manifest.target_project_ref === mainProjectRef, 'Manifest target does not match the main project');
const env = await readEnv(resolve(workspaceRoot, 'artifacts/d8advisr/.env.local'));
const baseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const apiKey = env.VITE_SUPABASE_ANON_KEY;
assert(baseUrl && apiKey, 'Consumer .env.local must contain the main Supabase URL and anonymous key');
assert(new URL(baseUrl).hostname === `${mainProjectRef}.supabase.co`, 'Refusing import: local consumer environment is not the main project');
const accessToken = await resolveAdminAccessToken(baseUrl, apiKey);

for (const record of manifest.drafts) {
  await importRecord({ baseUrl, apiKey, accessToken }, manifest, record);
}
