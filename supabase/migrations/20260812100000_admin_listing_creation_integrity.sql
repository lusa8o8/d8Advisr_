-- Phase 4 correction: make admin listing creation retry-safe and require
-- venue approval before public discovery.

alter table public.listing_admin_audit_log
  add column request_key uuid;

create unique index listing_admin_audit_log_venue_request_key_idx
  on public.listing_admin_audit_log(actor_id, request_key)
  where request_key is not null and venue_id is not null;

create unique index listing_admin_audit_log_event_request_key_idx
  on public.listing_admin_audit_log(actor_id, request_key)
  where request_key is not null and event_id is not null;

alter function public.admin_create_venue(jsonb)
  rename to admin_create_venue_phase4_legacy;

alter function public.admin_create_event(jsonb)
  rename to admin_create_event_phase4_legacy;

revoke all on function public.admin_create_venue_phase4_legacy(jsonb)
  from public, anon, authenticated;
revoke all on function public.admin_create_event_phase4_legacy(jsonb)
  from public, anon, authenticated;

create or replace function public.admin_create_venue(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  request_key_value uuid;
  existing_venue_id uuid;
  created_venue_id uuid;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can create listings'
      using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Venue payload must be a JSON object'
      using errcode = '22023';
  end if;

  request_key_value := nullif(btrim(p_payload ->> 'request_key'), '')::uuid;
  if request_key_value is null then
    raise exception 'Venue request_key is required'
      using errcode = '22023';
  end if;

  if lower(coalesce(nullif(btrim(p_payload ->> 'publication_status'), ''), 'draft')) <> 'draft' then
    raise exception 'Admin-created venues must be saved as drafts and approved separately'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(actor::text || ':admin_create_venue:' || request_key_value::text, 0)
  );

  select audit.venue_id
    into existing_venue_id
  from public.listing_admin_audit_log audit
  where audit.actor_id = actor
    and audit.action = 'created'
    and audit.request_key = request_key_value
    and audit.venue_id is not null;

  if existing_venue_id is not null then
    return existing_venue_id;
  end if;

  created_venue_id := public.admin_create_venue_phase4_legacy(
    (p_payload - 'publication_status') || jsonb_build_object('publication_status', 'draft')
  );

  update public.listing_admin_audit_log
  set request_key = request_key_value
  where venue_id = created_venue_id
    and actor_id = actor
    and action = 'created';

  return created_venue_id;
end;
$$;

create or replace function public.admin_create_event(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  request_key_value uuid;
  existing_event_id uuid;
  created_event_id uuid;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can create listings'
      using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Event payload must be a JSON object'
      using errcode = '22023';
  end if;

  request_key_value := nullif(btrim(p_payload ->> 'request_key'), '')::uuid;
  if request_key_value is null then
    raise exception 'Event request_key is required'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(actor::text || ':admin_create_event:' || request_key_value::text, 0)
  );

  select audit.event_id
    into existing_event_id
  from public.listing_admin_audit_log audit
  where audit.actor_id = actor
    and audit.action = 'created'
    and audit.request_key = request_key_value
    and audit.event_id is not null;

  if existing_event_id is not null then
    return existing_event_id;
  end if;

  created_event_id := public.admin_create_event_phase4_legacy(p_payload);

  update public.listing_admin_audit_log
  set request_key = request_key_value
  where event_id = created_event_id
    and actor_id = actor
    and action = 'created';

  return created_event_id;
end;
$$;

revoke all on function public.admin_create_venue(jsonb) from public, anon;
revoke all on function public.admin_create_event(jsonb) from public, anon;
grant execute on function public.admin_create_venue(jsonb) to authenticated;
grant execute on function public.admin_create_event(jsonb) to authenticated;
