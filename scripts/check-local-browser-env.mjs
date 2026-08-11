import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const stagingRef = 'bntxnjfftikmaqnbskkq';

async function readEnv(relativePath) {
  const content = await readFile(resolve(root, relativePath), 'utf8');
  return Object.fromEntries(content.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
}

function requireValue(env, key, label) {
  if (!env[key]?.trim()) throw new Error(`${label} is missing ${key}`);
}

function requireEqual(env, key, expected, label) {
  requireValue(env, key, label);
  if (env[key].trim() !== expected) throw new Error(`${label} ${key} must be ${expected}`);
}

const consumer = await readEnv('artifacts/d8advisr/.env.staging.local');
const partner = await readEnv('artifacts/d8advisr-partner/.env.staging.local');
const identities = await readEnv('.env.staging.test.local');

for (const [label, env] of [['consumer', consumer], ['partner', partner]]) {
  requireValue(env, 'VITE_SUPABASE_URL', label);
  requireValue(env, 'VITE_SUPABASE_ANON_KEY', label);
  if (!env.VITE_SUPABASE_URL.includes(stagingRef)) {
    throw new Error(`${label} browser tests refuse a non-staging Supabase project`);
  }
}

requireEqual(consumer, 'VITE_AUTH_REDIRECT_ORIGIN', 'http://localhost:3000', 'consumer');
requireEqual(consumer, 'VITE_PARTNER_ORIGIN', 'http://localhost:3001', 'consumer');
requireValue(consumer, 'VITE_GOOGLE_MAPS_API_KEY', 'consumer');
requireValue(consumer, 'VITE_GOOGLE_MAPS_MAP_ID', 'consumer');
requireEqual(partner, 'VITE_AUTH_REDIRECT_ORIGIN', 'http://localhost:3001', 'partner');
requireEqual(partner, 'VITE_CONSUMER_ORIGIN', 'http://localhost:3000', 'partner');

for (const key of [
  'STAGING_CONSUMER_EMAIL',
  'STAGING_CONSUMER_PASSWORD',
  'STAGING_PARTNER_EMAIL',
  'STAGING_PARTNER_PASSWORD',
  'STAGING_ADMIN_EMAIL',
  'STAGING_ADMIN_PASSWORD',
]) {
  requireValue(identities, key, 'staging test identities');
}

console.log('Local browser environment is ready for staging. No secret values were printed.');
