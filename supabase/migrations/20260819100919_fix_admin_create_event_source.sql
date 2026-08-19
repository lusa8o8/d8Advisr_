-- Fix: ensure admin_create_event inserts a valid 'd8_admin' source when attribution is unclaimed.

create or replace function public.admin_create_event_phase4_legacy(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  attribution text;
  publication_status text;
  event_title text;
  event_city text;
  event_id uuid;
  starts_at_value timestamptz;
  ends_at_value timestamptz;
  location_kind text;
  linked_venue_id uuid;
  price_value numeric(12,2);
  capacity_value integer;
  free_event boolean;
  source_value text;
  organizer_organization uuid;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can create listings' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Event payload must be a JSON object' using errcode = '22023';
  end if;

  event_title := nullif(btrim(p_payload ->> 'title'), '');
  event_city := nullif(btrim(p_payload ->> 'city'), '');
  starts_at_value := nullif(p_payload ->> 'starts_at', '')::timestamptz;
  ends_at_value := nullif(p_payload ->> 'ends_at', '')::timestamptz;
  attribution := lower(coalesce(nullif(btrim(p_payload ->> 'attribution'), ''), 'unclaimed'));
  publication_status := lower(coalesce(nullif(btrim(p_payload ->> 'publication_status'), ''), 'draft'));
  location_kind := lower(coalesce(nullif(btrim(p_payload ->> 'event_location_kind'), ''), 'undisclosed'));
  linked_venue_id := nullif(p_payload ->> 'venue_id', '')::uuid;
  free_event := coalesce(nullif(p_payload ->> 'is_free', '')::boolean, false);
  price_value := case when free_event then 0 else coalesce(nullif(p_payload ->> 'price_pp', '')::numeric(12,2), 0) end;
  capacity_value := coalesce(nullif(p_payload ->> 'capacity', '')::integer, 0);

  if event_title is null or event_city is null or starts_at_value is null then
    raise exception 'Event title, city, and starts_at are required' using errcode = '22023';
  end if;
  if attribution not in ('unclaimed', 'd8advisr') then
    raise exception 'Event attribution must be unclaimed or d8advisr' using errcode = '22023';
  end if;
  if publication_status not in ('draft', 'live') then
    raise exception 'Event publication_status must be draft or live' using errcode = '22023';
  end if;
  if location_kind not in ('d8_venue', 'external', 'undisclosed') then
    raise exception 'Invalid event location kind' using errcode = '22023';
  end if;
  if ends_at_value is not null and ends_at_value <= starts_at_value then
    raise exception 'Event ends_at must be after starts_at' using errcode = '22023';
  end if;
  if price_value < 0 or capacity_value < 0 then
    raise exception 'Event price and capacity cannot be negative' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_payload -> 'images', '[]'::jsonb)) <> 'array' then
    raise exception 'Event images must be an array' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_payload -> 'vibes', '[]'::jsonb)) <> 'array' then
    raise exception 'Event vibes must be an array' using errcode = '22023';
  end if;

  if location_kind = 'd8_venue' then
    if linked_venue_id is null or not exists (select 1 from public.venues where id = linked_venue_id) then
      raise exception 'A valid venue_id is required for a D8 venue event' using errcode = '22023';
    end if;
  elsif location_kind = 'external' then
    if nullif(btrim(p_payload ->> 'external_location_name'), '') is null or linked_venue_id is not null then
      raise exception 'External events require a location name and cannot use venue_id' using errcode = '22023';
    end if;
  elsif linked_venue_id is not null then
    raise exception 'Undisclosed events cannot use venue_id' using errcode = '22023';
  end if;

  -- FIX: The database table check constraint only allows ('d8_admin', 'partner', 'import', 'community').
  -- 'admin_unclaimed' is not a valid row source. The attribution itself is already mapped properly
  -- via the organizer_organization being set to null below.
  source_value := 'd8_admin';
  
  if attribution = 'd8advisr' then
    select id into organizer_organization from public.partner_organizations
    where organization_type = 'platform' and status = 'active' order by created_at limit 1;
  end if;

  insert into public.events (
    venue_id, title, description, category, vibes, cover_image, images,
    starts_at, ends_at, price_pp, currency, capacity, spots_left,
    is_free, is_featured, city, event_location_kind,
    external_location_name, external_location_address, venue_page_status,
    partner_id, organizer_organization_id, source, frequency, weekday,
    next_occurrence, spots_total, spots_filled, emoji, event_status,
    created_at, updated_at
  ) values (
    linked_venue_id, event_title, nullif(btrim(p_payload ->> 'description'), ''),
    nullif(btrim(p_payload ->> 'category'), ''),
    array(select jsonb_array_elements_text(coalesce(p_payload -> 'vibes', '[]'::jsonb))),
    nullif(btrim(p_payload ->> 'cover_image'), ''),
    array(select jsonb_array_elements_text(coalesce(p_payload -> 'images', '[]'::jsonb))),
    starts_at_value, ends_at_value, price_value,
    coalesce(nullif(btrim(p_payload ->> 'currency'), ''), 'ZMW'),
    nullif(capacity_value, 0), null, free_event,
    coalesce(nullif(p_payload ->> 'is_featured', '')::boolean, false),
    event_city, location_kind,
    nullif(btrim(p_payload ->> 'external_location_name'), ''),
    nullif(btrim(p_payload ->> 'external_location_address'), ''),
    case when location_kind = 'd8_venue' then 'approved' else 'hidden' end,
    null, organizer_organization, source_value,
    coalesce(nullif(btrim(p_payload ->> 'frequency'), ''), 'one-off'),
    nullif(btrim(p_payload ->> 'weekday'), ''),
    nullif(btrim(p_payload ->> 'next_occurrence'), ''),
    capacity_value, 0, coalesce(nullif(btrim(p_payload ->> 'emoji'), ''), '??'),
    publication_status, now(), now()
  ) returning id into event_id;

  insert into public.listing_admin_audit_log (
    event_id, action, attribution, publication_status, actor_id, metadata
  ) values (
    event_id, 'created', attribution, publication_status, actor,
    jsonb_build_object('title', event_title, 'city', event_city, 'location_kind', location_kind)
  );
  return event_id;
end;
$function$;

revoke all on function public.admin_create_event_phase4_legacy(jsonb) from public, anon, authenticated;
