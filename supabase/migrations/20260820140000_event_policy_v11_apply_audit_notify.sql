-- Phase 4.6D2: replace speculative event-review queues with the MVP v1.1
-- confirm/apply/audit/notify contract.

alter table public.events
  add column if not exists cancelled_at timestamptz;

alter table public.consumer_notifications
  drop constraint if exists consumer_notifications_type_check;

alter table public.consumer_notifications
  add constraint consumer_notifications_type_check
  check (type in (
    'event_rescheduled', 'event_relocated', 'event_price_reduced',
    'event_price_changed', 'event_cancelled', 'system', 'vibe_match'
  ));

create or replace function public.dispatch_event_change_notifications(
  p_event_id uuid,
  p_revision_id uuid,
  p_changed_fields text[],
  p_previous_values jsonb,
  p_proposed_values jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  target_event public.events;
  recipient record;
  dispatch_count integer := 0;
  notification_type text := 'system';
  notification_title text;
  notification_body text;
  old_free boolean;
  new_free boolean;
  old_price numeric;
  new_price numeric;
  old_start timestamptz;
  new_start timestamptz;
  location_label text;
begin
  select * into target_event from public.events where id = p_event_id;
  if target_event.id is null then return 0; end if;

  if 'price_pp' = any(p_changed_fields) or 'is_free' = any(p_changed_fields)
    or 'currency' = any(p_changed_fields) then
    notification_type := 'event_price_changed';
    notification_title := 'Entry update: ' || target_event.title;
    old_free := coalesce((p_previous_values ->> 'is_free')::boolean, false);
    new_free := coalesce((p_proposed_values ->> 'is_free')::boolean, target_event.is_free, false);
    old_price := coalesce((p_previous_values ->> 'price_pp')::numeric, 0);
    new_price := coalesce((p_proposed_values ->> 'price_pp')::numeric, target_event.price_pp, 0);
    if new_free then
      notification_body := target_event.title || ' is now free entry.';
    elsif old_free then
      notification_body := target_event.title || ' now has an entry price of ' || target_event.currency || new_price || '.';
    elsif new_price > old_price then
      notification_body := target_event.title || ' entry price increased from ' || target_event.currency || old_price || ' to ' || target_event.currency || new_price || '.';
    else
      notification_body := target_event.title || ' entry price changed from ' || target_event.currency || old_price || ' to ' || target_event.currency || new_price || '.';
    end if;
  elsif 'starts_at' = any(p_changed_fields) or 'ends_at' = any(p_changed_fields)
    or 'weekday' = any(p_changed_fields) or 'frequency' = any(p_changed_fields) then
    notification_type := 'event_rescheduled';
    notification_title := 'Schedule update: ' || target_event.title;
    old_start := nullif(p_previous_values ->> 'starts_at', '')::timestamptz;
    new_start := coalesce(nullif(p_proposed_values ->> 'starts_at', '')::timestamptz, target_event.starts_at);
    notification_body := target_event.title || ' moved from '
      || to_char(old_start, 'Dy Mon DD, HH12:MI AM') || ' to '
      || to_char(new_start, 'Dy Mon DD, HH12:MI AM') || '.';
  elsif 'venue_id' = any(p_changed_fields)
    or 'event_location_kind' = any(p_changed_fields)
    or 'external_location_name' = any(p_changed_fields)
    or 'external_location_address' = any(p_changed_fields) then
    notification_type := 'event_relocated';
    notification_title := 'Location update: ' || target_event.title;
    location_label := coalesce(
      nullif(p_proposed_values ->> 'external_location_name', ''),
      nullif(p_proposed_values ->> 'external_location_address', ''),
      'a different venue or location'
    );
    notification_body := target_event.title || ' has moved to ' || location_label || '.';
  else
    notification_title := 'Event update: ' || target_event.title;
    notification_body := target_event.title || ' has updated details that may affect your plans.';
  end if;

  for recipient in
    select distinct user_id from public.event_interests
    where event_id = p_event_id and active = true
  loop
    insert into public.consumer_notifications (
      user_id, event_id, type, title, body, metadata
    ) values (
      recipient.user_id,
      p_event_id,
      notification_type,
      notification_title,
      notification_body,
      jsonb_build_object(
        'revision_id', p_revision_id,
        'changed_fields', p_changed_fields,
        'previous_values', p_previous_values,
        'proposed_values', p_proposed_values
      )
    )
    on conflict do nothing;
    dispatch_count := dispatch_count + 1;
  end loop;

  return dispatch_count;
end;
$function$;

-- Existing pending proposals were created under the superseded v1.0 review
-- classifier. Do not silently apply them under a different policy.
update public.event_revisions
set
  status = 'cancelled',
  review_note = coalesce(review_note, 'Superseded by event policy v1.1; resubmit through the confirmation workflow.'),
  reviewed_at = coalesce(reviewed_at, now()),
  updated_at = now()
where status = 'pending';

drop index if exists public.event_revisions_one_pending_idx;

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
      and not public.is_admin_user()
      and authorized_revision_id is distinct from old.id::text
      and (
        new.title is distinct from old.title
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

drop function if exists public.partner_submit_event_revision(uuid, jsonb, timestamptz);

create or replace function public.partner_apply_event_revision_v11(
  p_event_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz,
  p_confirmed boolean default false,
  p_organizer_reason text default null
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
    'title', 'description', 'category', 'starts_at', 'ends_at',
    'frequency', 'weekday', 'event_location_kind', 'venue_id',
    'external_location_name', 'external_location_address', 'is_free',
    'price_pp', 'currency', 'capacity', 'emoji', 'cover_image', 'images',
    'vibes', 'venue_page_status', 'next_occurrence'
  ]::text[];
  material_fields constant text[] := array[
    'starts_at', 'ends_at', 'frequency', 'weekday', 'event_location_kind',
    'venue_id', 'external_location_name', 'external_location_address',
    'is_free', 'price_pp', 'currency', 'capacity', 'venue_page_status'
  ]::text[];
  key_name text;
  old_value jsonb;
  new_value jsonb;
  is_different boolean;
  effective_is_free boolean;
  effective_price numeric;
  effective_capacity integer;
  effective_start timestamptz;
  effective_end timestamptz;
  effective_location_kind text;
  effective_venue_id uuid;
  effective_external_name text;
  effective_currency text;
  revision_id uuid;
  recipient_count integer := 0;
  notification_count integer := 0;
begin
  if actor is null then
    raise exception 'Authentication is required' using errcode = '42501';
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

  select * into target_event
  from public.events
  where id = p_event_id
  for update;

  if target_event.id is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  if target_event.event_status <> 'live'
    or not public.live_partner_can(actor, 'events')
    or not (
      target_event.partner_id = actor
      or public.can_manage_event(target_event.id, actor)
    ) then
    raise exception 'Approved event-partner access is required' using errcode = '42501';
  end if;

  if target_event.updated_at is distinct from p_expected_updated_at then
    raise exception 'Event changed after it was loaded; refresh before saving'
      using errcode = '40001';
  end if;

  previous_snapshot := jsonb_build_object(
    'title', target_event.title,
    'description', target_event.description,
    'category', target_event.category,
    'starts_at', target_event.starts_at,
    'ends_at', target_event.ends_at,
    'frequency', target_event.frequency,
    'weekday', target_event.weekday,
    'event_location_kind', target_event.event_location_kind,
    'venue_id', target_event.venue_id,
    'external_location_name', target_event.external_location_name,
    'external_location_address', target_event.external_location_address,
    'is_free', target_event.is_free,
    'price_pp', target_event.price_pp,
    'currency', target_event.currency,
    'capacity', coalesce(target_event.capacity, 0),
    'emoji', target_event.emoji,
    'cover_image', target_event.cover_image,
    'images', to_jsonb(target_event.images),
    'vibes', to_jsonb(target_event.vibes),
    'venue_page_status', target_event.venue_page_status,
    'next_occurrence', target_event.next_occurrence
  );

  for key_name in select jsonb_object_keys(p_payload)
  loop
    old_value := previous_snapshot -> key_name;
    new_value := p_payload -> key_name;
    is_different := false;

    if key_name in ('starts_at', 'ends_at') then
      begin
        is_different := nullif(old_value #>> '{}', '')::timestamptz
          is distinct from nullif(new_value #>> '{}', '')::timestamptz;
      exception when others then
        raise exception 'Invalid event date or time' using errcode = '22023';
      end;
    elsif key_name in ('title', 'description', 'category', 'frequency', 'weekday',
      'event_location_kind', 'external_location_name', 'external_location_address',
      'currency', 'emoji', 'cover_image', 'venue_page_status', 'next_occurrence') then
      is_different := nullif(btrim(coalesce(old_value #>> '{}', '')), '')
        is distinct from nullif(btrim(coalesce(new_value #>> '{}', '')), '');
    else
      is_different := old_value is distinct from new_value;
    end if;

    if is_different then
      changed_keys := array_append(changed_keys, key_name);
      proposed_snapshot := jsonb_set(proposed_snapshot, array[key_name], new_value, true);
      if key_name = any(material_fields) then
        material_keys := array_append(material_keys, key_name);
      end if;
    end if;
  end loop;

  if cardinality(changed_keys) = 0 then
    return jsonb_build_object(
      'status', 'applied',
      'changed_fields', changed_keys,
      'updated_at', target_event.updated_at,
      'message', 'No changes detected'
    );
  end if;

  begin
    effective_is_free := case when proposed_snapshot ? 'is_free'
      then (proposed_snapshot ->> 'is_free')::boolean else target_event.is_free end;
    effective_price := case when proposed_snapshot ? 'price_pp'
      then (proposed_snapshot ->> 'price_pp')::numeric else target_event.price_pp end;
    effective_capacity := case when proposed_snapshot ? 'capacity'
      then (proposed_snapshot ->> 'capacity')::integer else coalesce(target_event.capacity, 0) end;
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
    effective_currency := case when proposed_snapshot ? 'currency'
      then nullif(btrim(proposed_snapshot ->> 'currency'), '') else target_event.currency end;
  exception when others then
    raise exception 'Invalid material event value' using errcode = '22023';
  end;

  if effective_price < 0 or effective_price <> round(effective_price, 2) then
    raise exception 'Enter a non-negative price with at most two decimal places' using errcode = '22023';
  end if;
  if not effective_is_free and effective_price <= 0 then
    raise exception 'Paid events require a positive entry price' using errcode = '22023';
  end if;
  if effective_capacity < 0 then
    raise exception 'Attendance cannot be negative' using errcode = '22023';
  end if;
  if proposed_snapshot ? 'starts_at' and effective_start <= now() then
    raise exception 'An event cannot be moved into the past' using errcode = '22023';
  end if;
  if effective_end is not null and effective_end <= effective_start then
    raise exception 'Event end time must be after its start time' using errcode = '22023';
  end if;
  if effective_currency is null then
    raise exception 'Event currency is required' using errcode = '22023';
  end if;
  if effective_location_kind = 'd8_venue' and effective_venue_id is null then
    raise exception 'A D8 venue location requires a venue' using errcode = '22023';
  end if;
  if effective_location_kind = 'external' and effective_external_name is null then
    raise exception 'An external location requires a name' using errcode = '22023';
  end if;

  select count(distinct user_id)::integer into recipient_count
  from public.event_interests
  where event_id = p_event_id and active = true;

  if cardinality(material_keys) > 0 and not p_confirmed then
    return jsonb_build_object(
      'status', 'confirmation_required',
      'policy_id', 'partner-event-publishing-v1.1',
      'policy_version', '1.1',
      'changed_fields', changed_keys,
      'material_fields', material_keys,
      'previous_values', previous_snapshot,
      'proposed_values', proposed_snapshot,
      'interested_count', recipient_count
    );
  end if;

  perform set_config('d8.event_revision_event_id', p_event_id::text, true);

  update public.events
  set
    title = case when proposed_snapshot ? 'title' then btrim(proposed_snapshot ->> 'title') else title end,
    description = case when proposed_snapshot ? 'description' then nullif(btrim(proposed_snapshot ->> 'description'), '') else description end,
    category = case when proposed_snapshot ? 'category' then btrim(proposed_snapshot ->> 'category') else category end,
    starts_at = case when proposed_snapshot ? 'starts_at' then (proposed_snapshot ->> 'starts_at')::timestamptz else starts_at end,
    ends_at = case when proposed_snapshot ? 'ends_at' then nullif(proposed_snapshot ->> 'ends_at', '')::timestamptz else ends_at end,
    frequency = case when proposed_snapshot ? 'frequency' then proposed_snapshot ->> 'frequency' else frequency end,
    weekday = case when proposed_snapshot ? 'weekday' then nullif(btrim(proposed_snapshot ->> 'weekday'), '') else weekday end,
    event_location_kind = case when proposed_snapshot ? 'event_location_kind' then proposed_snapshot ->> 'event_location_kind' else event_location_kind end,
    venue_id = case when proposed_snapshot ? 'venue_id' then nullif(proposed_snapshot ->> 'venue_id', '')::uuid else venue_id end,
    external_location_name = case when proposed_snapshot ? 'external_location_name' then nullif(btrim(proposed_snapshot ->> 'external_location_name'), '') else external_location_name end,
    external_location_address = case when proposed_snapshot ? 'external_location_address' then nullif(btrim(proposed_snapshot ->> 'external_location_address'), '') else external_location_address end,
    is_free = case when proposed_snapshot ? 'is_free' then (proposed_snapshot ->> 'is_free')::boolean else is_free end,
    price_pp = case when proposed_snapshot ? 'price_pp' then (proposed_snapshot ->> 'price_pp')::numeric(12,2) else price_pp end,
    currency = case when proposed_snapshot ? 'currency' then proposed_snapshot ->> 'currency' else currency end,
    spots_total = case when proposed_snapshot ? 'capacity' then (proposed_snapshot ->> 'capacity')::integer else spots_total end,
    emoji = case when proposed_snapshot ? 'emoji' then proposed_snapshot ->> 'emoji' else emoji end,
    cover_image = case when proposed_snapshot ? 'cover_image' then nullif(btrim(proposed_snapshot ->> 'cover_image'), '') else cover_image end,
    images = case when proposed_snapshot ? 'images' then array(select jsonb_array_elements_text(proposed_snapshot -> 'images')) else images end,
    vibes = case when proposed_snapshot ? 'vibes' then array(select jsonb_array_elements_text(proposed_snapshot -> 'vibes')) else vibes end,
    venue_page_status = case when proposed_snapshot ? 'venue_page_status' then proposed_snapshot ->> 'venue_page_status' else venue_page_status end,
    next_occurrence = case when proposed_snapshot ? 'next_occurrence' then proposed_snapshot ->> 'next_occurrence' else next_occurrence end,
    updated_at = now()
  where id = p_event_id;

  insert into public.event_revisions (
    event_id, status, risk_level, enforcement_code, rule_code,
    previous_values, proposed_values, changed_fields, submitted_by,
    organizer_reason, policy_id, policy_version, reviewed_by, reviewed_at
  ) values (
    p_event_id,
    'applied',
    case when cardinality(material_keys) > 0 then 'high' else 'low' end,
    case when cardinality(material_keys) > 0 then 'C' else 'A' end,
    case when cardinality(material_keys) > 0 then 'MATERIAL_CONFIRMED' else 'NON_MATERIAL_AUTOMATIC' end,
    previous_snapshot,
    proposed_snapshot,
    changed_keys,
    actor,
    nullif(btrim(p_organizer_reason), ''),
    'partner-event-publishing-v1.1',
    '1.1',
    actor,
    now()
  ) returning id into revision_id;

  if cardinality(material_keys) > 0 then
    notification_count := public.dispatch_event_change_notifications(
      p_event_id,
      revision_id,
      changed_keys,
      previous_snapshot,
      proposed_snapshot
    );
  end if;

  return jsonb_build_object(
    'status', 'applied',
    'revision_id', revision_id,
    'changed_fields', changed_keys,
    'material_fields', material_keys,
    'interested_count', recipient_count,
    'notification_count', notification_count,
    'message', case when cardinality(material_keys) > 0
      then 'Confirmed changes are live'
      else 'Changes are live' end
  );
end;
$function$;

revoke all on function public.partner_apply_event_revision_v11(uuid, jsonb, timestamptz, boolean, text) from public, anon;
grant execute on function public.partner_apply_event_revision_v11(uuid, jsonb, timestamptz, boolean, text) to authenticated;

revoke execute on function public.admin_review_event_revision(uuid, text, text) from authenticated;

create or replace function public.partner_cancel_event_v11(
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

  if actor is null or target_event.id is null
    or target_event.event_status <> 'live'
    or not public.live_partner_can(actor, 'events')
    or not (target_event.partner_id = actor or public.can_manage_event(target_event.id, actor)) then
    raise exception 'Approved event-partner access is required' using errcode = '42501';
  end if;

  if target_event.updated_at is distinct from p_expected_updated_at then
    raise exception 'Event changed after it was loaded; refresh before cancelling' using errcode = '40001';
  end if;

  select count(distinct user_id)::integer into recipient_count
  from public.event_interests where event_id = p_event_id and active = true;

  if not p_confirmed then
    return jsonb_build_object(
      'status', 'confirmation_required',
      'changed_fields', array['event_status'],
      'previous_values', jsonb_build_object('event_status', target_event.event_status),
      'proposed_values', jsonb_build_object('event_status', 'cancelled'),
      'interested_count', recipient_count
    );
  end if;

  perform set_config('d8.event_revision_event_id', p_event_id::text, true);
  update public.events
  set event_status = 'cancelled', cancelled_at = now(), updated_at = now()
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
  select distinct
    interest.user_id,
    p_event_id,
    'event_cancelled',
    'Cancelled: ' || target_event.title,
    target_event.title || ' has been cancelled by the organizer.',
    jsonb_build_object('revision_id', revision_id, 'reason', nullif(btrim(p_reason), ''))
  from public.event_interests interest
  where interest.event_id = p_event_id and interest.active = true;

  return jsonb_build_object(
    'status', 'applied',
    'revision_id', revision_id,
    'interested_count', recipient_count,
    'message', 'Event cancelled'
  );
end;
$function$;

revoke all on function public.partner_cancel_event_v11(uuid, timestamptz, boolean, text) from public, anon;
grant execute on function public.partner_cancel_event_v11(uuid, timestamptz, boolean, text) to authenticated;

drop policy if exists "Public can view live events" on public.events;
create policy "Public can view live and recent cancelled events"
  on public.events for select
  to anon, authenticated
  using (
    event_status = 'live'
    or (event_status = 'cancelled' and cancelled_at >= now() - interval '24 hours')
  );
