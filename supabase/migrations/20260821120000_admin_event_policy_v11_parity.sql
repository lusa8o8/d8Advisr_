-- Phase 4.6D3: make the v1.1 publication and revision contract apply to
-- administrator-managed events as well as partner-managed events.

create or replace function public.publish_event_with_policy(
  p_event_id uuid,
  p_policy_id text,
  p_policy_version text,
  p_acknowledged boolean,
  p_request_key uuid
)
returns public.events
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  event_row public.events;
  existing_ack public.event_publication_acknowledgements;
  source_value text;
  policy_hash constant text := 'e3933f5bc2fdb5679e56a72e1393b79c457d4fa007a354ba2f94545c6438c71a';
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_request_key is null then
    raise exception 'publication_request_key_required' using errcode = '22023';
  end if;

  select * into event_row from public.events where id = p_event_id for update;
  if not found then raise exception 'event_not_found' using errcode = 'P0002'; end if;

  if public.is_admin_user() then
    source_value := 'admin';
  elsif event_row.partner_id = actor and public.live_partner_can(actor, 'events') then
    source_value := 'partner';
  elsif public.can_manage_event(event_row.id, actor) then
    source_value := 'partner';
  else
    raise exception 'event_management_required' using errcode = '42501';
  end if;

  if p_policy_id is distinct from 'partner-event-publishing-v1.1'
    or p_policy_version is distinct from '1.1' then
    raise exception 'unsupported_event_policy_version' using errcode = '22023';
  end if;
  if not coalesce(p_acknowledged, false) then
    raise exception 'event_policy_acknowledgement_required' using errcode = '22023';
  end if;
  if event_row.event_status in ('past', 'cancelled') then
    raise exception 'event_status_cannot_be_published' using errcode = '22023';
  end if;
  if coalesce(event_row.is_free, false) and event_row.price_pp <> 0 then
    raise exception 'free_event_price_must_be_zero' using errcode = '22023';
  end if;
  if not coalesce(event_row.is_free, false) and event_row.price_pp <= 0 then
    raise exception 'paid_event_price_must_be_positive' using errcode = '22023';
  end if;
  if event_row.currency is null or btrim(event_row.currency) = '' then
    raise exception 'event_currency_required' using errcode = '22023';
  end if;

  select * into existing_ack
  from public.event_publication_acknowledgements acknowledgement
  where acknowledgement.actor_user_id = actor
    and acknowledgement.request_key = p_request_key;

  if found and (
    existing_ack.event_id <> event_row.id
    or existing_ack.policy_id <> p_policy_id
    or existing_ack.policy_version <> p_policy_version
  ) then
    raise exception 'publication_request_key_conflict' using errcode = '23505';
  end if;

  if not found then
    insert into public.event_publication_acknowledgements (
      event_id, organization_id, actor_user_id, policy_id, policy_version,
      policy_content_hash, request_key, acknowledged_snapshot, source
    ) values (
      event_row.id, event_row.organizer_organization_id, actor, p_policy_id,
      p_policy_version, policy_hash, p_request_key,
      jsonb_build_object(
        'title', event_row.title,
        'starts_at', event_row.starts_at,
        'ends_at', event_row.ends_at,
        'region_id', event_row.region_id,
        'city', event_row.city,
        'location_kind', event_row.event_location_kind,
        'venue_id', event_row.venue_id,
        'external_location_name', event_row.external_location_name,
        'external_location_address', event_row.external_location_address,
        'is_free', event_row.is_free,
        'price_pp', event_row.price_pp,
        'currency', event_row.currency,
        'spots_total', event_row.spots_total,
        'frequency', event_row.frequency
      ),
      source_value
    );
  end if;

  perform set_config('d8.event_publish_event_id', event_row.id::text, true);
  update public.events
  set
    first_published_at = coalesce(first_published_at, now()),
    initial_published_is_free = coalesce(initial_published_is_free, is_free),
    initial_published_price = coalesce(initial_published_price, price_pp),
    initial_published_currency = coalesce(initial_published_currency, currency),
    commercial_policy_id = coalesce(commercial_policy_id, p_policy_id),
    commercial_policy_version = coalesce(commercial_policy_version, p_policy_version),
    commercial_baseline_source = coalesce(commercial_baseline_source, 'first_publication'),
    event_status = 'live',
    updated_at = now()
  where id = event_row.id
  returning * into event_row;

  return event_row;
end;
$function$;

revoke all on function public.publish_event_with_policy(uuid, text, text, boolean, uuid) from public, anon;
grant execute on function public.publish_event_with_policy(uuid, text, text, boolean, uuid) to authenticated;

-- Administrators no longer bypass the revision boundary for protected fields.
create or replace function public.enforce_event_commercial_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  caller_id uuid := auth.uid();
  authorized_publish_id text := nullif(current_setting('d8.event_publish_event_id', true), '');
  authorized_revision_id text := nullif(current_setting('d8.event_revision_event_id', true), '');
begin
  if tg_op = 'INSERT' then
    if new.event_status = 'live' then
      raise exception 'event_publication_rpc_required' using errcode = '42501';
    end if;
    if new.first_published_at is not null
      or new.initial_published_is_free is not null
      or new.initial_published_price is not null
      or new.initial_published_currency is not null then
      raise exception 'event_publication_baseline_is_server_managed' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.first_published_at is not null then
    if new.first_published_at is distinct from old.first_published_at
      or new.initial_published_is_free is distinct from old.initial_published_is_free
      or new.initial_published_price is distinct from old.initial_published_price
      or new.initial_published_currency is distinct from old.initial_published_currency
      or new.commercial_policy_id is distinct from old.commercial_policy_id
      or new.commercial_policy_version is distinct from old.commercial_policy_version
      or new.commercial_baseline_source is distinct from old.commercial_baseline_source then
      raise exception 'event_publication_baseline_is_immutable' using errcode = '22023';
    end if;

    if caller_id is not null
      and authorized_revision_id is distinct from old.id::text
      and (
        new.title is distinct from old.title
        or new.city is distinct from old.city
        or new.description is distinct from old.description
        or new.category is distinct from old.category
        or new.starts_at is distinct from old.starts_at
        or new.ends_at is distinct from old.ends_at
        or new.frequency is distinct from old.frequency
        or new.weekday is distinct from old.weekday
        or new.event_location_kind is distinct from old.event_location_kind
        or new.venue_id is distinct from old.venue_id
        or new.external_location_name is distinct from old.external_location_name
        or new.external_location_address is distinct from old.external_location_address
        or new.is_free is distinct from old.is_free
        or new.price_pp is distinct from old.price_pp
        or new.currency is distinct from old.currency
        or new.capacity is distinct from old.capacity
        or new.spots_total is distinct from old.spots_total
        or new.emoji is distinct from old.emoji
        or new.cover_image is distinct from old.cover_image
        or new.images is distinct from old.images
        or new.vibes is distinct from old.vibes
        or new.venue_page_status is distinct from old.venue_page_status
        or (new.event_status is distinct from old.event_status and new.event_status = 'cancelled')
      ) then
      raise exception 'event_revision_rpc_required' using errcode = '42501';
    end if;
  elsif new.first_published_at is not null
    and authorized_publish_id is distinct from new.id::text then
    raise exception 'event_publication_baseline_is_server_managed' using errcode = '42501';
  end if;

  if new.event_status = 'live'
    and old.event_status <> 'live'
    and authorized_publish_id is distinct from new.id::text then
    raise exception 'event_publication_rpc_required' using errcode = '42501';
  end if;

  return new;
end;
$function$;

create or replace function public.admin_apply_event_revision_v11(
  p_event_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz,
  p_confirmed boolean default false,
  p_admin_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  target_event public.events;
  previous_snapshot jsonb;
  proposed_snapshot jsonb := '{}'::jsonb;
  changed_keys text[] := array[]::text[];
  material_keys text[] := array[]::text[];
  allowed_keys constant text[] := array[
    'title', 'city', 'description', 'category', 'starts_at', 'ends_at',
    'event_location_kind', 'venue_id', 'external_location_name',
    'external_location_address', 'is_free', 'price_pp', 'capacity',
    'is_featured', 'emoji', 'cover_image', 'images', 'vibes'
  ]::text[];
  material_fields constant text[] := array[
    'city', 'starts_at', 'ends_at', 'event_location_kind', 'venue_id',
    'external_location_name', 'external_location_address', 'is_free',
    'price_pp', 'capacity'
  ]::text[];
  key_name text;
  old_value jsonb;
  new_value jsonb;
  effective_is_free boolean;
  effective_price numeric;
  effective_capacity integer;
  effective_start timestamptz;
  effective_end timestamptz;
  effective_location_kind text;
  effective_venue_id uuid;
  effective_external_name text;
  revision_id uuid;
  recipient_count integer := 0;
  notification_count integer := 0;
begin
  if actor is null or not public.is_admin_user() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or p_expected_updated_at is null then
    raise exception 'Invalid event revision request' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_payload) supplied(key)
    where not supplied.key = any(allowed_keys)
  ) then
    raise exception 'The event revision contains unsupported fields' using errcode = '22023';
  end if;

  select * into target_event from public.events where id = p_event_id for update;
  if target_event.id is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if target_event.event_status <> 'live' or target_event.first_published_at is null then
    raise exception 'A published live event is required' using errcode = '22023';
  end if;
  if target_event.updated_at is distinct from p_expected_updated_at then
    raise exception 'Event changed after it was loaded; refresh before saving' using errcode = '40001';
  end if;

  previous_snapshot := jsonb_build_object(
    'title', target_event.title, 'city', target_event.city,
    'description', target_event.description, 'category', target_event.category,
    'starts_at', target_event.starts_at, 'ends_at', target_event.ends_at,
    'event_location_kind', target_event.event_location_kind,
    'venue_id', target_event.venue_id,
    'external_location_name', target_event.external_location_name,
    'external_location_address', target_event.external_location_address,
    'is_free', target_event.is_free, 'price_pp', target_event.price_pp,
    'capacity', target_event.capacity, 'is_featured', target_event.is_featured,
    'emoji', target_event.emoji, 'cover_image', target_event.cover_image,
    'images', to_jsonb(target_event.images), 'vibes', to_jsonb(target_event.vibes)
  );

  for key_name in select jsonb_object_keys(p_payload)
  loop
    old_value := previous_snapshot -> key_name;
    new_value := p_payload -> key_name;
    if old_value is distinct from new_value then
      changed_keys := array_append(changed_keys, key_name);
      proposed_snapshot := jsonb_set(proposed_snapshot, array[key_name], new_value, true);
      if key_name = any(material_fields) then
        material_keys := array_append(material_keys, key_name);
      end if;
    end if;
  end loop;

  if cardinality(changed_keys) = 0 then
    return jsonb_build_object('status', 'applied', 'changed_fields', changed_keys,
      'updated_at', target_event.updated_at, 'message', 'No changes detected');
  end if;

  begin
    effective_is_free := case when proposed_snapshot ? 'is_free'
      then (proposed_snapshot ->> 'is_free')::boolean else target_event.is_free end;
    effective_price := case when proposed_snapshot ? 'price_pp'
      then (proposed_snapshot ->> 'price_pp')::numeric else target_event.price_pp end;
    effective_capacity := case when proposed_snapshot ? 'capacity'
      then nullif(proposed_snapshot ->> 'capacity', '')::integer else target_event.capacity end;
    effective_start := case when proposed_snapshot ? 'starts_at'
      then (proposed_snapshot ->> 'starts_at')::timestamptz else target_event.starts_at end;
    effective_end := case when proposed_snapshot ? 'ends_at'
      then nullif(proposed_snapshot ->> 'ends_at', '')::timestamptz else target_event.ends_at end;
    effective_location_kind := case when proposed_snapshot ? 'event_location_kind'
      then proposed_snapshot ->> 'event_location_kind' else target_event.event_location_kind end;
    effective_venue_id := case when proposed_snapshot ? 'venue_id'
      then nullif(proposed_snapshot ->> 'venue_id', '')::uuid else target_event.venue_id end;
    effective_external_name := case when proposed_snapshot ? 'external_location_name'
      then nullif(btrim(proposed_snapshot ->> 'external_location_name'), '') else target_event.external_location_name end;
  exception when others then
    raise exception 'Invalid event value' using errcode = '22023';
  end;

  if nullif(btrim(coalesce(p_payload ->> 'title', target_event.title)), '') is null
    or nullif(btrim(coalesce(p_payload ->> 'city', target_event.city)), '') is null then
    raise exception 'Event title and region are required' using errcode = '22023';
  end if;
  if effective_price < 0 or effective_price <> round(effective_price, 2) then
    raise exception 'Enter a non-negative price with at most two decimal places' using errcode = '22023';
  end if;
  if effective_is_free and effective_price <> 0 then
    raise exception 'Free events must have a zero entry price' using errcode = '22023';
  end if;
  if not effective_is_free and effective_price <= 0 then
    raise exception 'Paid events require a positive entry price' using errcode = '22023';
  end if;
  if effective_capacity is not null and effective_capacity < 1 then
    raise exception 'Limited attendance must be a whole number greater than zero' using errcode = '22023';
  end if;
  if proposed_snapshot ? 'starts_at' and effective_start <= now() then
    raise exception 'An event cannot be moved into the past' using errcode = '22023';
  end if;
  if effective_end is not null and effective_end <= effective_start then
    raise exception 'Event end time must be after its start time' using errcode = '22023';
  end if;
  if effective_location_kind not in ('d8_venue', 'external', 'undisclosed') then
    raise exception 'Invalid event location kind' using errcode = '22023';
  end if;
  if effective_location_kind = 'd8_venue' and (
    effective_venue_id is null or not exists(select 1 from public.venues where id = effective_venue_id)
  ) then
    raise exception 'A valid D8 venue is required' using errcode = '22023';
  end if;
  if effective_location_kind = 'external' and effective_external_name is null then
    raise exception 'An external location requires a name' using errcode = '22023';
  end if;

  select count(distinct user_id)::integer into recipient_count
  from public.event_interests where event_id = p_event_id and active = true;

  if cardinality(material_keys) > 0 and not p_confirmed then
    return jsonb_build_object(
      'status', 'confirmation_required',
      'policy_id', 'partner-event-publishing-v1.1', 'policy_version', '1.1',
      'changed_fields', changed_keys, 'material_fields', material_keys,
      'previous_values', previous_snapshot, 'proposed_values', proposed_snapshot,
      'interested_count', recipient_count
    );
  end if;

  perform set_config('d8.event_revision_event_id', p_event_id::text, true);
  update public.events set
    title = case when proposed_snapshot ? 'title' then btrim(proposed_snapshot ->> 'title') else title end,
    city = case when proposed_snapshot ? 'city' then btrim(proposed_snapshot ->> 'city') else city end,
    description = case when proposed_snapshot ? 'description' then nullif(btrim(proposed_snapshot ->> 'description'), '') else description end,
    category = case when proposed_snapshot ? 'category' then nullif(btrim(proposed_snapshot ->> 'category'), '') else category end,
    starts_at = effective_start, ends_at = effective_end,
    event_location_kind = effective_location_kind,
    venue_id = case when effective_location_kind = 'd8_venue' then effective_venue_id else null end,
    external_location_name = case when effective_location_kind = 'external' then effective_external_name else null end,
    external_location_address = case when effective_location_kind = 'external' and proposed_snapshot ? 'external_location_address'
      then nullif(btrim(proposed_snapshot ->> 'external_location_address'), '')
      when effective_location_kind = 'external' then external_location_address else null end,
    is_free = effective_is_free, price_pp = effective_price,
    capacity = effective_capacity, spots_total = effective_capacity,
    is_featured = case when proposed_snapshot ? 'is_featured' then (proposed_snapshot ->> 'is_featured')::boolean else is_featured end,
    emoji = case when proposed_snapshot ? 'emoji' then proposed_snapshot ->> 'emoji' else emoji end,
    cover_image = case when proposed_snapshot ? 'cover_image' then nullif(btrim(proposed_snapshot ->> 'cover_image'), '') else cover_image end,
    images = case when proposed_snapshot ? 'images' then array(select jsonb_array_elements_text(proposed_snapshot -> 'images')) else images end,
    vibes = case when proposed_snapshot ? 'vibes' then array(select jsonb_array_elements_text(proposed_snapshot -> 'vibes')) else vibes end,
    updated_at = now()
  where id = p_event_id;

  insert into public.event_revisions (
    event_id, status, risk_level, enforcement_code, rule_code,
    previous_values, proposed_values, changed_fields, submitted_by,
    organizer_reason, policy_id, policy_version, reviewed_by, reviewed_at
  ) values (
    p_event_id, 'applied',
    case when cardinality(material_keys) > 0 then 'high' else 'low' end,
    case when cardinality(material_keys) > 0 then 'C' else 'A' end,
    case when cardinality(material_keys) > 0 then 'MATERIAL_CONFIRMED' else 'NON_MATERIAL_AUTOMATIC' end,
    previous_snapshot, proposed_snapshot, changed_keys, actor,
    nullif(btrim(p_admin_reason), ''), 'partner-event-publishing-v1.1', '1.1', actor, now()
  ) returning id into revision_id;

  if cardinality(material_keys) > 0 then
    notification_count := public.dispatch_event_change_notifications(
      p_event_id, revision_id, changed_keys, previous_snapshot, proposed_snapshot
    );
  end if;

  return jsonb_build_object(
    'status', 'applied', 'revision_id', revision_id,
    'changed_fields', changed_keys, 'material_fields', material_keys,
    'interested_count', recipient_count, 'notification_count', notification_count,
    'message', case when cardinality(material_keys) > 0
      then 'Confirmed changes are live' else 'Changes are live' end
  );
end;
$function$;

revoke all on function public.admin_apply_event_revision_v11(uuid, jsonb, timestamptz, boolean, text) from public, anon;
grant execute on function public.admin_apply_event_revision_v11(uuid, jsonb, timestamptz, boolean, text) to authenticated;

create or replace function public.admin_cancel_event_v11(
  p_event_id uuid,
  p_expected_updated_at timestamptz,
  p_confirmed boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  target_event public.events;
  revision_id uuid;
  recipient_count integer := 0;
begin
  select * into target_event from public.events where id = p_event_id for update;
  if actor is null or not public.is_admin_user() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if target_event.id is null or target_event.event_status <> 'live' then
    raise exception 'A live event is required' using errcode = '22023';
  end if;
  if target_event.updated_at is distinct from p_expected_updated_at then
    raise exception 'Event changed after it was loaded; refresh before cancelling' using errcode = '40001';
  end if;

  select count(distinct user_id)::integer into recipient_count
  from public.event_interests where event_id = p_event_id and active = true;
  if not p_confirmed then
    return jsonb_build_object(
      'status', 'confirmation_required', 'changed_fields', array['event_status'],
      'previous_values', jsonb_build_object('event_status', target_event.event_status),
      'proposed_values', jsonb_build_object('event_status', 'cancelled'),
      'interested_count', recipient_count
    );
  end if;

  perform set_config('d8.event_revision_event_id', p_event_id::text, true);
  update public.events set event_status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = p_event_id;

  insert into public.event_revisions (
    event_id, status, risk_level, enforcement_code, rule_code,
    previous_values, proposed_values, changed_fields, submitted_by,
    organizer_reason, policy_id, policy_version, reviewed_by, reviewed_at
  ) values (
    p_event_id, 'applied', 'high', 'C', 'EVENT_CANCELLED',
    jsonb_build_object('event_status', target_event.event_status),
    jsonb_build_object('event_status', 'cancelled', 'cancelled_at', now()),
    array['event_status'], actor, nullif(btrim(p_reason), ''),
    'partner-event-publishing-v1.1', '1.1', actor, now()
  ) returning id into revision_id;

  insert into public.consumer_notifications (user_id, event_id, type, title, body, metadata)
  select distinct interest.user_id, p_event_id, 'event_cancelled',
    'Cancelled: ' || target_event.title,
    target_event.title || ' has been cancelled by the organizer.',
    jsonb_build_object('revision_id', revision_id, 'reason', nullif(btrim(p_reason), ''))
  from public.event_interests interest
  where interest.event_id = p_event_id and interest.active = true;

  return jsonb_build_object(
    'status', 'applied', 'revision_id', revision_id,
    'interested_count', recipient_count, 'message', 'Event cancelled'
  );
end;
$function$;

revoke all on function public.admin_cancel_event_v11(uuid, timestamptz, boolean, text) from public, anon;
grant execute on function public.admin_cancel_event_v11(uuid, timestamptz, boolean, text) to authenticated;

-- Retire the superseded direct admin live-edit RPC from browser roles.
revoke execute on function public.admin_update_live_event(uuid, jsonb, timestamptz) from authenticated;
