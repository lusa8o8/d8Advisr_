import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const requireText = (source, values, label) => {
  for (const value of values) {
    if (!source.includes(value)) throw new Error(`Missing ${label}: ${value}`);
  }
};

const migration = read('supabase/migrations/20260819140000_event_revisions_contract.sql');

requireText(migration, [
  'create table if not exists public.event_revisions',
  'check (status in (\'applied\', \'pending\', \'approved\', \'rejected\', \'blocked\', \'cancelled\'))',
  'check (risk_level in (\'low\', \'high\'))',
  'check (enforcement_code in (\'A\', \'C\', \'R\', \'E\', \'B\', \'N\'))',
  'event_revisions_one_pending_idx',
  'alter table public.event_revisions enable row level security',
  'create policy "Admins can view and manage all event revisions"',
  'create policy "Partners can view own event revisions"',
  'create or replace function public.partner_submit_event_revision',
  'create or replace function public.admin_review_event_revision',
  'published_free_event_cannot_become_paid',
  'published_event_price_cannot_increase',
  'status\', \'pending\'',
  'status\', \'applied\'',
  'status\', \'approved\'',
  'status\', \'rejected\'',
], 'event revisions contract migration');

console.log('Phase 4.6B migration contract checks passed.');