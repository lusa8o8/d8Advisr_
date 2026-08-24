begin;

alter table public.profiles
  add column if not exists region_id text
    references public.regions(id) on update cascade on delete restrict;

create index if not exists profiles_region_id_idx on public.profiles(region_id);

comment on column public.profiles.region_id is
  'Canonical D8 discovery market selected by the consumer; legacy city remains temporarily for compatibility.';

create or replace function public.resolve_listing_region_id(
  explicit_region_id text,
  legacy_city text
)
returns text
language plpgsql
stable
set search_path = public
as $function$
declare
  resolved_id text;
  match_count integer;
begin
  if nullif(btrim(explicit_region_id), '') is not null then
    select region.id into resolved_id
    from public.regions region
    where region.id = btrim(explicit_region_id);

    if resolved_id is null then
      raise exception 'unknown_region_id:%', btrim(explicit_region_id)
        using errcode = '22023';
    end if;
    return resolved_id;
  end if;

  if nullif(btrim(legacy_city), '') is null then
    raise exception 'region_id_required' using errcode = '22023';
  end if;

  -- A historical value that is already an exact opaque ID is deterministic.
  select region.id into resolved_id
  from public.regions region
  where region.id = btrim(legacy_city);
  if resolved_id is not null then return resolved_id; end if;

  select count(*), min(region.id)
    into match_count, resolved_id
  from public.regions region
  where lower(btrim(region.name)) = lower(btrim(legacy_city));

  if match_count = 0 then
    raise exception 'unknown_legacy_region:%', btrim(legacy_city)
      using errcode = '22023';
  elsif match_count > 1 then
    raise exception 'ambiguous_legacy_region:%', btrim(legacy_city)
      using errcode = '22023';
  end if;
  return resolved_id;
end;
$function$;

revoke all on function public.resolve_listing_region_id(text,text)
  from public, anon, authenticated;

-- Preserve UUIDs and unknown profile values. Only deterministic values move.
with candidates as (
  select profile.id,
    case
      when exists (
        select 1 from public.regions exact_region
        where exact_region.id = btrim(profile.city)
      ) then btrim(profile.city)
      else (
        select min(named_region.id)
        from public.regions named_region
        where lower(btrim(named_region.name)) = lower(btrim(profile.city))
        having count(*) = 1
      )
    end as region_id
  from public.profiles profile
  where profile.region_id is null and nullif(btrim(profile.city), '') is not null
)
update public.profiles profile
set region_id = candidate.region_id
from candidates candidate
where profile.id = candidate.id and candidate.region_id is not null;

-- New users must choose a market; they are no longer silently assigned Lagos.
alter table public.profiles alter column city drop default;

grant select (region_id) on public.profiles to authenticated;
grant insert (region_id), update (region_id) on public.profiles to authenticated;

-- Safely finish the listing backfill before making the canonical key required.
update public.venues venue
set region_id = public.resolve_listing_region_id(null, venue.city)
where venue.region_id is null;

update public.events event
set region_id = public.resolve_listing_region_id(null, event.city)
where event.region_id is null;

do $validation$
begin
  if exists (select 1 from public.venues where region_id is null) then
    raise exception 'Phase 4.7C1 refused: a venue has no deterministic market';
  end if;
  if exists (select 1 from public.events where region_id is null) then
    raise exception 'Phase 4.7C1 refused: an event has no deterministic market';
  end if;
end
$validation$;

alter table public.venues alter column region_id set not null;
alter table public.events alter column region_id set not null;

create or replace function public.sync_venue_reference_fields()
returns trigger language plpgsql set search_path = public as $function$
begin
  new.region_id := public.resolve_listing_region_id(new.region_id, new.city);

  if new.area_id is null and nullif(btrim(new.area), '') is not null then
    select a.id into new.area_id from public.region_areas a
    where a.region_id = new.region_id and (
      lower(btrim(new.area)) = lower(a.name)
      or exists (select 1 from unnest(a.aliases) candidate
        where lower(btrim(candidate)) = lower(btrim(new.area)))
    ) order by a.id limit 1;
    new.area_source := case when new.area_id is null then 'manual' else 'catalog' end;
  end if;

  if new.category_id is null and nullif(btrim(new.category), '') is not null then
    select a.category_id into new.category_id
    from public.listing_category_aliases a
    where a.listing_kind = 'venue' and a.alias = lower(btrim(new.category));
  end if;

  if new.price_level is null and new.price_tier in ('$','$$','$$$','$$$$') then
    new.price_level := char_length(new.price_tier);
  end if;
  return new;
end;
$function$;

create or replace function public.sync_event_reference_fields()
returns trigger language plpgsql set search_path = public as $function$
begin
  new.region_id := public.resolve_listing_region_id(new.region_id, new.city);

  if new.category_id is null and nullif(btrim(new.category), '') is not null then
    select a.category_id into new.category_id
    from public.listing_category_aliases a
    where a.listing_kind = 'event' and a.alias = lower(btrim(new.category));
  end if;
  return new;
end;
$function$;

create or replace function public.apply_venue_reference_fields()
returns trigger language plpgsql set search_path = public as $function$
declare
  selected_region public.regions;
  selected_area public.region_areas;
  selected_category public.listing_categories;
begin
  select * into strict selected_region from public.regions where id = new.region_id;
  -- Deliberately do not derive physical city/locality from the market label.
  if new.category_id is not null then
    select * into strict selected_category from public.listing_categories where id = new.category_id;
    if not ('venue' = any(selected_category.applies_to)) then
      raise exception 'category_not_valid_for_venue' using errcode = '22023';
    end if;
    new.category := selected_category.label;
  end if;
  if new.area_id is not null then
    select * into strict selected_area from public.region_areas where id = new.area_id;
    if selected_area.region_id <> new.region_id then
      raise exception 'area_not_in_selected_region' using errcode = '22023';
    end if;
    new.area := selected_area.name;
    new.area_source := 'catalog';
  elsif nullif(btrim(new.area), '') is not null and new.area_source is null then
    new.area_source := 'manual';
  end if;
  if new.price_level is not null then new.price_tier := repeat('$', new.price_level); end if;
  return new;
end;
$function$;

create or replace function public.apply_event_reference_fields()
returns trigger language plpgsql set search_path = public as $function$
declare
  selected_region public.regions;
  selected_category public.listing_categories;
begin
  select * into strict selected_region from public.regions where id = new.region_id;
  -- Currency is market-owned; physical city/locality remains independent.
  new.currency := selected_region.currency_code;
  if new.category_id is not null then
    select * into strict selected_category from public.listing_categories where id = new.category_id;
    if not ('event' = any(selected_category.applies_to)) then
      raise exception 'category_not_valid_for_event' using errcode = '22023';
    end if;
    new.category := selected_category.label;
  end if;
  return new;
end;
$function$;

-- Retry-safe admin venue creation now resolves the market before the legacy
-- insert and restores the independently supplied physical locality after it.
create or replace function public.admin_create_venue(p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $function$
declare
  actor uuid := auth.uid(); request_key_value uuid; existing_venue_id uuid;
  created_venue_id uuid; selected_region_id text; physical_city text;
begin
  if not public.is_admin_user() then raise exception 'Only admins can create listings' using errcode='42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'Venue payload must be a JSON object' using errcode='22023'; end if;
  request_key_value := nullif(btrim(p_payload->>'request_key'),'')::uuid;
  if request_key_value is null then raise exception 'Venue request_key is required' using errcode='22023'; end if;
  if lower(coalesce(nullif(btrim(p_payload->>'publication_status'),''),'draft')) <> 'draft' then
    raise exception 'Admin-created venues must be saved as drafts and approved separately' using errcode='22023';
  end if;
  selected_region_id := public.resolve_listing_region_id(p_payload->>'region_id', p_payload->>'city');
  physical_city := coalesce(nullif(btrim(p_payload->>'city'),''), (select name from public.regions where id=selected_region_id));
  perform pg_advisory_xact_lock(hashtextextended(actor::text||':admin_create_venue:'||request_key_value::text,0));
  select audit.venue_id into existing_venue_id from public.listing_admin_audit_log audit
    where audit.actor_id=actor and audit.action='created' and audit.request_key=request_key_value and audit.venue_id is not null;
  if existing_venue_id is not null then return existing_venue_id; end if;
  created_venue_id := public.admin_create_venue_phase4_legacy(
    (p_payload - 'publication_status') || jsonb_build_object('publication_status','draft','city',selected_region_id)
  );
  update public.venues set region_id=selected_region_id, city=physical_city where id=created_venue_id;
  update public.listing_admin_audit_log set request_key=request_key_value,
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('region_id',selected_region_id,'city',physical_city)
    where venue_id=created_venue_id and actor_id=actor and action='created';
  return created_venue_id;
end;
$function$;

create or replace function public.admin_create_event(p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $function$
declare
  actor uuid := auth.uid(); request_key_value uuid; existing_event_id uuid;
  created_event_id uuid; requested_status text; selected_region_id text;
  physical_city text; linked_venue_id uuid;
begin
  if not public.is_admin_user() then raise exception 'Only admins can create listings' using errcode='42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'Event payload must be a JSON object' using errcode='22023'; end if;
  request_key_value := nullif(btrim(p_payload->>'request_key'),'')::uuid;
  if request_key_value is null then raise exception 'Event request_key is required' using errcode='22023'; end if;
  requested_status := lower(coalesce(nullif(btrim(p_payload->>'publication_status'),''),'draft'));
  selected_region_id := public.resolve_listing_region_id(p_payload->>'region_id', p_payload->>'city');
  physical_city := coalesce(nullif(btrim(p_payload->>'city'),''), (select name from public.regions where id=selected_region_id));
  linked_venue_id := nullif(p_payload->>'venue_id','')::uuid;
  if lower(coalesce(p_payload->>'event_location_kind','undisclosed'))='d8_venue'
    and not exists (select 1 from public.venues where id=linked_venue_id and region_id=selected_region_id) then
    raise exception 'D8 venue must belong to the selected market' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text||':admin_create_event:'||request_key_value::text,0));
  select audit.event_id into existing_event_id from public.listing_admin_audit_log audit
    where audit.actor_id=actor and audit.action='created' and audit.request_key=request_key_value and audit.event_id is not null;
  if existing_event_id is not null then return existing_event_id; end if;
  created_event_id := public.admin_create_event_phase4_legacy(
    (p_payload - 'publication_status') || jsonb_build_object('publication_status','draft','city',selected_region_id)
  );
  update public.events set region_id=selected_region_id, city=physical_city where id=created_event_id;
  update public.listing_admin_audit_log set request_key=request_key_value,
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('region_id',selected_region_id,'city',physical_city)
    where event_id=created_event_id and actor_id=actor and action='created';
  if requested_status='live' then
    perform public.publish_event_with_policy(created_event_id,p_payload->>'policy_id',p_payload->>'policy_version',
      coalesce((p_payload->>'policy_acknowledged')::boolean,false),request_key_value);
    update public.listing_admin_audit_log set publication_status='live'
      where event_id=created_event_id and actor_id=actor and action='created';
  elsif requested_status <> 'draft' then
    raise exception 'Event publication_status must be draft or live' using errcode='22023';
  end if;
  return created_event_id;
end;
$function$;

revoke all on function public.admin_create_venue(jsonb) from public, anon;
revoke all on function public.admin_create_event(jsonb) from public, anon;
grant execute on function public.admin_create_venue(jsonb) to authenticated;
grant execute on function public.admin_create_event(jsonb) to authenticated;

commit;
