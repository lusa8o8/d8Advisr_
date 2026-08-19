-- Migration for Phase 4.6C: Consumer Interests and Notifications

-- 1. Create event_interests table
create table if not exists public.event_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  interest_type text not null default 'reminder',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_interests_type_check
    check (interest_type in ('reminder', 'saved', 'plan', 'ticket', 'waitlist')),
  constraint event_interests_user_event_type_key
    unique (user_id, event_id, interest_type)
);

create index if not exists event_interests_event_active_idx
  on public.event_interests (event_id, active);

create index if not exists event_interests_user_active_idx
  on public.event_interests (user_id, active);

alter table public.event_interests enable row level security;

revoke all on public.event_interests from anon, authenticated;
grant select, insert, update, delete on public.event_interests to authenticated;

drop policy if exists "Users can view own event interests" on public.event_interests;
create policy "Users can view own event interests"
  on public.event_interests for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own event interests" on public.event_interests;
create policy "Users can insert own event interests"
  on public.event_interests for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own event interests" on public.event_interests;
create policy "Users can update own event interests"
  on public.event_interests for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own event interests" on public.event_interests;
create policy "Users can delete own event interests"
  on public.event_interests for delete
  to authenticated
  using (auth.uid() = user_id);

-- 2. Create consumer_notifications table
create table if not exists public.consumer_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint consumer_notifications_type_check
    check (type in ('event_rescheduled', 'event_relocated', 'event_price_reduced', 'event_cancelled', 'system', 'vibe_match'))
);

create index if not exists consumer_notifications_user_created_idx
  on public.consumer_notifications (user_id, created_at desc);

create index if not exists consumer_notifications_user_read_idx
  on public.consumer_notifications (user_id, read_at);

alter table public.consumer_notifications enable row level security;

revoke all on public.consumer_notifications from anon, authenticated;
grant select on public.consumer_notifications to authenticated;
grant update (read_at) on public.consumer_notifications to authenticated;

drop policy if exists "Users can view own consumer notifications" on public.consumer_notifications;
create policy "Users can view own consumer notifications"
  on public.consumer_notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update read_at on own consumer notifications" on public.consumer_notifications;
create policy "Users can update read_at on own consumer notifications"
  on public.consumer_notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Helper RPC to toggle event interest
create or replace function public.toggle_event_interest(
  p_event_id uuid,
  p_interest_type text,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  res_active boolean;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_interest_type not in ('reminder', 'saved', 'plan', 'ticket', 'waitlist') then
    raise exception 'Invalid interest type' using errcode = '22023';
  end if;

  insert into public.event_interests (user_id, event_id, interest_type, active, updated_at)
  values (actor, p_event_id, p_interest_type, p_active, now())
  on conflict (user_id, event_id, interest_type)
  do update set
    active = p_active,
    updated_at = now()
  returning active into res_active;

  return jsonb_build_object(
    'event_id', p_event_id,
    'interest_type', p_interest_type,
    'active', res_active
  );
end;
$function$;

revoke all on function public.toggle_event_interest(uuid, text, boolean) from public, anon;
grant execute on function public.toggle_event_interest(uuid, text, boolean) to authenticated;

-- 4. Helper function to dispatch consumer notifications on event changes
create or replace function public.dispatch_event_change_notifications(
  p_event_id uuid,
  p_revision_id uuid,
  p_changed_fields text[],
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
  notif_type text;
  notif_title text;
  notif_body text;
  dispatch_count integer := 0;
  display_name text;
begin
  select * into target_event from public.events where id = p_event_id;
  if target_event.id is null then return 0; end if;

  display_name := coalesce(target_event.title, 'An event you follow');

  -- Determine notification type
  if 'starts_at' = any(p_changed_fields) or 'ends_at' = any(p_changed_fields) or 'weekday' = any(p_changed_fields) or 'frequency' = any(p_changed_fields) then
    notif_type := 'event_rescheduled';
    notif_title := 'Schedule update: ' || display_name;
    notif_body := display_name || ' has updated its schedule or start time.';
  elsif 'venue_id' = any(p_changed_fields) or 'external_location_name' = any(p_changed_fields) or 'external_location_address' = any(p_changed_fields) then
    notif_type := 'event_relocated';
    notif_title := 'Location update: ' || display_name;
    notif_body := display_name || ' has moved to a new location or venue.';
  elsif 'price_pp' = any(p_changed_fields) or 'is_free' = any(p_changed_fields) then
    notif_type := 'event_price_reduced';
    notif_title := 'Price drop: ' || display_name;
    notif_body := display_name || ' has reduced its entry price.';
  else
    notif_type := 'system';
    notif_title := 'Update: ' || display_name;
    notif_body := display_name || ' has updated event details.';
  end if;

  for recipient in
    select distinct user_id
    from public.event_interests
    where event_id = p_event_id
      and active = true
  loop
    -- Insert notification with deduplication
    if not exists (
      select 1 from public.consumer_notifications cn
      where cn.user_id = recipient.user_id
        and cn.event_id = p_event_id
        and cn.type = notif_type
        and (cn.metadata->>'revision_id') = p_revision_id::text
    ) then
      insert into public.consumer_notifications (
        user_id, event_id, type, title, body, metadata
      ) values (
        recipient.user_id,
        p_event_id,
        notif_type,
        notif_title,
        notif_body,
        jsonb_build_object(
          'event_id', p_event_id,
          'event_title', display_name,
          'revision_id', p_revision_id,
          'changed_fields', p_changed_fields,
          'proposed_values', p_proposed_values
        )
      );
      dispatch_count := dispatch_count + 1;
    end if;
  end loop;

  return dispatch_count;
end;
$function$;

-- 5. Integrate dispatch into admin_review_event_revision
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
      updated_at = now()
    where id = target_revision.event_id;

    update public.event_revisions
    set
      status = 'approved',
      reviewed_by = actor,
      reviewed_at = now(),
      review_note = nullif(btrim(p_review_note), ''),
      updated_at = now()
    where id = p_revision_id;

    insert into public.listing_admin_audit_log (
      event_id, action, attribution, publication_status, actor_id, metadata
    ) values (
      target_revision.event_id, 'updated_live', 'partner', 'live', actor,
      jsonb_build_object(
        'revision_id', p_revision_id,
        'decision', 'approved',
        'proposed_values', target_revision.proposed_values,
        'note', p_review_note
      )
    );

    notification_title := 'Event revision approved';
    notification_body := display_name || ' was approved and your reviewed changes are now live.';

    -- Dispatch consumer notifications for approved changes
    perform public.dispatch_event_change_notifications(
      target_revision.event_id,
      target_revision.id,
      target_revision.changed_fields,
      target_revision.proposed_values
    );
  else
    update public.event_revisions
    set
      status = 'rejected',
      reviewed_by = actor,
      reviewed_at = now(),
      review_note = nullif(btrim(p_review_note), ''),
      updated_at = now()
    where id = p_revision_id;

    insert into public.listing_admin_audit_log (
      event_id, action, attribution, publication_status, actor_id, metadata
    ) values (
      target_revision.event_id, 'updated_live', 'partner', 'live', actor,
      jsonb_build_object(
        'revision_id', p_revision_id,
        'decision', 'rejected',
        'proposed_values', target_revision.proposed_values,
        'note', p_review_note
      )
    );

    notification_title := 'Event revision rejected';
    notification_body := display_name || ' remains live with its previous details.'
      || case when p_review_note is not null and btrim(p_review_note) <> '' then ' D8 note: ' || btrim(p_review_note) else '' end;
  end if;

  -- Notify partner
  if target_revision.submitted_by is not null and not exists (
    select 1 from public.partner_notifications pn
    where pn.user_id = target_revision.submitted_by
      and pn.metadata->>'revision_id' = target_revision.id::text
      and pn.metadata->>'decision' = p_decision
  ) then
    insert into public.partner_notifications (
      user_id, partner_application_id, type, title, body, metadata
    ) values (
      target_revision.submitted_by,
      null,
      case when p_decision = 'approved' then 'approval' else 'review' end,
      notification_title,
      notification_body,
      jsonb_build_object(
        'event_id', target_event.id,
        'event_title', display_name,
        'revision_id', target_revision.id,
        'decision', p_decision,
        'note', p_review_note
      )
    );
  end if;

  return jsonb_build_object('status', p_decision, 'revision_id', p_revision_id);
end;
$function$;

-- 6. Integrate dispatch into partner_submit_event_revision for applied price drops
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
  changed_keys text[] := array[]::text[];
  k text;
  new_val jsonb;
  old_val jsonb;
  has_high_risk boolean := false;
  has_blocked boolean := false;
  blocked_reason text := null;
  rule_code text := null;
  revision_id uuid;
  applied_count integer := 0;
  prop_price numeric(12,2);
  prop_is_free boolean;
  prop_starts_at timestamptz;
  prop_ends_at timestamptz;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into target_event from public.events where id = p_event_id for update;

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
    'capacity', target_event.capacity,
    'emoji', target_event.emoji,
    'cover_image', target_event.cover_image,
    'images', target_event.images,
    'vibes', target_event.vibes
  );

  proposed_snapshot := '{}'::jsonb;

  for k, new_val in select * from jsonb_each(p_payload)
  loop
    old_val := previous_snapshot -> k;
    if old_val is distinct from new_val then
      changed_keys := array_append(changed_keys, k);
      proposed_snapshot := jsonb_set(proposed_snapshot, array[k], new_val);

      if k = 'is_free' and target_event.initial_published_is_free = true and (new_val::boolean) = false then
        has_blocked := true;
        blocked_reason := 'published_free_event_cannot_become_paid';
      elsif k = 'price_pp' and (new_val::numeric) > target_event.price_pp then
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
      elsif k = 'capacity' and (new_val::integer) < coalesce(target_event.capacity, 0) and (new_val::integer) > 0 then
        has_high_risk := true;
        rule_code := coalesce(rule_code, 'CAPACITY_REDUCTION');
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
    );
    raise exception '%', blocked_reason using errcode = '22023';
  end if;

  if has_high_risk then
    insert into public.event_revisions (
      event_id, status, risk_level, enforcement_code, rule_code,
      previous_values, proposed_values, changed_fields,
      submitted_by
    ) values (
      p_event_id, 'pending', 'high', 'R', rule_code,
      previous_snapshot, proposed_snapshot, changed_keys,
      actor
    ) returning id into revision_id;

    return jsonb_build_object(
      'status', 'pending',
      'revision_id', revision_id,
      'changed_fields', changed_keys,
      'risk_level', 'high',
      'rule_code', rule_code,
      'updated_at', target_event.updated_at
    );
  else
    -- Low risk: apply directly
    update public.events
    set
      description = case when proposed_snapshot ? 'description' then nullif(btrim(proposed_snapshot ->> 'description'), '') else description end,
      category = case when proposed_snapshot ? 'category' then nullif(btrim(proposed_snapshot ->> 'category'), '') else category end,
      emoji = case when proposed_snapshot ? 'emoji' then proposed_snapshot ->> 'emoji' else emoji end,
      cover_image = case when proposed_snapshot ? 'cover_image' then nullif(proposed_snapshot ->> 'cover_image', '') else cover_image end,
      images = case when proposed_snapshot ? 'images' then proposed_snapshot -> 'images' else images end,
      vibes = case when proposed_snapshot ? 'vibes' then proposed_snapshot -> 'vibes' else vibes end,
      capacity = case when proposed_snapshot ? 'capacity' then nullif(proposed_snapshot ->> 'capacity', '')::integer else capacity end,
      spots_total = case when proposed_snapshot ? 'capacity' then nullif(proposed_snapshot ->> 'capacity', '')::integer else spots_total end,
      price_pp = case when proposed_snapshot ? 'price_pp' then (proposed_snapshot ->> 'price_pp')::numeric(12,2) else price_pp end,
      is_free = case when proposed_snapshot ? 'is_free' then (proposed_snapshot ->> 'is_free')::boolean else is_free end,
      updated_at = now()
    where id = p_event_id returning * into target_event;

    insert into public.event_revisions (
      event_id, status, risk_level, enforcement_code, rule_code,
      previous_values, proposed_values, changed_fields,
      submitted_by, reviewed_at
    ) values (
      p_event_id, 'applied', 'low', 'A', 'AUTO_APPLIED_METADATA',
      previous_snapshot, proposed_snapshot, changed_keys,
      actor, now()
    ) returning id into revision_id;

    -- If price was reduced, notify interested consumers
    if 'price_pp' = any(changed_keys) or 'is_free' = any(changed_keys) then
      perform public.dispatch_event_change_notifications(
        p_event_id,
        revision_id,
        changed_keys,
        proposed_snapshot
      );
    end if;

    return jsonb_build_object(
      'status', 'applied',
      'revision_id', revision_id,
      'changed_fields', changed_keys,
      'risk_level', 'low',
      'updated_at', target_event.updated_at
    );
  end if;
end;
$function$;