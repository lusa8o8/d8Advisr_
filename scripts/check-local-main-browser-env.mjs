import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const mainRef = 'evfftzhrucwwfnertiup';

async function readEnv(relativePath) {
  const content = await readFile(resolve(root, relativePath), 'utf8');
  return Object.fromEntries(content.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
}

const consumer = await readEnv('artifacts/d8advisr/.env.local');
const partner = await readEnv('artifacts/d8advisr-partner/.env.local');

for (const [label, env] of [['consumer', consumer], ['partner', partner]]) {
  if (!env.VITE_SUPABASE_URL?.includes(mainRef)) {
    throw new Error(`${label} normal local environment must target the main D8 project`);
  }
  if (!env.VITE_SUPABASE_ANON_KEY?.trim()) {
    throw new Error(`${label} normal local environment is missing its public Supabase key`);
  }
}

if (consumer.VITE_SUPABASE_URL !== partner.VITE_SUPABASE_URL
  || consumer.VITE_SUPABASE_ANON_KEY !== partner.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Consumer and partner normal local environments do not share one main Supabase client configuration');
}

if (partner.VITE_AUTH_REDIRECT_ORIGIN !== 'http://localhost:3001') {
  throw new Error('Partner local auth callback origin must be http://localhost:3001');
}
if (partner.VITE_CONSUMER_ORIGIN !== 'http://localhost:3000') {
  throw new Error('Partner local consumer origin must be http://localhost:3000');
}

console.log(`Local consumer and partner environments both target main (${mainRef}). No keys were printed.`);
