-- Migration: Fix text[] and jsonb array casting in event revision functions
-- Timestamp: 20260819174000

-- 1. Fix admin_review_event_revision
create or replace function public.admin_review_event_revision(
  p_revision_id uuid,
  p_decision text,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  target_revision public.event_revisions;
  target_event public.events;
  prop jsonb;
  notification_title text;
  notification_body text;
  display_name text;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can review event revisions' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be either approved or rejected' using errcode = '22023';
  end if;

  select * into target_revision from public.event_revisions where id = p_revision_id for update;

  if target_revision.id is null then
    raise exception 'Event revision not found' using errcode = 'P0002';
  end if;

  if target_revision.status <> 'pending' then
    raise exception 'Only pending event revisions can be reviewed' using errcode = '22023';
  end if;

  select * into target_event from public.events where id = target_revision.event_id for update;

  if target_event.id is null then
    raise exception 'Target event not found' using errcode = 'P0002';
  end if;

  display_name := coalesce(target_event.title, 'Your event');

  if p_decision = 'approved' then
    prop := target_revision.proposed_values;
    
    update public.events
    set
      title = case when prop ? 'title' then prop ->> 'title' else title end,
      description = case when prop ? 'description' then nullif(btrim(prop ->> 'description'), '') else description end,
      category = case when prop ? 'category' then nullif(btrim(prop ->> 'category'), '') else category end,
      starts_at = case when prop ? 'starts_at' then (prop ->> 'starts_at')::timestamptz else starts_at end,
      ends_at = case when prop ? 'ends_at' then nullif(prop ->> 'ends_at', '')::timestamptz else ends_at end,
      frequency = case when prop ? 'frequency' then prop ->> 'frequency' else frequency end,
      weekday = case when prop ? 'weekday' then nullif(btrim(prop ->> 'weekday'), '') else weekday end,
      event_location_kind = case when prop ? 'event_location_kind' then prop ->> 'event_location_kind' else event_location_kind end,
      venue_id = case when prop ? 'venue_id' then nullif(prop ->> 'venue_id', '')::uuid else venue_id end,
      external_location_name = case when prop ? 'external_location_name' then nullif(btrim(prop ->> 'external_location_name'), '') else external_location_name end,
      external_location_address = case when prop ? 'external_location_address' then nullif(btrim(prop ->> 'external_location_address'), '') else external_location_address end,
      capacity = case when prop ? 'capacity' then nullif(prop ->> 'capacity', '')::integer else capacity end,
      spots_total = case when prop ? 'capacity' then nullif(prop ->> 'capacity', '')::integer else spots_total end,
      emoji = case when prop ? 'emoji' then prop ->> 'emoji' else emoji end,
      cover_image = case when prop ? 'cover_image' then nullif(btrim(prop ->> 'cover_image'), '') else cover_image end,
      images = case when prop ? 'images' and jsonb_typeof(prop -> 'images') = 'array' then (select coalesce(array_agg(x), '{}'::text[]) from jsonb_array_elements_text(prop -> 'images') as t(x)) else images end,
      vibes = case when prop ? 'vibes' and jsonb_typeof(prop -> 'vibes') = 'array' then (select coalesce(array_agg(x), '{}'::text[]) from jsonb_array_elements_text(prop -> 'vibes') as t(x)) else vibes end,
      is_free = case when prop ? 'is_free' then (prop ->> 'is_free')::boolean else is_free end,
      price_pp = case when prop ? 'price_pp' then nullif(prop ->> 'price_pp', '')::numeric(12,2) else price_pp end,
      updated_at = now()
    where id = target_revision.event_id;

    update public.event_revisions
    set
      status = 'approved',
      reviewed_by = actor,
      reviewed_at = now(),
      review_note = p_review_note
    where id = p_revision_id;

    -- Dispatch notifications to interested consumers
    perform public.dispatch_event_change_notifications(
      target_revision.event_id,
      p_revision_id,
      target_revision.changed_fields,
      target_revision.previous_values,
      target_revision.proposed_values
    );

    -- Notify Partner of Approval
    notification_title := 'Event changes approved: ' || display_name;
    notification_body := case
      when p_review_note is not null and btrim(p_review_note) <> '' then
        'Your changes for "' || display_name || '" were approved and are now live. Admin note: ' || p_review_note
      else
        'Your changes for "' || display_name || '" were approved by D8 admin and are now live.'
    end;

    if target_revision.submitted_by is not null then
      insert into public.partner_notifications (
        user_id, event_id, type, title, body, metadata
      ) values (
        target_revision.submitted_by,
        target_revision.event_id,
        'revision_decision',
        notification_title,
        notification_body,
        jsonb_build_object(
          'revision_id', p_revision_id,
          'decision', 'approved',
          'review_note', p_review_note,
          'changed_fields', target_revision.changed_fields
        )
      );
    end if;

    return jsonb_build_object(
      'status', 'approved',
      'revision_id', p_revision_id,
      'event_id', target_revision.event_id
    );
  else
    update public.event_revisions
    set
      status = 'rejected',
      reviewed_by = actor,
      reviewed_at = now(),
      review_note = p_review_note
    where id = p_revision_id;

    -- Notify Partner of Rejection
    notification_title := 'Event changes not approved: ' || display_name;
    notification_body := case
      when p_review_note is not null and btrim(p_review_note) <> '' then
        'Your submitted changes for "' || display_name || '" were not approved. Admin note: ' || p_review_note
      else
        'Your submitted changes for "' || display_name || '" were not approved by D8 admin. The live listing remains unchanged.'
    end;

    if target_revision.submitted_by is not null then
      insert into public.partner_notifications (
        user_id, event_id, type, title, body, metadata
      ) values (
        target_revision.submitted_by,
        target_revision.event_id,
        'revision_decision',
        notification_title,
        notification_body,
        jsonb_build_object(
          'revision_id', p_revision_id,
          'decision', 'rejected',
          'review_note', p_review_note,
          'changed_fields', target_revision.changed_fields
        )
      );
    end if;

    return jsonb_build_object(
      'status', 'rejected',
      'revision_id', p_revision_id,
      'event_id', target_revision.event_id
    );
  end if;
end;
$function$;

-- 2. Fix partner_submit_event_revision
create or replace function public.partner_submit_event_revision(
  p_event_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz
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
  proposed_snapshot jsonb;
  changed_keys text[] := '{}';
  k text;
  old_val jsonb;
  new_val jsonb;
  is_diff boolean;
  has_blocked boolean := false;
  blocked_reason text := null;
  has_high_risk boolean := false;
  rule_code text := null;
  rev_id uuid;
  new_price numeric;
  old_price numeric;
begin
  if actor is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select * into target_event
  from public.events
  where id = p_event_id
  for update;

  if target_event.id is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  if target_event.partner_id <> actor and not public.is_admin_user() then
    raise exception 'You do not own this event' using errcode = '42501';
  end if;

  if target_event.event_status <> 'live' then
    raise exception 'Only live events can submit revisions through this workflow' using errcode = '22023';
  end if;

  if target_event.updated_at <> p_expected_updated_at then
    raise exception 'Event changed after it was loaded; refresh before saving' using errcode = '40001';
  end if;

  previous_snapshot := jsonb_build_object(
    'title', target_event.title,
    'description', target_event.description,
    'category', target_event.category,
    'starts_at', to_jsonb(target_event.starts_at),
    'ends_at', to_jsonb(target_event.ends_at),
    'frequency', target_event.frequency,
    'weekday', target_event.weekday,
    'event_location_kind', target_event.event_location_kind,
    'venue_id', target_event.venue_id,
    'external_location_name', target_event.external_location_name,
    'external_location_address', target_event.external_location_address,
    'is_free', target_event.is_free,
    'price_pp', target_event.price_pp,
    'capacity', target_event.capacity,
    'emoji', target_event.emoji,
    'cover_image', target_event.cover_image,
    'images', to_jsonb(target_event.images),
    'vibes', to_jsonb(target_event.vibes)
  );

  proposed_snapshot := '{}'::jsonb;

  -- Only iterate over known allowed content keys
  for k in select jsonb_object_keys(previous_snapshot)
  loop
    if p_payload ? k then
      new_val := p_payload -> k;
      old_val := previous_snapshot -> k;
      is_diff := false;

      -- Typed comparisons
      if k in ('starts_at', 'ends_at') then
        if (old_val #>> '{}') is null and (new_val #>> '{}') is not null and btrim(new_val #>> '{}') <> '' then
          is_diff := true;
        elsif (old_val #>> '{}') is not null and (new_val #>> '{}') is null then
          is_diff := true;
        elsif (old_val #>> '{}') is not null and (new_val #>> '{}') is not null then
          begin
            if (old_val #>> '{}')::timestamptz is distinct from (new_val #>> '{}')::timestamptz then
              is_diff := true;
            end if;
          exception when others then
            if (old_val #>> '{}') is distinct from (new_val #>> '{}') then
              is_diff := true;
            end if;
          end;
        end if;
      elsif k = 'price_pp' then
        old_price := coalesce((old_val #>> '{}')::numeric, 0);
        new_price := coalesce((new_val #>> '{}')::numeric, 0);
        if old_price is distinct from new_price then
          is_diff := true;
        end if;
      elsif k = 'is_free' then
        if coalesce((old_val #>> '{}')::boolean, false) is distinct from coalesce((new_val #>> '{}')::boolean, false) then
          is_diff := true;
        end if;
      elsif k = 'capacity' then
        if coalesce((old_val #>> '{}')::integer, 0) is distinct from coalesce((new_val #>> '{}')::integer, 0) then
          is_diff := true;
        end if;
      elsif k in ('images', 'vibes') then
        if (old_val is distinct from new_val) then
          is_diff := true;
        end if;
      else
        -- String / text comparison with trimming
        if nullif(btrim(coalesce(old_val #>> '{}', '')), '') is distinct from nullif(btrim(coalesce(new_val #>> '{}', '')), '') then
          is_diff := true;
        end if;
      end if;

      if is_diff then
        changed_keys := array_append(changed_keys, k);
        proposed_snapshot := jsonb_set(proposed_snapshot, array[k], new_val);

        -- Guardrails
        if k = 'is_free' and target_event.initial_published_is_free = true and (new_val #>> '{}')::boolean = false then
          has_blocked := true;
          blocked_reason := 'published_free_event_cannot_become_paid';
        elsif k = 'price_pp' and (new_val #>> '{}')::numeric > target_event.price_pp then
          has_blocked := true;
          blocked_reason := 'published_event_price_cannot_increase';
        elsif k in ('starts_at', 'ends_at', 'frequency', 'weekday') then
          has_high_risk := true;
          rule_code := coalesce(rule_code, 'SCHEDULE_CHANGE');
        elsif k in ('venue_id', 'event_location_kind', 'external_location_name', 'external_location_address') then
          has_high_risk := true;
          rule_code := coalesce(rule_code, 'LOCATION_CHANGE');
        elsif k = 'title' then
          has_high_risk := true;
          rule_code := coalesce(rule_code, 'TITLE_CHANGE');
        elsif k = 'capacity' and (new_val #>> '{}')::integer < coalesce(target_event.capacity, 0) and (new_val #>> '{}')::integer > 0 then
          has_high_risk := true;
          rule_code := coalesce(rule_code, 'CAPACITY_REDUCTION');
        end if;
      end if;
    end if;
  end loop;

  if array_length(changed_keys, 1) is null then
    return jsonb_build_object(
      'status', 'applied',
      'message', 'No changes detected',
      'updated_at', target_event.updated_at
    );
  end if;

  if has_blocked then
    insert into public.event_revisions (
      event_id, status, risk_level, enforcement_code, rule_code,
      previous_values, proposed_values, changed_fields,
      submitted_by, blocked_reason
    ) values (
      p_event_id, 'blocked', 'high', 'B', 'COMMERCIAL_RULE_VIOLATION',
      previous_snapshot, proposed_snapshot, changed_keys,
      actor, blocked_reason
    ) returning id into rev_id;

    raise exception '%', blocked_reason using errcode = '22023';
  end if;

  if has_high_risk then
    insert into public.event_revisions (
      event_id, status, risk_level, enforcement_code, rule_code,
      previous_values, proposed_values, changed_fields,
      submitted_by
    ) values (
      p_event_id, 'pending', 'high', 'B', rule_code,
      previous_snapshot, proposed_snapshot, changed_keys,
      actor
    ) returning id into rev_id;

    return jsonb_build_object(
      'status', 'pending',
      'revision_id', rev_id,
      'risk_level', 'high',
      'rule_code', rule_code,
      'changed_fields', changed_keys,
      'message', 'Sensitive changes submitted for admin review before taking public effect'
    );
  end if;

  -- Low-risk: auto-apply immediately
  update public.events
  set
    description = case when proposed_snapshot ? 'description' then nullif(btrim(proposed_snapshot ->> 'description'), '') else description end,
    category = case when proposed_snapshot ? 'category' then nullif(btrim(proposed_snapshot ->> 'category'), '') else category end,
    emoji = case when proposed_snapshot ? 'emoji' then proposed_snapshot ->> 'emoji' else emoji end,
    cover_image = case when proposed_snapshot ? 'cover_image' then nullif(btrim(proposed_snapshot ->> 'cover_image'), '') else cover_image end,
    images = case when proposed_snapshot ? 'images' and jsonb_typeof(proposed_snapshot -> 'images') = 'array' then (select coalesce(array_agg(x), '{}'::text[]) from jsonb_array_elements_text(proposed_snapshot -> 'images') as t(x)) else images end,
    vibes = case when proposed_snapshot ? 'vibes' and jsonb_typeof(proposed_snapshot -> 'vibes') = 'array' then (select coalesce(array_agg(x), '{}'::text[]) from jsonb_array_elements_text(proposed_snapshot -> 'vibes') as t(x)) else vibes end,
    capacity = case when proposed_snapshot ? 'capacity' then nullif(proposed_snapshot ->> 'capacity', '')::integer else capacity end,
    spots_total = case when proposed_snapshot ? 'capacity' then nullif(proposed_snapshot ->> 'capacity', '')::integer else spots_total end,
    price_pp = case when proposed_snapshot ? 'price_pp' then nullif(proposed_snapshot ->> 'price_pp', '')::numeric(12,2) else price_pp end,
    is_free = case when proposed_snapshot ? 'is_free' then (proposed_snapshot ->> 'is_free')::boolean else is_free end,
    updated_at = now()
  where id = p_event_id;

  insert into public.event_revisions (
    event_id, status, risk_level, enforcement_code, rule_code,
    previous_values, proposed_values, changed_fields,
    submitted_by, reviewed_by, reviewed_at
  ) values (
    p_event_id, 'applied', 'low', 'A', 'AUTO_APPLIED_LOW_RISK',
    previous_snapshot, proposed_snapshot, changed_keys,
    actor, actor, now()
  ) returning id into rev_id;

  -- If price was reduced or made free, dispatch notifications
  if 'price_pp' = any(changed_keys) or 'is_free' = any(changed_keys) then
    perform public.dispatch_event_change_notifications(
      p_event_id,
      rev_id,
      changed_keys,
      previous_snapshot,
      proposed_snapshot
    );
  end if;

  return jsonb_build_object(
    'status', 'applied',
    'revision_id', rev_id,
    'risk_level', 'low',
    'changed_fields', changed_keys,
    'message', 'Changes applied immediately to live event'
  );
end;
$function$;