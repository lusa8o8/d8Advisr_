-- Phase 4 closure: audited correction of D8-admin-created venue drafts.

create or replace function public.admin_update_draft_venue(
  p_venue_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz
)
returns public.venues
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  platform_organization constant uuid := '00000000-0000-4000-8000-00000000d800'::uuid;
  old_venue public.venues;
  updated_venue public.venues;
  next_name text;
  next_city text;
  next_category text;
  next_area text;
  next_address text;
  next_description text;
  next_price_tier text;
  next_average_cost integer;
  next_cover_image text;
  next_vibes text[];
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can edit D8 venue drafts'
      using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Venue edit payload must be a JSON object'
      using errcode = '22023';
  end if;

  if p_expected_updated_at is null then
    raise exception 'Venue expected_updated_at is required'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_payload) as payload_key(key)
    where payload_key.key not in (
      'name', 'city', 'category', 'area', 'address', 'description',
      'price_tier', 'avg_cost_pp', 'cover_image', 'vibes'
    )
  ) then
    raise exception 'Venue edit payload contains unsupported fields'
      using errcode = '22023';
  end if;

  select *
  into old_venue
  from public.venues
  where id = p_venue_id
  for update;

  if old_venue.id is null then
    raise exception 'Venue not found'
      using errcode = 'P0002';
  end if;

  if old_venue.source is distinct from 'd8_admin'
    or old_venue.partner_id is not null
    or (
      old_venue.operator_organization_id is not null
      and old_venue.operator_organization_id <> platform_organization
    )
    or old_venue.listing_status not in ('draft', 'submitted', 'under_review', 'needs_update')
    or old_venue.is_active
  then
    raise exception 'Only non-live D8-admin-created venue drafts can use this editor'
      using errcode = '42501';
  end if;

  if old_venue.updated_at is distinct from p_expected_updated_at then
    raise exception 'Venue changed after it was loaded; refresh before saving'
      using errcode = '40001';
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

  next_name := case when p_payload ? 'name'
    then nullif(btrim(p_payload ->> 'name'), '') else old_venue.name end;
  next_city := case when p_payload ? 'city'
    then nullif(btrim(p_payload ->> 'city'), '') else old_venue.city end;
  next_category := case when p_payload ? 'category'
    then nullif(btrim(p_payload ->> 'category'), '') else old_venue.category end;
  next_area := case when p_payload ? 'area'
    then nullif(btrim(p_payload ->> 'area'), '') else old_venue.area end;
  next_address := case when p_payload ? 'address'
    then nullif(btrim(p_payload ->> 'address'), '') else old_venue.address end;
  next_description := case when p_payload ? 'description'
    then nullif(btrim(p_payload ->> 'description'), '') else old_venue.description end;
  next_price_tier := case when p_payload ? 'price_tier'
    then nullif(btrim(p_payload ->> 'price_tier'), '') else old_venue.price_tier end;
  next_average_cost := case when p_payload ? 'avg_cost_pp'
    then nullif(p_payload ->> 'avg_cost_pp', '')::integer else old_venue.avg_cost_pp end;
  next_cover_image := case when p_payload ? 'cover_image'
    then nullif(btrim(p_payload ->> 'cover_image'), '') else old_venue.cover_image end;
  next_vibes := case when p_payload ? 'vibes'
    then array(select btrim(value) from jsonb_array_elements_text(p_payload -> 'vibes') value where btrim(value) <> '')
    else old_venue.vibes end;

  if next_name is null or next_city is null or next_category is null then
    raise exception 'Venue name, city, and category are required'
      using errcode = '22023';
  end if;

  if length(next_name) > 160 or length(next_city) > 120 or length(next_category) > 120
    or length(coalesce(next_area, '')) > 160 or length(coalesce(next_address, '')) > 500
    or length(coalesce(next_description, '')) > 5000
    or length(coalesce(next_price_tier, '')) > 40
    or length(coalesce(next_cover_image, '')) > 2000
  then
    raise exception 'Venue edit contains a value that is too long'
      using errcode = '22023';
  end if;

  if next_average_cost is not null and next_average_cost < 0 then
    raise exception 'Venue average cost cannot be negative'
      using errcode = '22023';
  end if;

  if cardinality(next_vibes) > 20
    or exists (select 1 from unnest(next_vibes) vibe where length(vibe) > 80) then
    raise exception 'Venue vibes contain too many or overly long values'
      using errcode = '22023';
  end if;

  update public.venues
  set
    name = next_name,
    city = next_city,
    category = next_category,
    area = next_area,
    address = next_address,
    description = next_description,
    price_tier = next_price_tier,
    avg_cost_pp = next_average_cost,
    cover_image = next_cover_image,
    vibes = next_vibes,
    updated_at = now()
  where id = p_venue_id
  returning * into updated_venue;

  insert into public.venue_change_log (
    venue_id, changed_by, field_name, old_value, new_value, risk_level,
    applied_immediately, created_reverification, reverification_reason
  )
  select
    p_venue_id,
    actor,
    change.field_name,
    change.old_value,
    change.new_value,
    change.risk_level,
    true,
    false,
    'admin_draft_correction'
  from (values
    ('name', old_venue.name, updated_venue.name, 'high'),
    ('city', old_venue.city, updated_venue.city, 'high'),
    ('category', old_venue.category, updated_venue.category, 'high'),
    ('area', old_venue.area, updated_venue.area, 'high'),
    ('address', old_venue.address, updated_venue.address, 'high'),
    ('description', old_venue.description, updated_venue.description, 'low'),
    ('price_tier', old_venue.price_tier, updated_venue.price_tier, 'high'),
    ('avg_cost_pp', old_venue.avg_cost_pp::text, updated_venue.avg_cost_pp::text, 'high'),
    ('cover_image', old_venue.cover_image, updated_venue.cover_image, 'high'),
    ('vibes', array_to_json(old_venue.vibes)::text, array_to_json(updated_venue.vibes)::text, 'high')
  ) as change(field_name, old_value, new_value, risk_level)
  where change.old_value is distinct from change.new_value;

  return updated_venue;
end;
$$;

revoke all on function public.admin_update_draft_venue(uuid, jsonb, timestamptz)
  from public, anon;
grant execute on function public.admin_update_draft_venue(uuid, jsonb, timestamptz)
  to authenticated;
