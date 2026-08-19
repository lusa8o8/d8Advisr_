-- Add 'updated_draft' to listing_admin_audit_log actions
alter table public.listing_admin_audit_log
  drop constraint if exists listing_admin_audit_log_action_check;

alter table public.listing_admin_audit_log
  add constraint listing_admin_audit_log_action_check
  check (action in ('created', 'updated_draft'));

create or replace function public.admin_update_draft_event(
  p_event_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz
)
returns public.events
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  platform_organization constant uuid := '00000000-0000-4000-8000-00000000d800'::uuid;
  old_event public.events;
  updated_event public.events;
  next_title text;
  next_description text;
  next_category text;
  next_vibes text[];
  next_cover_image text;
  next_images text[];
  next_starts_at timestamptz;
  next_ends_at timestamptz;
  next_price_pp numeric(12,2);
  next_currency text;
  next_capacity integer;
  next_is_free boolean;
  next_is_featured boolean;
  next_city text;
  next_event_location_kind text;
  next_external_location_name text;
  next_external_location_address text;
  next_venue_id uuid;
  next_emoji text;
  next_frequency text;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can edit D8 event drafts' using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Event edit payload must be a JSON object' using errcode = '22023';
  end if;

  if p_expected_updated_at is null then
    raise exception 'Event expected_updated_at is required' using errcode = '22023';
  end if;

  select * into old_event from public.events where id = p_event_id for update;

  if old_event.id is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  if old_event.source is distinct from 'd8_admin'
    or old_event.partner_id is not null
    or (old_event.organizer_organization_id is not null and old_event.organizer_organization_id <> platform_organization)
    or old_event.event_status <> 'draft'
  then
    raise exception 'Only D8-admin-created event drafts can use this editor' using errcode = '42501';
  end if;

  if old_event.updated_at is distinct from p_expected_updated_at then
    raise exception 'Event changed after it was loaded; refresh before saving' using errcode = '40001';
  end if;

  next_title := case when p_payload ? 'title' then nullif(btrim(p_payload ->> 'title'), '') else old_event.title end;
  next_description := case when p_payload ? 'description' then nullif(btrim(p_payload ->> 'description'), '') else old_event.description end;
  next_category := case when p_payload ? 'category' then nullif(btrim(p_payload ->> 'category'), '') else old_event.category end;
  next_vibes := case when p_payload ? 'vibes' then array(select btrim(value) from jsonb_array_elements_text(p_payload -> 'vibes') value where btrim(value) <> '') else old_event.vibes end;
  next_images := case when p_payload ? 'images' then array(select btrim(value) from jsonb_array_elements_text(p_payload -> 'images') value where btrim(value) <> '') else old_event.images end;
  next_cover_image := case when p_payload ? 'cover_image' then nullif(btrim(p_payload ->> 'cover_image'), '') else old_event.cover_image end;
  if p_payload ? 'images' then
    if cardinality(next_images) > 0 then next_cover_image := next_images[1]; else next_cover_image := null; end if;
  end if;
  
  next_starts_at := case when p_payload ? 'starts_at' then nullif(p_payload ->> 'starts_at', '')::timestamptz else old_event.starts_at end;
  next_ends_at := case when p_payload ? 'ends_at' then nullif(p_payload ->> 'ends_at', '')::timestamptz else old_event.ends_at end;
  
  next_is_free := case when p_payload ? 'is_free' then (p_payload ->> 'is_free')::boolean else old_event.is_free end;
  next_price_pp := case when next_is_free then 0 when p_payload ? 'price_pp' then nullif(p_payload ->> 'price_pp', '')::numeric(12,2) else old_event.price_pp end;
  next_currency := case when p_payload ? 'currency' then coalesce(nullif(btrim(p_payload ->> 'currency'), ''), 'ZMW') else old_event.currency end;
  next_capacity := case when p_payload ? 'capacity' then nullif(p_payload ->> 'capacity', '')::integer else coalesce(old_event.capacity, old_event.spots_total) end;
  
  next_is_featured := case when p_payload ? 'is_featured' then (p_payload ->> 'is_featured')::boolean else coalesce(old_event.is_featured, false) end;
  next_city := case when p_payload ? 'city' then nullif(btrim(p_payload ->> 'city'), '') else old_event.city end;
  next_event_location_kind := case when p_payload ? 'event_location_kind' then nullif(btrim(p_payload ->> 'event_location_kind'), '') else old_event.event_location_kind end;
  
  next_external_location_name := case when p_payload ? 'external_location_name' then nullif(btrim(p_payload ->> 'external_location_name'), '') else old_event.external_location_name end;
  next_external_location_address := case when p_payload ? 'external_location_address' then nullif(btrim(p_payload ->> 'external_location_address'), '') else old_event.external_location_address end;
  next_venue_id := case when p_payload ? 'venue_id' then nullif(p_payload ->> 'venue_id', '')::uuid else old_event.venue_id end;
  next_emoji := case when p_payload ? 'emoji' then coalesce(nullif(btrim(p_payload ->> 'emoji'), ''), '??') else coalesce(old_event.emoji, '??') end;
  next_frequency := case when p_payload ? 'frequency' then coalesce(nullif(btrim(p_payload ->> 'frequency'), ''), 'one-off') else coalesce(old_event.frequency, 'one-off') end;

  if next_title is null or next_city is null or next_starts_at is null then
    raise exception 'Event title, city, and starts_at are required' using errcode = '22023';
  end if;
  if next_event_location_kind not in ('d8_venue', 'external', 'undisclosed') then
    raise exception 'Invalid event location kind' using errcode = '22023';
  end if;
  if next_ends_at is not null and next_ends_at <= next_starts_at then
    raise exception 'Event ends_at must be after starts_at' using errcode = '22023';
  end if;
  if next_price_pp < 0 or coalesce(next_capacity, 0) < 0 then
    raise exception 'Event price and capacity cannot be negative' using errcode = '22023';
  end if;
  if next_event_location_kind = 'd8_venue' then
    if next_venue_id is null or not exists (select 1 from public.venues where id = next_venue_id) then
      raise exception 'A valid venue_id is required for a D8 venue event' using errcode = '22023';
    end if;
  elsif next_event_location_kind = 'external' then
    if next_external_location_name is null or next_venue_id is not null then
      raise exception 'External events require a location name and cannot use venue_id' using errcode = '22023';
    end if;
  elsif next_venue_id is not null then
    raise exception 'Undisclosed events cannot use venue_id' using errcode = '22023';
  end if;

  update public.events
  set
    title = next_title,
    description = next_description,
    category = next_category,
    vibes = coalesce(next_vibes, '{}'::text[]),
    cover_image = next_cover_image,
    images = coalesce(next_images, '{}'::text[]),
    starts_at = next_starts_at,
    ends_at = next_ends_at,
    price_pp = next_price_pp,
    currency = next_currency,
    capacity = nullif(next_capacity, 0),
    spots_total = next_capacity,
    is_free = next_is_free,
    is_featured = next_is_featured,
    city = next_city,
    event_location_kind = next_event_location_kind,
    external_location_name = case when next_event_location_kind = 'external' then next_external_location_name else null end,
    external_location_address = case when next_event_location_kind = 'external' then next_external_location_address else null end,
    venue_id = case when next_event_location_kind = 'd8_venue' then next_venue_id else null end,
    venue_page_status = case when next_event_location_kind = 'd8_venue' then 'approved' else 'hidden' end,
    emoji = next_emoji,
    frequency = next_frequency,
    updated_at = now()
  where id = p_event_id
  returning * into updated_event;

  insert into public.listing_admin_audit_log (
    event_id, action, attribution, publication_status, actor_id, metadata
  ) values (
    p_event_id, 'updated_draft', 
    case when old_event.organizer_organization_id = platform_organization then 'd8advisr' else 'unclaimed' end,
    old_event.event_status, actor,
    p_payload
  );

  return updated_event;
end;
$function$;

revoke all on function public.admin_update_draft_event(uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.admin_update_draft_event(uuid, jsonb, timestamptz) to authenticated;
