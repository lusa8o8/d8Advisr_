import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migration = readFileSync(
  resolve(root, 'supabase/migrations/20260819163000_consumer_interests_and_notifications.sql'),
  'utf8'
);

const requiredFragments = [
  'create table if not exists public.event_interests',
  "interest_type text not null default 'reminder'",
  'create table if not exists public.consumer_notifications',
  'alter table public.event_interests enable row level security',
  'alter table public.consumer_notifications enable row level security',
  'create or replace function public.toggle_event_interest',
  'create or replace function public.dispatch_event_change_notifications',
  'event_rescheduled',
  'event_relocated',
  'event_price_reduced',
  'perform public.dispatch_event_change_notifications',
];

for (const fragment of requiredFragments) {
  if (!migration.includes(fragment)) {
    throw new Error(`Missing required migration fragment: "${fragment}"`);
  }
}

console.log('Phase 4.6C migration contract checks passed.');