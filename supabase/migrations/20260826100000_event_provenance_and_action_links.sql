-- Phase 4.8A Slice 1: attributable research evidence and external event
-- actions. D8 does not sell tickets in this contract.

create table public.event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  source_type text not null check (
    source_type in ('organizer', 'venue', 'ticketing', 'press', 'calendar', 'social')
  ),
  publisher_name text not null check (
    nullif(btrim(publisher_name), '') is not null and char_length(publisher_name) <= 120
  ),
  source_title text check (
    source_title is null or (nullif(btrim(source_title), '') is not null and char_length(source_title) <= 250)
  ),
  url text not null check (
    char_length(url) <= 1000 and url ~* '^https?://[^[:space:]]+$'
  ),
  verification_status text not null default 'unverified' check (
    verification_status in ('unverified', 'verified', 'stale', 'rejected')
  ),
  is_primary boolean not null default false,
  show_publicly boolean not null default false,
  observed_at timestamptz,
  last_checked_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  internal_note text check (internal_note is null or char_length(internal_note) <= 1000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_sources_verification_state_check check (
    (
      verification_status = 'verified'
      and verified_by is not null
      and last_checked_at is not null
    ) or (
      verification_status <> 'verified'
      and not show_publicly
      and not is_primary
    )
  ),
  constraint event_sources_primary_public_check check (
    not is_primary or (show_publicly and verification_status = 'verified')
  ),
  unique (event_id, url)
);

create unique index event_sources_one_primary_public_idx
  on public.event_sources(event_id)
  where is_primary and show_publicly and verification_status = 'verified';

create index event_sources_event_status_idx
  on public.event_sources(event_id, verification_status, updated_at desc);

create table public.event_action_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  link_type text not null check (link_type in ('tickets', 'registration', 'official')),
  provider_name text not null check (
    nullif(btrim(provider_name), '') is not null and char_length(provider_name) <= 120
  ),
  label text not null check (
    label in ('Get tickets', 'Register', 'View official details')
  ),
  url text not null check (
    char_length(url) <= 1000 and url ~* '^https?://[^[:space:]]+$'
  ),
  status text not null default 'unverified' check (
    status in ('unverified', 'active', 'sold_out', 'closed', 'invalid')
  ),
  is_primary boolean not null default false,
  last_checked_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_action_links_verification_state_check check (
    (
      status = 'unverified'
      and last_checked_at is null
      and verified_by is null
      and not is_primary
    ) or (
      status <> 'unverified'
      and last_checked_at is not null
      and verified_by is not null
    )
  ),
  constraint event_action_links_primary_state_check check (
    not is_primary or status in ('active', 'sold_out')
  ),
  unique (event_id, url)
);

create unique index event_action_links_one_primary_idx
  on public.event_action_links(event_id)
  where is_primary and status in ('active', 'sold_out');

create index event_action_links_event_status_idx
  on public.event_action_links(event_id, status, updated_at desc);

create table public.event_provenance_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  action text not null check (action in ('replaced')),
  actor_user_id uuid references public.profiles(id) on delete set null,
  request_key uuid not null,
  previous_state jsonb not null check (jsonb_typeof(previous_state) = 'object'),
  resulting_state jsonb not null check (jsonb_typeof(resulting_state) = 'object'),
  created_at timestamptz not null default now(),
  unique (actor_user_id, request_key)
);

create index event_provenance_audit_event_idx
  on public.event_provenance_audit(event_id, created_at desc);

alter table public.event_sources enable row level security;
alter table public.event_action_links enable row level security;
alter table public.event_provenance_audit enable row level security;

create policy event_sources_public_select
  on public.event_sources for select
  to anon, authenticated
  using (
    show_publicly
    and verification_status = 'verified'
    and exists (
      select 1 from public.events event
      where event.id = event_sources.event_id
        and event.retired_at is null
        and event.event_status in ('live', 'cancelled')
    )
  );

create policy event_sources_admin_all
  on public.event_sources for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy event_action_links_public_select
  on public.event_action_links for select
  to anon, authenticated
  using (
    status in ('active', 'sold_out')
    and exists (
      select 1 from public.events event
      where event.id = event_action_links.event_id
        and event.retired_at is null
        and event.event_status in ('live', 'cancelled')
    )
  );

create policy event_action_links_admin_all
  on public.event_action_links for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy event_provenance_audit_admin_select
  on public.event_provenance_audit for select
  to authenticated
  using (public.is_admin_user());

revoke all on public.event_sources from public, anon, authenticated;
revoke all on public.event_action_links from public, anon, authenticated;
revoke all on public.event_provenance_audit from public, anon, authenticated;
grant select on public.event_sources to anon, authenticated;
grant select on public.event_action_links to anon, authenticated;
grant select on public.event_provenance_audit to authenticated;

-- Listing origin is server-owned once an event exists. In particular, a
-- partner must not relabel an event as D8-created/imported (or vice versa) by
-- modifying a browser request.
create or replace function public.protect_event_listing_origin()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  authorized_event_id text := nullif(current_setting('d8.event_origin_event_id', true), '');
begin
  if new.source is distinct from old.source
    and authorized_event_id is distinct from old.id::text then
    raise exception 'event_listing_origin_is_server_managed' using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function public.protect_event_listing_origin() from public, anon, authenticated;

drop trigger if exists "00_protect_event_listing_origin" on public.events;
create trigger "00_protect_event_listing_origin"
  before update of source on public.events
  for each row execute function public.protect_event_listing_origin();

create or replace function public.admin_replace_event_provenance(
  p_event_id uuid,
  p_sources jsonb,
  p_action_links jsonb,
  p_expected_updated_at timestamptz,
  p_request_key uuid,
  p_mark_as_import boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  target_event public.events;
  existing_audit public.event_provenance_audit;
  source_item jsonb;
  action_item jsonb;
  source_status text;
  action_status text;
  source_url text;
  action_url text;
  source_public boolean;
  source_primary boolean;
  action_primary boolean;
  checked_at timestamptz;
  observed_at_value timestamptz;
  previous_snapshot jsonb;
  resulting_snapshot jsonb;
  next_updated_at timestamptz;
begin
  if actor is null or not public.is_admin_user() then
    raise exception 'admin_event_provenance_required' using errcode = '42501';
  end if;
  if p_event_id is null or p_expected_updated_at is null or p_request_key is null then
    raise exception 'event_id_expected_updated_at_and_request_key_required' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_sources, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_action_links, '[]'::jsonb)) <> 'array' then
    raise exception 'event_provenance_payloads_must_be_arrays' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_sources, '[]'::jsonb)) > 10
    or jsonb_array_length(coalesce(p_action_links, '[]'::jsonb)) > 5 then
    raise exception 'event_provenance_payload_limit_exceeded' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(actor::text || ':admin_replace_event_provenance:' || p_request_key::text, 0)
  );

  select * into existing_audit
  from public.event_provenance_audit audit
  where audit.actor_user_id = actor and audit.request_key = p_request_key;

  if found then
    if existing_audit.event_id <> p_event_id then
      raise exception 'event_provenance_request_key_reused' using errcode = '22023';
    end if;
    return existing_audit.resulting_state;
  end if;

  select * into target_event from public.events where id = p_event_id for update;
  if not found then raise exception 'event_not_found' using errcode = 'P0002'; end if;
  if target_event.retired_at is not null then
    raise exception 'retired_event_provenance_cannot_change' using errcode = '22023';
  end if;
  if target_event.updated_at is distinct from p_expected_updated_at then
    raise exception 'event_changed_after_provenance_loaded' using errcode = '40001';
  end if;
  if coalesce(p_mark_as_import, false) and target_event.first_published_at is not null then
    raise exception 'published_event_origin_cannot_change_to_import' using errcode = '22023';
  end if;
  if coalesce(p_mark_as_import, false) and target_event.source is distinct from 'd8_admin' then
    raise exception 'only_d8_admin_drafts_can_be_marked_as_imports' using errcode = '22023';
  end if;

  previous_snapshot := jsonb_build_object(
    'event_source', target_event.source,
    'sources', coalesce((
      select jsonb_agg(to_jsonb(source) - 'event_id' order by source.created_at, source.id)
      from public.event_sources source where source.event_id = p_event_id
    ), '[]'::jsonb),
    'action_links', coalesce((
      select jsonb_agg(to_jsonb(link) - 'event_id' order by link.created_at, link.id)
      from public.event_action_links link where link.event_id = p_event_id
    ), '[]'::jsonb)
  );

  delete from public.event_sources where event_id = p_event_id;
  delete from public.event_action_links where event_id = p_event_id;

  for source_item in select value from jsonb_array_elements(coalesce(p_sources, '[]'::jsonb))
  loop
    if jsonb_typeof(source_item) <> 'object' then
      raise exception 'event_source_must_be_an_object' using errcode = '22023';
    end if;
    source_status := lower(coalesce(nullif(btrim(source_item->>'verification_status'), ''), 'unverified'));
    source_url := btrim(coalesce(source_item->>'url', ''));
    source_public := coalesce((source_item->>'show_publicly')::boolean, false);
    source_primary := coalesce((source_item->>'is_primary')::boolean, false);
    checked_at := nullif(source_item->>'last_checked_at', '')::timestamptz;
    observed_at_value := nullif(source_item->>'observed_at', '')::timestamptz;

    if source_status not in ('unverified', 'verified', 'stale', 'rejected') then
      raise exception 'invalid_event_source_verification_status' using errcode = '22023';
    end if;
    if source_url !~* '^https?://[^[:space:]]+$' or char_length(source_url) > 1000 then
      raise exception 'invalid_event_source_url' using errcode = '22023';
    end if;
    if source_status <> 'verified' and (source_public or source_primary) then
      raise exception 'only_verified_event_sources_can_be_public' using errcode = '22023';
    end if;
    if source_primary and not source_public then
      raise exception 'primary_event_source_must_be_public' using errcode = '22023';
    end if;
    if checked_at > now() + interval '5 minutes' or observed_at_value > now() + interval '5 minutes' then
      raise exception 'event_source_timestamps_cannot_be_in_the_future' using errcode = '22023';
    end if;
    if source_status = 'verified' then checked_at := coalesce(checked_at, now());
    else checked_at := null; end if;

    insert into public.event_sources (
      event_id, source_type, publisher_name, source_title, url,
      verification_status, is_primary, show_publicly, observed_at,
      last_checked_at, verified_by, internal_note, created_by
    ) values (
      p_event_id,
      lower(btrim(coalesce(source_item->>'source_type', ''))),
      btrim(coalesce(source_item->>'publisher_name', '')),
      nullif(btrim(source_item->>'source_title'), ''),
      source_url, source_status, source_primary, source_public,
      observed_at_value, checked_at,
      case when source_status = 'verified' then actor else null end,
      nullif(btrim(source_item->>'internal_note'), ''), actor
    );
  end loop;

  for action_item in select value from jsonb_array_elements(coalesce(p_action_links, '[]'::jsonb))
  loop
    if jsonb_typeof(action_item) <> 'object' then
      raise exception 'event_action_link_must_be_an_object' using errcode = '22023';
    end if;
    action_status := lower(coalesce(nullif(btrim(action_item->>'status'), ''), 'unverified'));
    action_url := btrim(coalesce(action_item->>'url', ''));
    action_primary := coalesce((action_item->>'is_primary')::boolean, false);
    checked_at := nullif(action_item->>'last_checked_at', '')::timestamptz;

    if action_status not in ('unverified', 'active', 'sold_out', 'closed', 'invalid') then
      raise exception 'invalid_event_action_link_status' using errcode = '22023';
    end if;
    if action_url !~* '^https?://[^[:space:]]+$' or char_length(action_url) > 1000 then
      raise exception 'invalid_event_action_link_url' using errcode = '22023';
    end if;
    if action_primary and action_status not in ('active', 'sold_out') then
      raise exception 'primary_event_action_link_must_be_public' using errcode = '22023';
    end if;
    if checked_at > now() + interval '5 minutes' then
      raise exception 'event_action_link_timestamp_cannot_be_in_the_future' using errcode = '22023';
    end if;
    if action_status = 'unverified' then checked_at := null;
    else checked_at := coalesce(checked_at, now()); end if;

    insert into public.event_action_links (
      event_id, link_type, provider_name, label, url, status, is_primary,
      last_checked_at, verified_by, created_by
    ) values (
      p_event_id,
      lower(btrim(coalesce(action_item->>'link_type', ''))),
      btrim(coalesce(action_item->>'provider_name', '')),
      case lower(btrim(coalesce(action_item->>'link_type', '')))
        when 'tickets' then 'Get tickets'
        when 'registration' then 'Register'
        when 'official' then 'View official details'
        else ''
      end,
      action_url, action_status, action_primary, checked_at,
      case when action_status <> 'unverified' then actor else null end, actor
    );
  end loop;

  next_updated_at := clock_timestamp();
  if coalesce(p_mark_as_import, false) then
    perform set_config('d8.event_origin_event_id', p_event_id::text, true);
  end if;
  update public.events
  set source = case when coalesce(p_mark_as_import, false) then 'import' else source end,
      updated_at = next_updated_at
  where id = p_event_id;

  resulting_snapshot := jsonb_build_object(
    'event_id', p_event_id,
    'event_source', case when coalesce(p_mark_as_import, false) then 'import' else target_event.source end,
    'event_updated_at', next_updated_at,
    'sources', coalesce((
      select jsonb_agg(to_jsonb(source) - 'event_id' order by source.created_at, source.id)
      from public.event_sources source where source.event_id = p_event_id
    ), '[]'::jsonb),
    'action_links', coalesce((
      select jsonb_agg(to_jsonb(link) - 'event_id' order by link.created_at, link.id)
      from public.event_action_links link where link.event_id = p_event_id
    ), '[]'::jsonb)
  );

  insert into public.event_provenance_audit (
    event_id, action, actor_user_id, request_key, previous_state, resulting_state
  ) values (
    p_event_id, 'replaced', actor, p_request_key, previous_snapshot, resulting_snapshot
  );

  return resulting_snapshot;
end;
$function$;

revoke all on function public.admin_replace_event_provenance(
  uuid, jsonb, jsonb, timestamptz, uuid, boolean
) from public, anon;
grant execute on function public.admin_replace_event_provenance(
  uuid, jsonb, jsonb, timestamptz, uuid, boolean
) to authenticated;

-- Imported/researched events require verified evidence before first or later
-- publication. Partner and ordinary D8-admin events retain their existing
-- policy-v1.1 publication behavior.
create or replace function public.enforce_import_event_verified_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.source = 'import'
    and new.event_status = 'live'
    and not exists (
      select 1 from public.event_sources source
      where source.event_id = new.id and source.verification_status = 'verified'
    ) then
    raise exception 'import_event_verified_source_required' using errcode = '22023';
  end if;
  return new;
end;
$function$;

revoke all on function public.enforce_import_event_verified_source() from public, anon, authenticated;

drop trigger if exists "02_enforce_import_event_verified_source" on public.events;
create trigger "02_enforce_import_event_verified_source"
  before insert or update of event_status, source on public.events
  for each row execute function public.enforce_import_event_verified_source();
