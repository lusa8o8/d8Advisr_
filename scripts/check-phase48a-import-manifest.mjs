import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifestPath = resolve(root, 'data/event-imports/lusaka-launch-v1.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (manifest.drafts.some(record => record.disposition !== 'draft_ready')) throw new Error('Non-ready record found in drafts');
if (!manifest.holds.some(record => record.reason_code === 'taxonomy_hold')) throw new Error('Taxonomy hold coverage missing');
if (!manifest.holds.some(record => record.reason_code === 'fact_conflict')) throw new Error('Fact-conflict hold coverage missing');
if (!manifest.holds.some(record => record.reason_code === 'source_hold')) throw new Error('Source hold coverage missing');

console.log('PASS Phase 4.8A reviewed import contract');
