create or replace function public.admin_submit_live_venue_revision(
  p_venue_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  platform_organization constant uuid := '00000000-0000-4000-8000-00000000d800'::uuid;
  old_venue public.venues;
  updated_venue public.venues;
  revision_id_value uuid;
  next_name text;
  next_city text;
  next_category text;
  next_area text;
  next_address text;
  next_description text;
  next_price_tier text;
  next_average_cost integer;
  next_cover_image text;
  next_images text[];
  next_vibes text[];
  previous_values_value jsonb := '{}'::jsonb;
  proposed_values_value jsonb := '{}'::jsonb;
  description_changed boolean;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can edit live D8 venues'
      using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Live venue edit payload must be a JSON object'
      using errcode = '22023';
  end if;

  if p_expected_updated_at is null then
    raise exception 'Venue expected_updated_at is required'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_object_keys(p_payload) payload_key(key)
    where payload_key.key not in (
      'name', 'city', 'category', 'area', 'address', 'description',
      'price_tier', 'avg_cost_pp', 'cover_image', 'images', 'vibes'
    )
  ) then
    raise exception 'Live venue edit payload contains unsupported fields'
      using errcode = '22023';
  end if;

  select * into old_venue
  from public.venues
  where id = p_venue_id
  for update;

  if old_venue.id is null then
    raise exception 'Venue not found' using errcode = 'P0002';
  end if;

  if old_venue.source is distinct from 'd8_admin'
    or old_venue.partner_id is not null
    or (
      old_venue.operator_organization_id is not null
      and old_venue.operator_organization_id <> platform_organization
    )
    or old_venue.listing_status <> 'live'
    or not old_venue.is_active
  then
    raise exception 'Only live D8-admin-created venues can use this editor'
      using errcode = '42501';
  end if;

  if old_venue.updated_at is distinct from p_expected_updated_at then
    raise exception 'Venue changed after it was loaded; refresh before saving'
      using errcode = 'P0001';
  end if;

  if p_payload ? 'avg_cost_pp'
    and jsonb_typeof(p_payload -> 'avg_cost_pp') not in ('number', 'null') then
    raise exception 'Venue average cost must be a number or null'
      using errcode = '22023';
  end if;
  if p_payload ? 'vibes' and jsonb_typeof(p_payload -> 'vibes') <> 'array' then
    raise exception 'Venue vibes must be an array'
      using errcode = '22023';
  end if;
  if p_payload ? 'images' and jsonb_typeof(p_payload -> 'images') <> 'array' then
    raise exception 'Venue images must be an array' using errcode = '22023';
  end if;

  next_name := case when p_payload ? 'name' then nullif(btrim(p_payload ->> 'name'), '') else old_venue.name end;
  next_city := case when p_payload ? 'city' then nullif(btrim(p_payload ->> 'city'), '') else old_venue.city end;
  next_category := case when p_payload ? 'category' then nullif(btrim(p_payload ->> 'category'), '') else old_venue.category end;
  next_area := case when p_payload ? 'area' then nullif(btrim(p_payload ->> 'area'), '') else old_venue.area end;
  next_address := case when p_payload ? 'address' then nullif(btrim(p_payload ->> 'address'), '') else old_venue.address end;
  next_description := case when p_payload ? 'description' then nullif(btrim(p_payload ->> 'description'), '') else old_venue.description end;
  next_price_tier := case when p_payload ? 'price_tier' then nullif(btrim(p_payload ->> 'price_tier'), '') else old_venue.price_tier end;
  next_average_cost := case when p_payload ? 'avg_cost_pp' then nullif(p_payload ->> 'avg_cost_pp', '')::integer else old_venue.avg_cost_pp end;
  next_cover_image := case when p_payload ? 'cover_image' then nullif(btrim(p_payload ->> 'cover_image'), '') else old_venue.cover_image end;
  next_images := case when p_payload ? 'images'
    then array(select btrim(value) from jsonb_array_elements_text(p_payload -> 'images') value where btrim(value) <> '')
    else old_venue.images end;
  next_vibes := case when p_payload ? 'vibes'
    then array(select btrim(value) from jsonb_array_elements_text(p_payload -> 'vibes') value where btrim(value) <> '')
    else old_venue.vibes end;

  if next_name is null or next_city is null or next_category is null then
    raise exception 'Venue name, city, and category are required' using errcode = '22023';
  end if;
  if length(next_name) > 160 or length(next_city) > 120 or length(next_category) > 120
    or length(coalesce(next_area, '')) > 160 or length(coalesce(next_address, '')) > 500
    or length(coalesce(next_description, '')) > 5000 or length(coalesce(next_price_tier, '')) > 40
    or length(coalesce(next_cover_image, '')) > 2000 then
    raise exception 'Live venue edit contains a value that is too long' using errcode = '22023';
  end if;
  if next_average_cost is not null and next_average_cost < 0 then
    raise exception 'Venue average cost cannot be negative' using errcode = '22023';
  end if;
  if cardinality(next_vibes) > 20
    or exists (select 1 from unnest(next_vibes) vibe where length(vibe) > 80) then
    raise exception 'Venue vibes contain too many or overly long values' using errcode = '22023';
  end if;
  if cardinality(next_images) > 6
    or exists (select 1 from unnest(next_images) image where length(image) > 2000) then
    raise exception 'Venue images contain too many or overly long values' using errcode = '22023';
  end if;
  if cardinality(next_images) > 0 then next_cover_image := next_images[1]; else next_cover_image := null; end if;

  if old_venue.name is distinct from next_name then
    previous_values_value := previous_values_value || jsonb_build_object('name', old_venue.name);
    proposed_values_value := proposed_values_value || jsonb_build_object('name', next_name);
  end if;
  if old_venue.city is distinct from next_city then
    previous_values_value := previous_values_value || jsonb_build_object('city', old_venue.city);
    proposed_values_value := proposed_values_value || jsonb_build_object('city', next_city);
  end if;
  if old_venue.category is distinct from next_category then
    previous_values_value := previous_values_value || jsonb_build_object('category', old_venue.category);
    proposed_values_value := proposed_values_value || jsonb_build_object('category', next_category);
  end if;
  if old_venue.area is distinct from next_area then
    previous_values_value := previous_values_value || jsonb_build_object('area', old_venue.area);
    proposed_values_value := proposed_values_value || jsonb_build_object('area', next_area);
  end if;
  if old_venue.address is distinct from next_address then
    previous_values_value := previous_values_value || jsonb_build_object('address', old_venue.address);
    proposed_values_value := proposed_values_value || jsonb_build_object('address', next_address);
  end if;
  if old_venue.price_tier is distinct from next_price_tier then
    previous_values_value := previous_values_value || jsonb_build_object('price_tier', old_venue.price_tier);
    proposed_values_value := proposed_values_value || jsonb_build_object('price_tier', next_price_tier);
  end if;
  if old_venue.avg_cost_pp is distinct from next_average_cost then
    previous_values_value := previous_values_value || jsonb_build_object('avg_cost_pp', old_venue.avg_cost_pp);
    proposed_values_value := proposed_values_value || jsonb_build_object('avg_cost_pp', next_average_cost);
  end if;
  if old_venue.cover_image is distinct from next_cover_image then
    previous_values_value := previous_values_value || jsonb_build_object('cover_image', old_venue.cover_image);
    proposed_values_value := proposed_values_value || jsonb_build_object('cover_image', next_cover_image);
  end if;
  if old_venue.images is distinct from next_images then
    previous_values_value := previous_values_value || jsonb_build_object('images', to_jsonb(old_venue.images));
    proposed_values_value := proposed_values_value || jsonb_build_object('images', to_jsonb(next_images));
  end if;
  if old_venue.vibes is distinct from next_vibes then
    previous_values_value := previous_values_value || jsonb_build_object('vibes', to_jsonb(old_venue.vibes));
    proposed_values_value := proposed_values_value || jsonb_build_object('vibes', to_jsonb(next_vibes));
  end if;

  description_changed := old_venue.description is distinct from next_description;

  if proposed_values_value <> '{}'::jsonb and exists (
    select 1 from public.venue_live_revisions revision
    where revision.venue_id = p_venue_id and revision.status = 'pending'
  ) then
    raise exception 'Venue already has a pending live revision' using errcode = '23505';
  end if;

  if not description_changed and proposed_values_value = '{}'::jsonb then
    raise exception 'Live venue edit does not change any fields' using errcode = '22023';
  end if;

  if description_changed then
    update public.venues
    set description = next_description, updated_at = now()
    where id = p_venue_id
    returning * into updated_venue;

    insert into public.venue_change_log (
      venue_id, changed_by, field_name, old_value, new_value, risk_level,
      applied_immediately, created_reverification, reverification_reason
    ) values (
      p_venue_id, actor, 'description', old_venue.description, next_description,
      'low', true, false, 'admin_live_edit'
    );
  else
    updated_venue := old_venue;
  end if;

  if proposed_values_value <> '{}'::jsonb then
    insert into public.venue_live_revisions (
      venue_id, previous_values, proposed_values, submitted_by
    ) values (
      p_venue_id, previous_values_value, proposed_values_value, actor
    ) returning id into revision_id_value;

    insert into public.venue_reverification_tasks (
      venue_id, reason, status, triggered_by, notes, live_revision_id
    ) values (
      p_venue_id, 'admin_live_revision', 'open', actor,
      'High-risk live venue changes awaiting explicit review', revision_id_value
    );
  end if;

  return jsonb_build_object(
    'venue_id', p_venue_id,
    'revision_id', revision_id_value,
    'immediate_fields', case when description_changed then jsonb_build_array('description') else '[]'::jsonb end,
    'pending_fields', coalesce((select jsonb_agg(key order by key) from jsonb_object_keys(proposed_values_value) key), '[]'::jsonb),
    'updated_at', updated_venue.updated_at
  );
end;
$$;

revoke all on function public.admin_submit_live_venue_revision(uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.admin_submit_live_venue_revision(uuid, jsonb, timestamptz) to authenticated;
