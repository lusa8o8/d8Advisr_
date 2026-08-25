-- Admin listing retirement Slice 1.
-- Retirement is reversible and audit-preserving. Physical deletion remains a
-- service-role maintenance concern and is not exposed to browser roles.

alter table public.venues
  add column retired_at timestamptz,
  add column retired_by uuid references public.profiles(id) on delete set null,
  add column retirement_reason text,
  add column retired_from_status text;

alter table public.venues
  add constraint venues_retirement_metadata_check check (
    (
      retired_at is null
      and retired_by is null
      and retirement_reason is null
      and retired_from_status is null
    )
    or (
      retired_at is not null
      and nullif(btrim(retirement_reason), '') is not null
      and char_length(retirement_reason) between 3 and 500
      and retired_from_status in (
        'draft', 'submitted', 'under_review', 'live', 'needs_update', 'hidden'
      )
    )
  );

alter table public.events
  add column retired_at timestamptz,
  add column retired_by uuid references public.profiles(id) on delete set null,
  add column retirement_reason text,
  add column retired_from_status text;

alter table public.events
  add constraint events_retirement_metadata_check check (
    (
      retired_at is null
      and retired_by is null
      and retirement_reason is null
      and retired_from_status is null
    )
    or (
      retired_at is not null
      and nullif(btrim(retirement_reason), '') is not null
      and char_length(retirement_reason) between 3 and 500
      and retired_from_status in ('draft', 'live', 'paused', 'past', 'cancelled')
    )
  );

create index venues_current_retirement_idx
  on public.venues(region_id, listing_status, updated_at desc)
  where retired_at is null;

create index venues_retired_at_idx
  on public.venues(retired_at desc)
  where retired_at is not null;

create index events_current_retirement_idx
  on public.events(region_id, event_status, starts_at)
  where retired_at is null;

create index events_retired_at_idx
  on public.events(retired_at desc)
  where retired_at is not null;

create table public.listing_retirement_audit (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('venue', 'event')),
  listing_id uuid not null,
  action text not null check (action in ('retired', 'restored')),
  actor_user_id uuid references public.profiles(id) on delete set null,
  request_key uuid not null,
  reason text not null check (
    nullif(btrim(reason), '') is not null and char_length(reason) between 3 and 500
  ),
  previous_state jsonb not null check (jsonb_typeof(previous_state) = 'object'),
  resulting_state jsonb not null check (jsonb_typeof(resulting_state) = 'object'),
  created_at timestamptz not null default now(),
  unique (actor_user_id, request_key, target_type)
);

create index listing_retirement_audit_target_idx
  on public.listing_retirement_audit(target_type, listing_id, created_at desc);

alter table public.listing_retirement_audit enable row level security;

create policy listing_retirement_audit_admin_select
  on public.listing_retirement_audit for select
  to authenticated
  using (public.is_admin_user());

revoke all on public.listing_retirement_audit from public, anon, authenticated;
grant select on public.listing_retirement_audit to authenticated;

-- New columns on events inherit the table-level UPDATE grant that predates the
-- explicit-column grant work. This trigger is therefore the authoritative
-- boundary: only the retirement RPCs can set/clear retirement metadata or
-- mutate a row while it is retired.
create or replace function public.protect_listing_retirement_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  authorized_target text := current_setting('d8.listing_retirement_target', true);
  row_target text := tg_table_name || ':' || new.id::text;
begin
  if tg_op = 'INSERT' then
    if new.retired_at is not null
      or new.retired_by is not null
      or new.retirement_reason is not null
      or new.retired_from_status is not null
    then
      raise exception 'listing_retirement_rpc_required' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.retired_at is not null and authorized_target is distinct from row_target then
    raise exception 'retired_listing_rpc_required' using errcode = '42501';
  end if;

  if (
    new.retired_at is distinct from old.retired_at
    or new.retired_by is distinct from old.retired_by
    or new.retirement_reason is distinct from old.retirement_reason
    or new.retired_from_status is distinct from old.retired_from_status
  ) and authorized_target is distinct from row_target then
    raise exception 'listing_retirement_rpc_required' using errcode = '42501';
  end if;

  return new;
end;
$function$;

revoke all on function public.protect_listing_retirement_state() from public, anon, authenticated;

drop trigger if exists "00_protect_venue_retirement_state" on public.venues;
create trigger "00_protect_venue_retirement_state"
  before insert or update on public.venues
  for each row execute function public.protect_listing_retirement_state();

drop trigger if exists "00_protect_event_retirement_state" on public.events;
create trigger "00_protect_event_retirement_state"
  before insert or update on public.events
  for each row execute function public.protect_listing_retirement_state();

create or replace function public.admin_retire_venue(
  p_venue_id uuid,
  p_expected_updated_at timestamptz,
  p_reason text,
  p_request_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  platform_organization constant uuid := '00000000-0000-4000-8000-00000000d800'::uuid;
  target public.venues;
  updated_target public.venues;
  existing_audit public.listing_retirement_audit;
  previous_state jsonb;
  resulting_state jsonb;
begin
  if actor is null or not public.is_admin_user() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_venue_id is null then raise exception 'venue_id_required' using errcode = '22023'; end if;
  if p_expected_updated_at is null then raise exception 'expected_updated_at_required' using errcode = '22023'; end if;
  if p_request_key is null then raise exception 'request_key_required' using errcode = '22023'; end if;

  select * into existing_audit
  from public.listing_retirement_audit
  where actor_user_id = actor and request_key = p_request_key and target_type = 'venue';

  if found then
    if existing_audit.action <> 'retired' or existing_audit.listing_id <> p_venue_id then
      raise exception 'retirement_request_key_reused' using errcode = '22023';
    end if;
    return existing_audit.resulting_state || jsonb_build_object('idempotent', true);
  end if;

  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'retirement_reason_must_be_3_to_500_characters' using errcode = '22023';
  end if;

  select * into target from public.venues where id = p_venue_id for update;
  if not found then raise exception 'venue_not_found' using errcode = 'P0002'; end if;

  if target.retired_at is not null then
    raise exception 'venue_already_retired' using errcode = '22023';
  end if;
  if target.updated_at is distinct from p_expected_updated_at then
    raise exception 'venue_retirement_conflict' using errcode = '40001';
  end if;
  if target.partner_id is not null
    or target.source = 'partner'
    or (
      target.operator_organization_id is not null
      and target.operator_organization_id <> platform_organization
    )
  then
    raise exception 'partner_owned_venue_cannot_be_admin_retired' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.events event
    where event.venue_id = target.id
      and event.retired_at is null
      and event.event_status = 'live'
      and event.starts_at > now()
  ) then
    raise exception 'venue_has_future_live_events' using errcode = '22023';
  end if;

  previous_state := jsonb_build_object(
    'id', target.id,
    'name', target.name,
    'listing_status', target.listing_status,
    'is_active', target.is_active,
    'source', target.source,
    'partner_id', target.partner_id,
    'operator_organization_id', target.operator_organization_id,
    'updated_at', target.updated_at
  );

  perform set_config('d8.listing_retirement_target', 'venues:' || target.id::text, true);
  update public.venues
  set retired_at = now(), retired_by = actor,
      retirement_reason = btrim(p_reason), retired_from_status = target.listing_status,
      listing_status = 'hidden', is_active = false, updated_at = now()
  where id = target.id
  returning * into updated_target;

  resulting_state := jsonb_build_object(
    'listing_id', updated_target.id,
    'target_type', 'venue',
    'status', updated_target.listing_status,
    'is_active', updated_target.is_active,
    'retired_at', updated_target.retired_at,
    'retired_from_status', updated_target.retired_from_status,
    'updated_at', updated_target.updated_at,
    'idempotent', false
  );

  insert into public.listing_retirement_audit (
    target_type, listing_id, action, actor_user_id, request_key, reason,
    previous_state, resulting_state
  ) values (
    'venue', target.id, 'retired', actor, p_request_key, btrim(p_reason),
    previous_state, resulting_state
  );

  return resulting_state;
end;
$function$;

create or replace function public.admin_restore_venue(
  p_venue_id uuid,
  p_expected_updated_at timestamptz,
  p_reason text,
  p_request_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  platform_organization constant uuid := '00000000-0000-4000-8000-00000000d800'::uuid;
  target public.venues;
  updated_target public.venues;
  existing_audit public.listing_retirement_audit;
  previous_state jsonb;
  resulting_state jsonb;
begin
  if actor is null or not public.is_admin_user() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_venue_id is null then raise exception 'venue_id_required' using errcode = '22023'; end if;
  if p_expected_updated_at is null then raise exception 'expected_updated_at_required' using errcode = '22023'; end if;
  if p_request_key is null then raise exception 'request_key_required' using errcode = '22023'; end if;

  select * into existing_audit
  from public.listing_retirement_audit
  where actor_user_id = actor and request_key = p_request_key and target_type = 'venue';

  if found then
    if existing_audit.action <> 'restored' or existing_audit.listing_id <> p_venue_id then
      raise exception 'retirement_request_key_reused' using errcode = '22023';
    end if;
    return existing_audit.resulting_state || jsonb_build_object('idempotent', true);
  end if;

  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'restore_reason_must_be_3_to_500_characters' using errcode = '22023';
  end if;

  select * into target from public.venues where id = p_venue_id for update;
  if not found then raise exception 'venue_not_found' using errcode = 'P0002'; end if;
  if target.retired_at is null then raise exception 'venue_is_not_retired' using errcode = '22023'; end if;
  if target.updated_at is distinct from p_expected_updated_at then
    raise exception 'venue_restore_conflict' using errcode = '40001';
  end if;
  if target.partner_id is not null
    or target.source = 'partner'
    or (
      target.operator_organization_id is not null
      and target.operator_organization_id <> platform_organization
    )
  then
    raise exception 'partner_owned_venue_cannot_be_admin_restored' using errcode = '42501';
  end if;

  previous_state := jsonb_build_object(
    'id', target.id, 'name', target.name, 'listing_status', target.listing_status,
    'retired_at', target.retired_at, 'retired_from_status', target.retired_from_status,
    'updated_at', target.updated_at
  );

  perform set_config('d8.listing_retirement_target', 'venues:' || target.id::text, true);
  update public.venues
  set retired_at = null, retired_by = null, retirement_reason = null,
      retired_from_status = null, listing_status = 'draft', is_active = false,
      verification_status = 'unverified', reverification_reason = null,
      last_verified_at = null, next_verification_due_at = null, updated_at = now()
  where id = target.id
  returning * into updated_target;

  resulting_state := jsonb_build_object(
    'listing_id', updated_target.id, 'target_type', 'venue',
    'status', updated_target.listing_status, 'is_active', updated_target.is_active,
    'retired_at', updated_target.retired_at, 'updated_at', updated_target.updated_at,
    'idempotent', false
  );

  insert into public.listing_retirement_audit (
    target_type, listing_id, action, actor_user_id, request_key, reason,
    previous_state, resulting_state
  ) values (
    'venue', target.id, 'restored', actor, p_request_key, btrim(p_reason),
    previous_state, resulting_state
  );

  return resulting_state;
end;
$function$;

create or replace function public.admin_retire_event(
  p_event_id uuid,
  p_expected_updated_at timestamptz,
  p_reason text,
  p_request_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  platform_organization constant uuid := '00000000-0000-4000-8000-00000000d800'::uuid;
  target public.events;
  updated_target public.events;
  existing_audit public.listing_retirement_audit;
  previous_state jsonb;
  resulting_state jsonb;
  retirement_status text;
begin
  if actor is null or not public.is_admin_user() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_event_id is null then raise exception 'event_id_required' using errcode = '22023'; end if;
  if p_expected_updated_at is null then raise exception 'expected_updated_at_required' using errcode = '22023'; end if;
  if p_request_key is null then raise exception 'request_key_required' using errcode = '22023'; end if;

  select * into existing_audit
  from public.listing_retirement_audit
  where actor_user_id = actor and request_key = p_request_key and target_type = 'event';

  if found then
    if existing_audit.action <> 'retired' or existing_audit.listing_id <> p_event_id then
      raise exception 'retirement_request_key_reused' using errcode = '22023';
    end if;
    return existing_audit.resulting_state || jsonb_build_object('idempotent', true);
  end if;

  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'retirement_reason_must_be_3_to_500_characters' using errcode = '22023';
  end if;

  select * into target from public.events where id = p_event_id for update;
  if not found then raise exception 'event_not_found' using errcode = 'P0002'; end if;
  if target.retired_at is not null then raise exception 'event_already_retired' using errcode = '22023'; end if;
  if target.updated_at is distinct from p_expected_updated_at then
    raise exception 'event_retirement_conflict' using errcode = '40001';
  end if;
  if target.partner_id is not null
    or target.source = 'partner'
    or (
      target.organizer_organization_id is not null
      and target.organizer_organization_id <> platform_organization
    )
  then
    raise exception 'partner_owned_event_cannot_be_admin_retired' using errcode = '42501';
  end if;
  if target.event_status = 'live' and target.starts_at > now() then
    raise exception 'upcoming_live_event_must_be_cancelled_first' using errcode = '22023';
  end if;
  if target.event_status = 'cancelled'
    and target.cancelled_at is not null
    and target.cancelled_at > now() - interval '24 hours'
  then
    raise exception 'event_cancellation_visibility_window_active' using errcode = '22023';
  end if;

  retirement_status := case when target.first_published_at is null then 'draft' else 'paused' end;
  previous_state := jsonb_build_object(
    'id', target.id, 'title', target.title, 'event_status', target.event_status,
    'starts_at', target.starts_at, 'first_published_at', target.first_published_at,
    'cancelled_at', target.cancelled_at, 'source', target.source,
    'partner_id', target.partner_id,
    'organizer_organization_id', target.organizer_organization_id,
    'updated_at', target.updated_at
  );

  perform set_config('d8.listing_retirement_target', 'events:' || target.id::text, true);
  update public.events
  set retired_at = now(), retired_by = actor,
      retirement_reason = btrim(p_reason), retired_from_status = target.event_status,
      event_status = retirement_status, updated_at = now()
  where id = target.id
  returning * into updated_target;

  resulting_state := jsonb_build_object(
    'listing_id', updated_target.id, 'target_type', 'event',
    'status', updated_target.event_status, 'retired_at', updated_target.retired_at,
    'retired_from_status', updated_target.retired_from_status,
    'updated_at', updated_target.updated_at, 'idempotent', false
  );

  insert into public.listing_retirement_audit (
    target_type, listing_id, action, actor_user_id, request_key, reason,
    previous_state, resulting_state
  ) values (
    'event', target.id, 'retired', actor, p_request_key, btrim(p_reason),
    previous_state, resulting_state
  );

  return resulting_state;
end;
$function$;

create or replace function public.admin_restore_event(
  p_event_id uuid,
  p_expected_updated_at timestamptz,
  p_reason text,
  p_request_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  platform_organization constant uuid := '00000000-0000-4000-8000-00000000d800'::uuid;
  target public.events;
  updated_target public.events;
  existing_audit public.listing_retirement_audit;
  previous_state jsonb;
  resulting_state jsonb;
  restore_status text;
begin
  if actor is null or not public.is_admin_user() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_event_id is null then raise exception 'event_id_required' using errcode = '22023'; end if;
  if p_expected_updated_at is null then raise exception 'expected_updated_at_required' using errcode = '22023'; end if;
  if p_request_key is null then raise exception 'request_key_required' using errcode = '22023'; end if;

  select * into existing_audit
  from public.listing_retirement_audit
  where actor_user_id = actor and request_key = p_request_key and target_type = 'event';

  if found then
    if existing_audit.action <> 'restored' or existing_audit.listing_id <> p_event_id then
      raise exception 'retirement_request_key_reused' using errcode = '22023';
    end if;
    return existing_audit.resulting_state || jsonb_build_object('idempotent', true);
  end if;

  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'restore_reason_must_be_3_to_500_characters' using errcode = '22023';
  end if;

  select * into target from public.events where id = p_event_id for update;
  if not found then raise exception 'event_not_found' using errcode = 'P0002'; end if;
  if target.retired_at is null then raise exception 'event_is_not_retired' using errcode = '22023'; end if;
  if target.updated_at is distinct from p_expected_updated_at then
    raise exception 'event_restore_conflict' using errcode = '40001';
  end if;
  if target.partner_id is not null
    or target.source = 'partner'
    or (
      target.organizer_organization_id is not null
      and target.organizer_organization_id <> platform_organization
    )
  then
    raise exception 'partner_owned_event_cannot_be_admin_restored' using errcode = '42501';
  end if;

  restore_status := case when target.first_published_at is null then 'draft' else 'paused' end;
  previous_state := jsonb_build_object(
    'id', target.id, 'title', target.title, 'event_status', target.event_status,
    'retired_at', target.retired_at, 'retired_from_status', target.retired_from_status,
    'first_published_at', target.first_published_at, 'updated_at', target.updated_at
  );

  perform set_config('d8.listing_retirement_target', 'events:' || target.id::text, true);
  update public.events
  set retired_at = null, retired_by = null, retirement_reason = null,
      retired_from_status = null, event_status = restore_status, updated_at = now()
  where id = target.id
  returning * into updated_target;

  resulting_state := jsonb_build_object(
    'listing_id', updated_target.id, 'target_type', 'event',
    'status', updated_target.event_status, 'retired_at', updated_target.retired_at,
    'updated_at', updated_target.updated_at, 'idempotent', false
  );

  insert into public.listing_retirement_audit (
    target_type, listing_id, action, actor_user_id, request_key, reason,
    previous_state, resulting_state
  ) values (
    'event', target.id, 'restored', actor, p_request_key, btrim(p_reason),
    previous_state, resulting_state
  );

  return resulting_state;
end;
$function$;

revoke all on function public.admin_retire_venue(uuid, timestamptz, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_restore_venue(uuid, timestamptz, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_retire_event(uuid, timestamptz, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_restore_event(uuid, timestamptz, text, uuid) from public, anon, authenticated;

grant execute on function public.admin_retire_venue(uuid, timestamptz, text, uuid) to authenticated;
grant execute on function public.admin_restore_venue(uuid, timestamptz, text, uuid) to authenticated;
grant execute on function public.admin_retire_event(uuid, timestamptz, text, uuid) to authenticated;
grant execute on function public.admin_restore_event(uuid, timestamptz, text, uuid) to authenticated;

-- Remove browser-role physical deletion at both privilege and RLS layers.
revoke delete on public.venues from public, anon, authenticated;
revoke delete on public.events from public, anon, authenticated;

drop policy if exists "Live partners can delete own venues" on public.venues;
drop policy if exists "Live venue partners can delete own venues" on public.venues;
drop policy if exists "Live partners can delete own events" on public.events;
drop policy if exists "Live event partners can delete own events" on public.events;

drop policy if exists "Admins can manage venues" on public.venues;
drop policy if exists "Admins can insert venues" on public.venues;
drop policy if exists "Admins can update venues" on public.venues;
create policy "Admins can insert venues"
  on public.venues for insert to authenticated
  with check (public.is_admin_user());
create policy "Admins can update venues"
  on public.venues for update to authenticated
  using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists "Admins can manage events" on public.events;
drop policy if exists "Admins can view all events" on public.events;
drop policy if exists "Admins can insert events" on public.events;
drop policy if exists "Admins can update events" on public.events;
create policy "Admins can view all events"
  on public.events for select to authenticated
  using (public.is_admin_user());
create policy "Admins can insert events"
  on public.events for insert to authenticated
  with check (public.is_admin_user());
create policy "Admins can update events"
  on public.events for update to authenticated
  using (public.is_admin_user()) with check (public.is_admin_user());

