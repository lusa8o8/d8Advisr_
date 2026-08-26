import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '..');
const requireFromDbPackage = createRequire(resolve(workspaceRoot, 'lib/db/package.json'));
const { Client } = requireFromDbPackage('pg');

const productionProjectRef = 'evfftzhrucwwfnertiup';
const snapshotTables = [
  ['auth', 'users'],
  ['auth', 'identities'],
  ['public', 'profiles'],
  ['public', 'plans'],
  ['public', 'plan_members'],
  ['public', 'plan_stops'],
  ['public', 'stash_funds'],
  ['public', 'stash_members'],
  ['public', 'stash_transactions'],
  ['public', 'saved_venues'],
  ['public', 'partner_applications'],
  ['public', 'venues'],
  ['public', 'events'],
  ['public', 'event_sources'],
  ['public', 'event_action_links'],
  ['public', 'event_provenance_audit'],
  ['public', 'listing_admin_audit_log'],
  ['storage', 'objects'],
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function jsonStringify(value) {
  return JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? item.toString() : item));
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function encryptionKey(passphrase, salt) {
  return scryptSync(passphrase, salt, 32);
}

function encryptSnapshot(snapshot, passphrase) {
  const plaintext = jsonStringify(snapshot);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(passphrase, salt), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    format: 'd8advisr-encrypted-production-snapshot',
    version: 1,
    algorithm: 'aes-256-gcm+scrypt',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    plaintextSha256: digest(plaintext),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decryptSnapshot(envelope, passphrase) {
  assert(envelope?.format === 'd8advisr-encrypted-production-snapshot', 'Unrecognized snapshot format');
  assert(envelope?.version === 1, `Unsupported snapshot version: ${envelope?.version}`);
  const salt = Buffer.from(envelope.salt, 'base64');
  const iv = Buffer.from(envelope.iv, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(passphrase, salt), iv);
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
  assert(digest(plaintext) === envelope.plaintextSha256, 'Snapshot digest verification failed');
  return JSON.parse(plaintext);
}

function safeTimestamp() {
  return new Date().toISOString().replaceAll(':', '').replaceAll('.', '-');
}

function poolerConnectionString(databasePassword) {
  const poolerPath = resolve(workspaceRoot, 'supabase/.temp/pooler-url');
  return readFile(poolerPath, 'utf8').then(value => {
    const url = new URL(value.trim());
    assert(
      url.username === `postgres.${productionProjectRef}`,
      `Refusing snapshot: linked database is ${url.username || 'unknown'}, expected postgres.${productionProjectRef}`,
    );
    url.password = databasePassword;
    return url.toString();
  });
}

async function tableExists(client, schema, table) {
  const result = await client.query('select to_regclass($1) is not null as exists', [`${schema}.${table}`]);
  return result.rows[0]?.exists === true;
}

async function captureSnapshot(databasePassword) {
  const client = new Client({
    connectionString: await poolerConnectionString(databasePassword),
    ssl: { rejectUnauthorized: false },
    application_name: 'd8advisr-production-preflight-snapshot',
  });
  await client.connect();
  try {
    await client.query('begin transaction isolation level repeatable read read only');
    await client.query("set local statement_timeout = '60s'");
    const database = await client.query(
      'select current_database() as database_name, current_user as database_user',
    );
    const tables = {};
    for (const [schema, table] of snapshotTables) {
      const key = `${schema}.${table}`;
      if (!(await tableExists(client, schema, table))) {
        tables[key] = { present: false, rows: [] };
        continue;
      }
      const result = await client.query(`select * from "${schema}"."${table}"`);
      tables[key] = { present: true, rows: result.rows };
    }
    await client.query('commit');

    const authIds = (tables['auth.users']?.rows ?? []).map(row => row.id).sort();
    return {
      formatVersion: 1,
      projectRef: productionProjectRef,
      capturedAt: new Date().toISOString(),
      database: database.rows[0],
      authUserUuidFingerprint: digest(authIds.join('\n')),
      tables,
      warning:
        'Contains sensitive Auth and consumer data. Keep encrypted; Storage object bytes are not included.',
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function printSummary(snapshot, filePath = null) {
  assert(snapshot.projectRef === productionProjectRef, 'Snapshot project ref does not match production');
  if (filePath) console.log(`Encrypted snapshot: ${filePath}`);
  console.log(`Captured: ${snapshot.capturedAt}`);
  console.log(`Auth UUID fingerprint: ${snapshot.authUserUuidFingerprint}`);
  for (const [table, value] of Object.entries(snapshot.tables)) {
    console.log(`${table}: ${value.present ? value.rows.length : 'not present'}`);
  }
}

async function inspectSnapshot(filePath, passphrase) {
  const envelope = JSON.parse(await readFile(resolve(filePath), 'utf8'));
  const snapshot = decryptSnapshot(envelope, passphrase);
  printSummary(snapshot, resolve(filePath));
}

async function createSnapshot(databasePassword, passphrase, outputPath) {
  assert(databasePassword, 'PRODUCTION_DB_PASSWORD is required');
  assert(passphrase?.length >= 16, 'PRODUCTION_BACKUP_PASSPHRASE must contain at least 16 characters');
  const snapshot = await captureSnapshot(databasePassword);
  const envelope = encryptSnapshot(snapshot, passphrase);
  const destination = resolve(
    outputPath ?? resolve(workspaceRoot, 'local-backups', `main-preflight-${safeTimestamp()}.json.enc`),
  );
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(envelope)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });

  // Read, authenticate, decrypt and compare the exact payload before reporting success.
  const storedEnvelope = JSON.parse(await readFile(destination, 'utf8'));
  const verified = decryptSnapshot(storedEnvelope, passphrase);
  assert(jsonStringify(verified) === jsonStringify(snapshot), 'Stored snapshot round-trip verification failed');
  printSummary(verified, destination);
  console.log('PASS encrypted snapshot round-trip verification');
}

async function selfTest() {
  for (const requiredTable of [
    'public.event_sources',
    'public.event_action_links',
    'public.event_provenance_audit',
    'public.listing_admin_audit_log',
  ]) {
    assert(snapshotTables.some(([schema, table]) => `${schema}.${table}` === requiredTable),
      `Production snapshot inventory is missing ${requiredTable}`);
  }
  const snapshot = {
    projectRef: productionProjectRef,
    capturedAt: 'test',
    authUserUuidFingerprint: digest('test-user'),
    tables: { 'auth.users': { present: true, rows: [{ id: 'test-user' }] } },
  };
  const envelope = encryptSnapshot(snapshot, 'test-passphrase-with-16-chars');
  assert(jsonStringify(decryptSnapshot(envelope, 'test-passphrase-with-16-chars')) === jsonStringify(snapshot));
  console.log('PASS encryption round-trip self-test');
}

const [command = 'snapshot', argument] = process.argv.slice(2);
if (command === '--self-test') {
  await selfTest();
} else if (command === '--inspect') {
  assert(argument, 'Usage: node scripts/production-preflight-snapshot.mjs --inspect <snapshot-file>');
  assert(process.env.PRODUCTION_BACKUP_PASSPHRASE, 'PRODUCTION_BACKUP_PASSPHRASE is required');
  await inspectSnapshot(argument, process.env.PRODUCTION_BACKUP_PASSPHRASE);
} else if (command === 'snapshot') {
  await createSnapshot(
    process.env.PRODUCTION_DB_PASSWORD,
    process.env.PRODUCTION_BACKUP_PASSPHRASE,
    process.env.PRODUCTION_BACKUP_PATH,
  );
} else {
  throw new Error(`Unknown command: ${command}`);
}
