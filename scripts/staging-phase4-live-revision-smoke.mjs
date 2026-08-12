import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readEnv = async (path) => Object.fromEntries((await readFile(resolve(root, path), 'utf8')).split(/\r?\n/)
  .map(line => line.trim()).filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function request(url, apiKey, path, options = {}) {
  const response = await fetch(`${url}${path}`, {
    method: options.method ?? 'GET',
    headers: { apikey: apiKey, Authorization: `Bearer ${options.accessToken ?? apiKey}`, 'Content-Type': 'application/json', Prefer: options.prefer ?? 'return=representation' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text(); let body = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { response, body };
}

async function session(url, apiKey, email, password) {
  const result = await request(url, apiKey, '/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  assert(result.response.ok && result.body?.access_token, `Staging sign-in failed: HTTP ${result.response.status}`);
  return { accessToken: result.body.access_token, userId: result.body.user.id };
}

const client = await readEnv('artifacts/d8advisr/.env.staging.local');
const identities = await readEnv('.env.staging.test.local');
const url = client.VITE_SUPABASE_URL; const apiKey = client.VITE_SUPABASE_ANON_KEY;
assert(url?.includes('bntxnjfftikmaqnbskkq'), 'Live-revision tests refuse to run outside staging');
const consumer = await session(url, apiKey, identities.STAGING_CONSUMER_EMAIL, identities.STAGING_CONSUMER_PASSWORD);
const partner = await session(url, apiKey, identities.STAGING_PARTNER_EMAIL, identities.STAGING_PARTNER_PASSWORD);
const admin = await session(url, apiKey, identities.STAGING_ADMIN_EMAIL, identities.STAGING_ADMIN_PASSWORD);

const marker = `live-revision-${Date.now()}`;
const fixtureIds = [];
let revisionOne = null; let revisionTwo = null; let failure = null;
const rpc = (name, accessToken, body) => request(url, apiKey, `/rest/v1/rpc/${name}`, { method: 'POST', accessToken, body });
const venueRead = (id, accessToken) => request(url, apiKey, `/rest/v1/venues?select=id,name,city,category,area,address,description,price_tier,avg_cost_pp,cover_image,vibes,source,partner_id,operator_organization_id,listing_status,is_active,verification_status,last_verified_at,next_verification_due_at,tier,updated_at&id=eq.${id}`, { accessToken });

try {
  const create = await rpc('admin_create_venue', admin.accessToken, { p_payload: {
    request_key: crypto.randomUUID(), name: `Original ${marker}`, city: 'Lusaka', category: 'Test venue', area: 'Original area',
    description: 'Original description', price_tier: 'K', avg_cost_pp: 100, vibes: ['Casual'], attribution: 'unclaimed', publication_status: 'draft',
  } });
  assert(create.response.ok && typeof create.body === 'string', `Fixture create failed: HTTP ${create.response.status}`);
  const venueId = create.body; fixtureIds.push(venueId);
  const approveVenue = await rpc('admin_update_venue_listing_status', admin.accessToken, { venue_id: venueId, new_status: 'live', reason: null });
  assert(approveVenue.response.ok && approveVenue.body?.listing_status === 'live', 'Fixture publish failed');
  const beforeResult = await venueRead(venueId, admin.accessToken); const before = beforeResult.body[0];

  const submissionBody = { p_venue_id: venueId, p_expected_updated_at: before.updated_at, p_payload: {
    name: `Pending ${marker}`, area: 'Pending area', description: 'Immediate description', avg_cost_pp: 250, vibes: ['Romantic', 'Relaxing'],
  } };
  for (const [label, actor] of [['consumer', consumer], ['partner', partner]]) {
    const denied = await rpc('admin_submit_live_venue_revision', actor.accessToken, submissionBody);
    assert([401, 403].includes(denied.response.status), `${label} live revision expected 401/403, got ${denied.response.status}`);
  }
  console.log('PASS consumer and partner cannot submit admin live revisions');

  const stale = await rpc('admin_submit_live_venue_revision', admin.accessToken, { ...submissionBody, p_expected_updated_at: '2000-01-01T00:00:00Z' });
  assert(!stale.response.ok && stale.body?.code === 'P0001', 'Stale live revision was not rejected');
  const unsupported = await rpc('admin_submit_live_venue_revision', admin.accessToken, { p_venue_id: venueId, p_expected_updated_at: before.updated_at, p_payload: { listing_status: 'hidden' } });
  assert(!unsupported.response.ok && unsupported.body?.code === '22023', 'Protected live field was not rejected');
  console.log('PASS stale and protected-field submissions are rejected');

  const submitted = await rpc('admin_submit_live_venue_revision', admin.accessToken, submissionBody);
  assert(submitted.response.ok && submitted.body?.revision_id, `Mixed revision submission failed: HTTP ${submitted.response.status}`);
  revisionOne = submitted.body.revision_id;
  assert(submitted.body.immediate_fields?.join('|') === 'description', 'Description was not classified immediate');
  assert(new Set(submitted.body.pending_fields).size === 4, 'High-risk pending field count is incorrect');

  const publicPending = await venueRead(venueId, undefined); const pendingVenue = publicPending.body[0];
  assert(pendingVenue.description === 'Immediate description', 'Low-risk description did not apply immediately');
  assert(pendingVenue.name === before.name && pendingVenue.area === before.area && pendingVenue.avg_cost_pp === before.avg_cost_pp, 'High-risk values changed before review');
  assert(pendingVenue.verification_status === 'verified' && pendingVenue.listing_status === 'live' && pendingVenue.is_active === true, 'Pending proposal changed public trust/visibility state');

  const revisionRead = await request(url, apiKey, `/rest/v1/venue_live_revisions?select=id,status,previous_values,proposed_values,submitted_by&id=eq.${revisionOne}`, { accessToken: admin.accessToken });
  assert(revisionRead.response.ok && revisionRead.body?.[0]?.status === 'pending', 'Admin cannot read pending revision');
  assert(revisionRead.body[0].submitted_by === admin.userId && revisionRead.body[0].proposed_values.name === `Pending ${marker}`, 'Pending revision provenance/data is incorrect');
  const consumerRevision = await request(url, apiKey, '/rest/v1/venue_live_revisions?select=id', { accessToken: consumer.accessToken });
  assert(consumerRevision.response.ok && consumerRevision.body.length === 0, 'Consumer can see private live revisions');
  const taskOne = await request(url, apiKey, `/rest/v1/venue_reverification_tasks?select=id,status,reason,live_revision_id&live_revision_id=eq.${revisionOne}`, { accessToken: admin.accessToken });
  assert(taskOne.response.ok && taskOne.body?.[0]?.status === 'open' && taskOne.body[0].reason === 'admin_live_revision', 'Pending revision task is incorrect');
  console.log('PASS low-risk edit is public while high-risk proposal remains private and queued');

  const genericTaskResolution = await rpc('admin_update_reverification_task_status', admin.accessToken, { p_task_id: taskOne.body[0].id, new_status: 'in_progress', note: 'Should be blocked' });
  assert(!genericTaskResolution.response.ok && genericTaskResolution.body?.code === 'P0001', 'Generic task action bypassed pending revision review');
  const genericVerification = await rpc('admin_mark_venue_verified', admin.accessToken, { p_venue_id: venueId, reason: 'Should be blocked' });
  assert(!genericVerification.response.ok && genericVerification.body?.code === 'P0001', 'Mark verified bypassed pending revision review');
  console.log('PASS generic task and verification actions cannot bypass pending revision review');

  const duplicate = await rpc('admin_submit_live_venue_revision', admin.accessToken, { p_venue_id: venueId, p_expected_updated_at: pendingVenue.updated_at, p_payload: { name: `Second ${marker}` } });
  assert(!duplicate.response.ok && duplicate.body?.code === '23505', 'Second pending high-risk revision was not rejected');

  const reject = await rpc('admin_review_live_venue_revision', admin.accessToken, { p_revision_id: revisionOne, p_decision: 'rejected', p_note: 'Test rejection' });
  assert(reject.response.ok && reject.body?.status === 'rejected', 'Revision rejection failed');
  const afterRejectResult = await venueRead(venueId, admin.accessToken); const afterReject = afterRejectResult.body[0];
  assert(afterReject.name === before.name && afterReject.area === before.area && afterReject.avg_cost_pp === before.avg_cost_pp, 'Rejected high-risk values reached public venue');
  const rejectedRows = await request(url, apiKey, `/rest/v1/venue_live_revisions?select=status,reviewed_by,review_note&id=eq.${revisionOne}`, { accessToken: admin.accessToken });
  assert(rejectedRows.body?.[0]?.status === 'rejected' && rejectedRows.body[0].reviewed_by === admin.userId, 'Rejected revision review provenance is incorrect');
  const rejectedTask = await request(url, apiKey, `/rest/v1/venue_reverification_tasks?select=status&live_revision_id=eq.${revisionOne}`, { accessToken: admin.accessToken });
  assert(rejectedTask.body?.[0]?.status === 'dismissed', 'Rejected revision task was not dismissed');
  console.log('PASS rejection leaves public high-risk values unchanged and dismisses review task');

  const submittedTwo = await rpc('admin_submit_live_venue_revision', admin.accessToken, { p_venue_id: venueId, p_expected_updated_at: afterReject.updated_at, p_payload: {
    name: `Approved ${marker}`, area: 'Approved area', avg_cost_pp: 300, vibes: ['Cultural'],
  } });
  assert(submittedTwo.response.ok && submittedTwo.body?.revision_id, 'Second high-risk revision submission failed');
  revisionTwo = submittedTwo.body.revision_id;
  const approve = await rpc('admin_review_live_venue_revision', admin.accessToken, { p_revision_id: revisionTwo, p_decision: 'approved', p_note: 'Verified test proposal' });
  assert(approve.response.ok && approve.body?.status === 'approved', `Revision approval failed: HTTP ${approve.response.status}`);
  const afterApprovalResult = await venueRead(venueId, admin.accessToken); const afterApproval = afterApprovalResult.body[0];
  assert(afterApproval.name === `Approved ${marker}` && afterApproval.area === 'Approved area' && afterApproval.avg_cost_pp === 300 && afterApproval.vibes?.join('|') === 'Cultural', 'Approved high-risk values were not applied atomically');
  assert(afterApproval.description === 'Immediate description' && afterApproval.listing_status === 'live' && afterApproval.is_active === true && afterApproval.verification_status === 'verified', 'Approval damaged low-risk/public state');
  assert(afterApproval.last_verified_at !== before.last_verified_at && afterApproval.next_verification_due_at, 'Approval did not refresh verification timestamps');
  const approvedTask = await request(url, apiKey, `/rest/v1/venue_reverification_tasks?select=status&live_revision_id=eq.${revisionTwo}`, { accessToken: admin.accessToken });
  assert(approvedTask.body?.[0]?.status === 'resolved', 'Approved revision task was not resolved');
  const audit = await request(url, apiKey, `/rest/v1/venue_change_log?select=field_name,risk_level,applied_immediately,reverification_reason,changed_by&venue_id=eq.${venueId}`, { accessToken: admin.accessToken });
  const approvalAudit = audit.body.filter(row => row.reverification_reason === 'admin_live_revision_approved');
  assert(approvalAudit.length === 4 && approvalAudit.every(row => row.risk_level === 'high' && row.applied_immediately && row.changed_by === admin.userId), 'Approved per-field audit rows are incomplete');
  assert(audit.body.some(row => row.field_name === 'description' && row.risk_level === 'low' && row.reverification_reason === 'admin_live_edit'), 'Immediate description audit is missing');
  console.log('PASS approval atomically applies high-risk proposal, resolves task, refreshes verification, and audits fields');

  const draftCreate = await rpc('admin_create_venue', admin.accessToken, { p_payload: { request_key: crypto.randomUUID(), name: `Draft ${marker}`, city: 'Lusaka', category: 'Test', attribution: 'unclaimed' } });
  assert(draftCreate.response.ok, 'Draft denial fixture creation failed'); fixtureIds.push(draftCreate.body);
  const draftRow = (await venueRead(draftCreate.body, admin.accessToken)).body[0];
  const draftDenied = await rpc('admin_submit_live_venue_revision', admin.accessToken, { p_venue_id: draftRow.id, p_expected_updated_at: draftRow.updated_at, p_payload: { description: 'Denied' } });
  assert(draftDenied.response.status === 403, 'Draft venue used live editor');
  const ineligible = await request(url, apiKey, '/rest/v1/venues?select=id,updated_at,source,partner_id&or=(partner_id.not.is.null,source.is.null)&limit=20', { accessToken: admin.accessToken });
  for (const sample of [ineligible.body.find(row => row.partner_id), ineligible.body.find(row => row.source === null && !row.partner_id)]) {
    assert(sample, 'Missing ineligible live venue sample');
    const denied = await rpc('admin_submit_live_venue_revision', admin.accessToken, { p_venue_id: sample.id, p_expected_updated_at: sample.updated_at, p_payload: { description: 'Denied' } });
    assert(denied.response.status === 403, 'Partner/legacy venue used bounded live editor');
  }
  console.log('PASS draft, partner-owned, and legacy venues cannot use bounded live editor');
} catch (caught) { failure = caught; }
finally {
  for (const id of fixtureIds.reverse()) {
    const cleanup = await request(url, apiKey, `/rest/v1/venues?id=eq.${id}`, { method: 'DELETE', accessToken: admin.accessToken, prefer: 'return=minimal' });
    if (!cleanup.response.ok && !failure) failure = new Error(`Fixture cleanup failed: HTTP ${cleanup.response.status}`);
  }
}

if (failure) throw failure;
for (const revisionId of [revisionOne, revisionTwo].filter(Boolean)) {
  const remaining = await request(url, apiKey, `/rest/v1/venue_live_revisions?select=id&id=eq.${revisionId}`, { accessToken: admin.accessToken });
  assert(remaining.response.ok && remaining.body.length === 0, 'Revision cleanup did not cascade');
}
console.log('PASS live revision fixtures, tasks, revisions, and audit history were cleaned up');
console.log('Phase 4 staging admin live venue revision checks completed successfully.');
