import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const requireText = (source, values, label) => {
  for (const value of values) {
    if (!source.includes(value)) throw new Error(`Missing ${label}: ${value}`);
  }
};

const commercial = read('supabase/migrations/20260818100000_event_commercial_foundation.sql');
const adminScopes = read('supabase/migrations/20260818101000_admin_access_scope_foundation.sql');

requireText(commercial, [
  'alter column price_pp type numeric(12,2)',
  'events_price_pp_scale',
  'events_live_paid_price_positive',
  'first_published_at',
  'initial_published_is_free',
  'initial_published_price',
  'initial_published_currency',
  'event_commercial_migration_exceptions',
  "'live_paid_event_requires_positive_price'",
  "set event_status = 'draft'",
  "commercial_baseline_source = 'legacy_backfill'",
  'event_publication_acknowledgements',
  'unique (actor_user_id, request_key)',
  'publish_event_with_policy',
  'event_policy_acknowledgement_required',
  'event_publication_rpc_required',
  'published_free_event_cannot_become_paid',
  'published_event_price_cannot_increase',
  'published_event_currency_is_immutable',
  'published_event_history_cannot_be_deleted',
  "p_policy_id is distinct from 'partner-event-publishing-v1.0'",
  "p_policy_version is distinct from '1.0'",
  '749f2d5c230588a3b540c5b69e774d816cfb79810ebc58d899b697a7d6fd226e',
  "jsonb_build_object('publication_status', 'draft')",
], 'event commercial foundation');

requireText(adminScopes, [
  'create table public.admin_access_assignments',
  "role in ('platform_admin', 'country_admin', 'region_admin')",
  "select profile.id, 'platform_admin'",
  'create or replace function public.is_platform_admin',
  'create or replace function public.admin_can_access_region',
  'platform_admins_create_access_assignments',
  'platform_admins_update_access_assignments',
  'platform_admins_delete_access_assignments',
], 'admin access scope foundation');

console.log('Phase 4.6A migration contract checks passed.');
