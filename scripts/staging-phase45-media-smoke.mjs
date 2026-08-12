import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const env = async path => Object.fromEntries((await readFile(resolve(root, path), 'utf8'))
  .split(/\r?\n/).map(line => line.trim())
  .filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
const client = await env('artifacts/d8advisr/.env.staging.local');
const ids = await env('.env.staging.test.local');
const url = client.VITE_SUPABASE_URL, key = client.VITE_SUPABASE_ANON_KEY;
if (!url.includes('bntxnjfftikmaqnbskkq')) throw new Error('Media tests refuse non-staging projects');
const assert = (value, message) => { if (!value) throw new Error(message); };

async function json(path, token, method = 'GET', body) {
  const response = await fetch(url + path, {
    method, headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text(); let result = text;
  try { result = text ? JSON.parse(text) : null; } catch {}
  return { response, body: result };
}
async function signIn(email, password) {
  const result = await json('/auth/v1/token?grant_type=password', key, 'POST', { email, password });
  assert(result.response.ok, `Sign-in failed: ${result.response.status}`);
  return { token: result.body.access_token, id: result.body.user.id };
}
async function upload(actor, path) {
  return fetch(`${url}/storage/v1/object/listing-media/${path}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${actor.token}`, 'Content-Type': 'image/png', 'x-upsert': 'false' },
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=', 'base64'),
  });
}

const [consumer, partner, admin] = await Promise.all([
  signIn(ids.STAGING_CONSUMER_EMAIL, ids.STAGING_CONSUMER_PASSWORD),
  signIn(ids.STAGING_PARTNER_EMAIL, ids.STAGING_PARTNER_PASSWORD),
  signIn(ids.STAGING_ADMIN_EMAIL, ids.STAGING_ADMIN_PASSWORD),
]);
const marker = `phase45-${Date.now()}.png`;
const objects = [];
const metadata = [];
try {
  for (const [role, actor, scope] of [['admin', admin, 'venues'], ['partner', partner, 'events']]) {
    const path = `${actor.id}/${scope}/${marker}`;
    const response = await upload(actor, path);
    assert(response.ok, `${role} upload failed: HTTP ${response.status} ${await response.text()}`);
    objects.push({ actor, path });
    const registered = await json('/rest/v1/rpc/register_listing_media', actor.token, 'POST', {
      p_object_path: path, p_scope: scope,
    });
    assert(registered.response.ok && registered.body?.id, `${role} registration failed`);
    metadata.push({ actor, id: registered.body.id });
    console.log(`PASS ${role} uploads and registers own listing media`);
  }
  const consumerPath = `${consumer.id}/venues/${marker}`;
  const consumerUpload = await upload(consumer, consumerPath);
  assert(!consumerUpload.ok, `Consumer upload was not denied: HTTP ${consumerUpload.status}`);
  const crossPath = `${admin.id}/venues/cross-${marker}`;
  const crossUpload = await upload(partner, crossPath);
  assert(!crossUpload.ok, `Cross-user path upload was not denied: HTTP ${crossUpload.status}`);
  const fakeRegister = await json('/rest/v1/rpc/register_listing_media', consumer.token, 'POST', {
    p_object_path: consumerPath, p_scope: 'venues',
  });
  assert([400, 401, 403].includes(fakeRegister.response.status), 'Consumer registered absent media');
  const publicRead = await fetch(`${url}/storage/v1/object/public/listing-media/${objects[0].path}`);
  assert(publicRead.ok, 'Registered public listing image is not readable');
  console.log('PASS consumer/cross-user writes denied and public image read succeeds');
} finally {
  for (const item of metadata) {
    await json(`/rest/v1/listing_media?id=eq.${item.id}`, item.actor.token, 'DELETE');
  }
  for (const item of objects) {
    await json('/storage/v1/object/listing-media', item.actor.token, 'DELETE', { prefixes: [item.path] });
  }
}
