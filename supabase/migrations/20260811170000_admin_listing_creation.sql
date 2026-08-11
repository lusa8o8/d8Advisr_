-- Phase 4: transactional admin creation of unclaimed and D8Advisr listings.
-- This remains additive: legacy partner_id authorization is not changed.

create table public.listing_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  action text not null,
  attribution text not null,
  publication_status text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint listing_admin_audit_log_target_check
    check (num_nonnulls(venue_id, event_id) = 1),
  constraint listing_admin_audit_log_action_check
    check (action in ('created')),
  constraint listing_admin_audit_log_attribution_check
    check (attribution in ('unclaimed', 'd8advisr')),
  constraint listing_admin_audit_log_publication_check
    check (publication_status in ('draft', 'live'))
);

create index listing_admin_audit_log_venue_created_idx
  on public.listing_admin_audit_log(venue_id, created_at desc)
  where venue_id is not null;

create index listing_admin_audit_log_event_created_idx
  on public.listing_admin_audit_log(event_id, created_at desc)
  where event_id is not null;

alter table public.listing_admin_audit_log enable row level security;

create policy "Admins can view listing creation audit"
  on public.listing_admin_audit_log for select
  to authenticated
  using (public.is_admin_user());

revoke all on public.listing_admin_audit_log from anon, authenticated;
grant select on public.listing_admin_audit_log to authenticated;

create or replace function public.admin_create_venue(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  platform_organization constant uuid := '00000000-0000-4000-8000-00000000d800'::uuid;
  attribution text;
  publication_status text;
  venue_name text;
  venue_city text;
  venue_category text;
  venue_tier text;
  venue_id uuid;
  latitude double precision;
  longitude double precision;
  average_cost integer;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can create listings'
      using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Venue payload must be a JSON object'
      using errcode = '22023';
  end if;

  venue_name := nullif(btrim(p_payload ->> 'name'), '');
  venue_city := nullif(btrim(p_payload ->> 'city'), '');
  venue_category := nullif(btrim(p_payload ->> 'category'), '');
  attribution := lower(nullif(btrim(p_payload ->> 'attribution'), ''));
  publication_status := lower(coalesce(nullif(btrim(p_payload ->> 'publication_status'), ''), 'draft'));
  venue_tier := coalesce(nullif(btrim(p_payload ->> 'tier'), ''), 'Verified');

  if venue_name is null or venue_city is null or venue_category is null then
    raise exception 'Venue name, city, and category are required'
      using errcode = '22023';
  end if;
  if attribution not in ('unclaimed', 'd8advisr') then
    raise exception 'Venue attribution must be unclaimed or d8advisr'
      using errcode = '22023';
  end if;
  if publication_status not in ('draft', 'live') then
    raise exception 'Venue publication_status must be draft or live'
      using errcode = '22023';
  end if;
  if venue_tier not in ('Verified', 'D8 Approved', 'Hidden Gem') then
    raise exception 'Invalid venue tier'
      using errcode = '22023';
  end if;
  if p_payload ? 'images' and jsonb_typeof(p_payload -> 'images') <> 'array' then
    raise exception 'Venue images must be an array'
      using errcode = '22023';
  end if;
  if p_payload ? 'vibes' and jsonb_typeof(p_payload -> 'vibes') <> 'array' then
    raise exception 'Venue vibes must be an array'
      using errcode = '22023';
  end if;
  if p_payload ? 'open_hours'
    and p_payload -> 'open_hours' <> 'null'::jsonb
    and jsonb_typeof(p_payload -> 'open_hours') <> 'object' then
    raise exception 'Venue open_hours must be an object'
      using errcode = '22023';
  end if;

  latitude := nullif(p_payload ->> 'lat', '')::double precision;
  longitude := nullif(p_payload ->> 'lng', '')::double precision;
  average_cost := nullif(p_payload ->> 'avg_cost_pp', '')::integer;

  if (latitude is null) <> (longitude is null)
    or latitude not between -90 and 90
    or longitude not between -180 and 180 then
    raise exception 'Venue latitude and longitude must be provided together and be valid'
      using errcode = '22023';
  end if;
  if average_cost is not null and average_cost < 0 then
    raise exception 'Venue average cost cannot be negative'
      using errcode = '22023';
  end if;

  insert into public.venues (
    name, city, area, category, tier, price_tier, description, address,
    lat, lng, cover_image, images, vibes, review_count, avg_cost_pp, open_hours,
    is_active, is_hidden_gem, listing_status, verification_status,
    last_verified_at, next_verification_due_at, partner_id,
    operator_organization_id, created_by, source, created_at, updated_at
  ) values (
    venue_name,
    venue_city,
    nullif(btrim(p_payload ->> 'area'), ''),
    venue_category,
    venue_tier,
    nullif(btrim(p_payload ->> 'price_tier'), ''),
    nullif(btrim(p_payload ->> 'description'), ''),
    nullif(btrim(p_payload ->> 'address'), ''),
    latitude,
    longitude,
    nullif(btrim(p_payload ->> 'cover_image'), ''),
    case when p_payload ? 'images'
      then array(select jsonb_array_elements_text(p_payload -> 'images'))
      else '{}'::text[] end,
    case when p_payload ? 'vibes'
      then array(select jsonb_array_elements_text(p_payload -> 'vibes'))
      else '{}'::text[] end,
    0,
    average_cost,
    case when p_payload ? 'open_hours' and p_payload -> 'open_hours' <> 'null'::jsonb
      then p_payload -> 'open_hours' else null end,
    publication_status = 'live',
    venue_tier = 'Hidden Gem',
    publication_status,
    case when publication_status = 'live' then 'verified' else 'unverified' end,
    case when publication_status = 'live' then now() else null end,
    case when publication_status = 'live' then now() + interval '6 months' else null end,
    null,
    case when attribution = 'd8advisr' then platform_organization else null end,
    actor,
    'd8_admin',
    now(),
    now()
  ) returning id into venue_id;

  insert into public.listing_admin_audit_log (
    venue_id, action, attribution, publication_status, actor_id, metadata
  ) values (
    venue_id, 'created', attribution, publication_status, actor,
    jsonb_build_object('name', venue_name, 'city', venue_city, 'category', venue_category)
  );

  return venue_id;
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
  platform_organization constant uuid := '00000000-0000-4000-8000-00000000d800'::uuid;
  attribution text;
  publication_status text;
  location_kind text;
  event_title text;
  event_city text;
  event_id uuid;
  linked_venue_id uuid;
  starts_at_value timestamptz;
  ends_at_value timestamptz;
  price_value integer;
  capacity_value integer;
  free_event boolean;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can create listings'
      using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Event payload must be a JSON object'
      using errcode = '22023';
  end if;

  event_title := nullif(btrim(p_payload ->> 'title'), '');
  event_city := nullif(btrim(p_payload ->> 'city'), '');
  attribution := lower(nullif(btrim(p_payload ->> 'attribution'), ''));
  publication_status := lower(coalesce(nullif(btrim(p_payload ->> 'publication_status'), ''), 'draft'));
  location_kind := lower(coalesce(nullif(btrim(p_payload ->> 'event_location_kind'), ''), 'undisclosed'));
  starts_at_value := nullif(p_payload ->> 'starts_at', '')::timestamptz;
  ends_at_value := nullif(p_payload ->> 'ends_at', '')::timestamptz;
  linked_venue_id := nullif(p_payload ->> 'venue_id', '')::uuid;
  free_event := coalesce(nullif(p_payload ->> 'is_free', '')::boolean, false);
  price_value := case when free_event then 0
    else coalesce(nullif(p_payload ->> 'price_pp', '')::integer, 0) end;
  capacity_value := coalesce(nullif(p_payload ->> 'capacity', '')::integer, 0);

  if event_title is null or event_city is null or starts_at_value is null then
    raise exception 'Event title, city, and starts_at are required'
      using errcode = '22023';
  end if;
  if attribution not in ('unclaimed', 'd8advisr') then
    raise exception 'Event attribution must be unclaimed or d8advisr'
      using errcode = '22023';
  end if;
  if publication_status not in ('draft', 'live') then
    raise exception 'Event publication_status must be draft or live'
      using errcode = '22023';
  end if;
  if location_kind not in ('d8_venue', 'external', 'undisclosed') then
    raise exception 'Invalid event location kind'
      using errcode = '22023';
  end if;
  if ends_at_value is not null and ends_at_value <= starts_at_value then
    raise exception 'Event ends_at must be after starts_at'
      using errcode = '22023';
  end if;
  if price_value < 0 or capacity_value < 0 then
    raise exception 'Event price and capacity cannot be negative'
      using errcode = '22023';
  end if;
  if p_payload ? 'images' and jsonb_typeof(p_payload -> 'images') <> 'array' then
    raise exception 'Event images must be an array'
      using errcode = '22023';
  end if;
  if p_payload ? 'vibes' and jsonb_typeof(p_payload -> 'vibes') <> 'array' then
    raise exception 'Event vibes must be an array'
      using errcode = '22023';
  end if;

  if location_kind = 'd8_venue' then
    if linked_venue_id is null or not exists (
      select 1 from public.venues venue where venue.id = linked_venue_id
    ) then
      raise exception 'A valid venue_id is required for a D8 venue event'
        using errcode = '22023';
    end if;
  elsif location_kind = 'external' then
    if linked_venue_id is not null
      or nullif(btrim(p_payload ->> 'external_location_name'), '') is null then
      raise exception 'External events require a location name and cannot use venue_id'
        using errcode = '22023';
    end if;
  elsif linked_venue_id is not null then
    raise exception 'Undisclosed events cannot use venue_id'
      using errcode = '22023';
  end if;

  insert into public.events (
    venue_id, partner_id, organizer_organization_id, created_by, source,
    title, description, category, vibes, cover_image, images,
    starts_at, ends_at, price_pp, currency, capacity, spots_left,
    is_free, is_featured, city, event_location_kind,
    external_location_name, external_location_address, venue_page_status,
    frequency, weekday, next_occurrence, spots_total, spots_filled, emoji,
    event_status, created_at, updated_at
  ) values (
    linked_venue_id,
    null,
    case when attribution = 'd8advisr' then platform_organization else null end,
    actor,
    'd8_admin',
    event_title,
    nullif(btrim(p_payload ->> 'description'), ''),
    nullif(btrim(p_payload ->> 'category'), ''),
    case when p_payload ? 'vibes'
      then array(select jsonb_array_elements_text(p_payload -> 'vibes'))
      else '{}'::text[] end,
    nullif(btrim(p_payload ->> 'cover_image'), ''),
    case when p_payload ? 'images'
      then array(select jsonb_array_elements_text(p_payload -> 'images'))
      else '{}'::text[] end,
    starts_at_value,
    ends_at_value,
    price_value,
    coalesce(nullif(btrim(p_payload ->> 'currency'), ''), 'K'),
    nullif(capacity_value, 0),
    nullif(capacity_value, 0),
    free_event,
    coalesce(nullif(p_payload ->> 'is_featured', '')::boolean, false),
    event_city,
    location_kind,
    case when location_kind = 'external'
      then nullif(btrim(p_payload ->> 'external_location_name'), '') else null end,
    case when location_kind = 'external'
      then nullif(btrim(p_payload ->> 'external_location_address'), '') else null end,
    case when location_kind = 'd8_venue' then 'approved' else 'hidden' end,
    coalesce(nullif(btrim(p_payload ->> 'frequency'), ''), 'one-off'),
    nullif(btrim(p_payload ->> 'weekday'), ''),
    nullif(btrim(p_payload ->> 'next_occurrence'), ''),
    capacity_value,
    0,
    coalesce(nullif(btrim(p_payload ->> 'emoji'), ''), '📅'),
    publication_status,
    now(),
    now()
  ) returning id into event_id;

  insert into public.listing_admin_audit_log (
    event_id, action, attribution, publication_status, actor_id, metadata
  ) values (
    event_id, 'created', attribution, publication_status, actor,
    jsonb_build_object('title', event_title, 'city', event_city, 'location_kind', location_kind)
  );

  return event_id;
end;
$$;

revoke all on function public.admin_create_venue(jsonb) from public;
revoke all on function public.admin_create_event(jsonb) from public;
grant execute on function public.admin_create_venue(jsonb) to authenticated;
grant execute on function public.admin_create_event(jsonb) to authenticated;
