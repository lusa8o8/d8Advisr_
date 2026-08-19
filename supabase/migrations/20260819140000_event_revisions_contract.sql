-- Event Revisions Contract for Phase 4.6B

create table if not exists public.event_revisions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('applied', 'pending', 'approved', 'rejected', 'blocked', 'cancelled')),
  risk_level text not null default 'low'
    check (risk_level in ('low', 'high')),
  enforcement_code text
    check (enforcement_code in ('A', 'C', 'R', 'E', 'B', 'N')),
  rule_code text,
  previous_values jsonb not null check (jsonb_typeof(previous_values) = 'object'),
  proposed_values jsonb not null check (jsonb_typeof(proposed_values) = 'object'),
  changed_fields text[] not null default '{}'::text[],
  submitted_by uuid references public.profiles(id) on delete set null,
  revision_source text not null default 'partner'
    check (revision_source in ('partner', 'admin')),
  organizer_reason text,
  emergency_reason text,
  policy_id text not null default 'partner-event-publishing-v1.0',
  policy_version text not null default '1.0',
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_revisions_nonempty_check
    check (proposed_values <> '{}'::jsonb)
);

create unique index if not exists event_revisions_one_pending_idx
  on public.event_revisions(event_id)
  where status = 'pending';

create index if not exists event_revisions_event_created_idx
  on public.event_revisions(event_id, created_at desc);

create index if not exists event_revisions_pending_idx
  on public.event_revisions(status)
  where status = 'pending';

alter table public.event_revisions enable row level security;

drop policy if exists "Admins can view and manage all event revisions" on public.event_revisions;
create policy "Admins can view and manage all event revisions"
  on public.event_revisions for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Partners can view own event revisions" on public.event_revisions;
create policy "Partners can view own event revisions"
  on public.event_revisions for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_revisions.event_id and (
        e.partner_id = auth.uid()
        or (
          e.organizer_organization_id is not null
          and public.is_active_organization_member(e.organizer_organization_id, auth.uid())
          and public.organization_can(e.organizer_organization_id, 'events')
        )
      )
    )
  );

grant select on public.event_revisions to authenticated;

-- Deterministic Event Revision Submission RPC
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
  old_event public.events;
  updated_event public.events;
  revision_id_value uuid;
  
  -- Proposed values extracted
  prop_title text;
  prop_category text;
  prop_description text;
  prop_frequency text;
  prop_weekday text;
  prop_starts_at timestamptz;
  prop_ends_at timestamptz;
  prop_is_free boolean;
  prop_price_pp numeric(12,2);
  prop_capacity integer;
  prop_emoji text;
  prop_location_kind text;
  prop_venue_id uuid;
  prop_ext_name text;
  prop_ext_address text;
  prop_cover_image text;
  prop_images text[];
  prop_vibes text[];
  
  prev_snapshot jsonb := '{}'::jsonb;
  prop_snapshot jsonb := '{}'::jsonb;
  changed_keys text[] := '{}'::text[];
  
  has_sensitive_changes boolean := false;
  rule_code_value text := 'metadata_update';
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or p_expected_updated_at is null then
    raise exception 'invalid_partner_event_revision_payload' using errcode = '22023';
  end if;

  select * into old_event from public.events where id = p_event_id for update;

  if old_event.id is null then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  if old_event.event_status <> 'live' or not (
    old_event.partner_id = actor
    or (
      old_event.organizer_organization_id is not null
      and public.is_active_organization_member(old_event.organizer_organization_id, actor)
      and public.organization_can(old_event.organizer_organization_id, 'events')
    )
  ) then
    raise exception 'partner_live_event_access_required' using errcode = '42501';
  end if;

  if old_event.updated_at is distinct from p_expected_updated_at then
    raise exception 'Event changed after it was loaded; refresh before saving' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.event_revisions r
    where r.event_id = p_event_id and r.status = 'pending'
  ) then
    raise exception 'Event already has a pending revision in review' using errcode = '23505';
  end if;

  -- 1. Extract Proposed Values
  prop_title := case when p_payload ? 'title' then nullif(btrim(p_payload ->> 'title'), '') else old_event.title end;
  prop_category := case when p_payload ? 'category' then nullif(btrim(p_payload ->> 'category'), '') else old_event.category end;
  prop_description := case when p_payload ? 'description' then nullif(btrim(p_payload ->> 'description'), '') else old_event.description end;
  prop_frequency := case when p_payload ? 'frequency' then nullif(btrim(p_payload ->> 'frequency'), '') else old_event.frequency end;
  prop_weekday := case when p_payload ? 'weekday' then nullif(btrim(p_payload ->> 'weekday'), '') else old_event.weekday end;
  prop_starts_at := case when p_payload ? 'starts_at' then nullif(p_payload ->> 'starts_at', '')::timestamptz else old_event.starts_at end;
  prop_ends_at := case when p_payload ? 'ends_at' then nullif(p_payload ->> 'ends_at', '')::timestamptz else old_event.ends_at end;
  prop_is_free := case when p_payload ? 'is_free' then (p_payload ->> 'is_free')::boolean else old_event.is_free end;
  prop_price_pp := case when prop_is_free then 0 when p_payload ? 'price_pp' then nullif(p_payload ->> 'price_pp', '')::numeric(12,2) else old_event.price_pp end;
  prop_capacity := case when p_payload ? 'capacity' then nullif(p_payload ->> 'capacity', '')::integer else coalesce(old_event.capacity, old_event.spots_total) end;
  prop_emoji := case when p_payload ? 'emoji' then nullif(btrim(p_payload ->> 'emoji'), '') else old_event.emoji end;
  prop_location_kind := case when p_payload ? 'event_location_kind' then nullif(btrim(p_payload ->> 'event_location_kind'), '') else old_event.event_location_kind end;
  prop_venue_id := case when p_payload ? 'venue_id' then nullif(p_payload ->> 'venue_id', '')::uuid else old_event.venue_id end;
  prop_ext_name := case when p_payload ? 'external_location_name' then nullif(btrim(p_payload ->> 'external_location_name'), '') else old_event.external_location_name end;
  prop_ext_address := case when p_payload ? 'external_location_address' then nullif(btrim(p_payload ->> 'external_location_address'), '') else old_event.external_location_address end;
  prop_cover_image := case when p_payload ? 'cover_image' then nullif(btrim(p_payload ->> 'cover_image'), '') else old_event.cover_image end;
  
  if p_payload ? 'images' then
    prop_images := array(select btrim(val) from jsonb_array_elements_text(p_payload -> 'images') val where btrim(val) <> '');
    if cardinality(prop_images) > 0 and prop_cover_image is null then
      prop_cover_image := prop_images[1];
    end if;
  else
    prop_images := old_event.images;
  end if;

  if p_payload ? 'vibes' then
    prop_vibes := array(select btrim(val) from jsonb_array_elements_text(p_payload -> 'vibes') val where btrim(val) <> '');
  else
    prop_vibes := old_event.vibes;
  end if;

  -- 2. Commercial Invariant Checks (Deterministically Blocked - B)
  if coalesce(old_event.is_free, false) and not coalesce(prop_is_free, false) then
    insert into public.event_revisions (
      event_id, status, risk_level, enforcement_code, rule_code,
      previous_values, proposed_values, changed_fields, submitted_by, revision_source
    ) values (
      p_event_id, 'blocked', 'high', 'B', 'published_free_event_cannot_become_paid',
      jsonb_build_object('is_free', old_event.is_free, 'price_pp', old_event.price_pp),
      jsonb_build_object('is_free', prop_is_free, 'price_pp', prop_price_pp),
      array['is_free', 'price_pp'], actor, 'partner'
    );
    raise exception 'published_free_event_cannot_become_paid' using errcode = '22023';
  end if;

  if not coalesce(old_event.is_free, false) and not coalesce(prop_is_free, false) and prop_price_pp > old_event.price_pp then
    insert into public.event_revisions (
      event_id, status, risk_level, enforcement_code, rule_code,
      previous_values, proposed_values, changed_fields, submitted_by, revision_source
    ) values (
      p_event_id, 'blocked', 'high', 'B', 'published_event_price_cannot_increase',
      jsonb_build_object('price_pp', old_event.price_pp),
      jsonb_build_object('price_pp', prop_price_pp),
      array['price_pp'], actor, 'partner'
    );
    raise exception 'published_event_price_cannot_increase' using errcode = '22023';
  end if;

  if prop_ends_at is not null and prop_ends_at <= prop_starts_at then
    raise exception 'Event ends_at must be after starts_at' using errcode = '22023';
  end if;

  -- 3. Detect and Classify Changed Fields
  if old_event.title is distinct from prop_title then
    prev_snapshot := prev_snapshot || jsonb_build_object('title', old_event.title);
    prop_snapshot := prop_snapshot || jsonb_build_object('title', prop_title);
    changed_keys := array_append(changed_keys, 'title');
    has_sensitive_changes := true;
    rule_code_value := 'title_change';
  end if;

  if old_event.starts_at is distinct from prop_starts_at then
    prev_snapshot := prev_snapshot || jsonb_build_object('starts_at', old_event.starts_at);
    prop_snapshot := prop_snapshot || jsonb_build_object('starts_at', prop_starts_at);
    changed_keys := array_append(changed_keys, 'starts_at');
    has_sensitive_changes := true;
    rule_code_value := 'schedule_change';
  end if;

  if old_event.ends_at is distinct from prop_ends_at then
    prev_snapshot := prev_snapshot || jsonb_build_object('ends_at', old_event.ends_at);
    prop_snapshot := prop_snapshot || jsonb_build_object('ends_at', prop_ends_at);
    changed_keys := array_append(changed_keys, 'ends_at');
    has_sensitive_changes := true;
    rule_code_value := 'schedule_change';
  end if;

  if old_event.weekday is distinct from prop_weekday or old_event.frequency is distinct from prop_frequency then
    prev_snapshot := prev_snapshot || jsonb_build_object('weekday', old_event.weekday, 'frequency', old_event.frequency);
    prop_snapshot := prop_snapshot || jsonb_build_object('weekday', prop_weekday, 'frequency', prop_frequency);
    changed_keys := array_append(changed_keys, 'frequency');
    has_sensitive_changes := true;
    rule_code_value := 'recurrence_change';
  end if;

  if old_event.event_location_kind is distinct from prop_location_kind
     or old_event.venue_id is distinct from prop_venue_id
     or old_event.external_location_name is distinct from prop_ext_name
     or old_event.external_location_address is distinct from prop_ext_address then
    prev_snapshot := prev_snapshot || jsonb_build_object(
      'event_location_kind', old_event.event_location_kind,
      'venue_id', old_event.venue_id,
      'external_location_name', old_event.external_location_name,
      'external_location_address', old_event.external_location_address
    );
    prop_snapshot := prop_snapshot || jsonb_build_object(
      'event_location_kind', prop_location_kind,
      'venue_id', prop_venue_id,
      'external_location_name', prop_ext_name,
      'external_location_address', prop_ext_address
    );
    changed_keys := array_append(changed_keys, 'location');
    has_sensitive_changes := true;
    rule_code_value := 'location_change';
  end if;

  if coalesce(old_event.capacity, 0) > 0 and prop_capacity is not null and prop_capacity < old_event.capacity then
    prev_snapshot := prev_snapshot || jsonb_build_object('capacity', old_event.capacity);
    prop_snapshot := prop_snapshot || jsonb_build_object('capacity', prop_capacity);
    changed_keys := array_append(changed_keys, 'capacity');
    has_sensitive_changes := true;
    rule_code_value := 'capacity_reduction';
  elsif old_event.capacity is distinct from prop_capacity then
    prev_snapshot := prev_snapshot || jsonb_build_object('capacity', old_event.capacity);
    prop_snapshot := prop_snapshot || jsonb_build_object('capacity', prop_capacity);
    changed_keys := array_append(changed_keys, 'capacity');
  end if;

  -- Low Risk Fields
  if old_event.description is distinct from prop_description then
    prev_snapshot := prev_snapshot || jsonb_build_object('description', old_event.description);
    prop_snapshot := prop_snapshot || jsonb_build_object('description', prop_description);
    changed_keys := array_append(changed_keys, 'description');
  end if;

  if old_event.category is distinct from prop_category then
    prev_snapshot := prev_snapshot || jsonb_build_object('category', old_event.category);
    prop_snapshot := prop_snapshot || jsonb_build_object('category', prop_category);
    changed_keys := array_append(changed_keys, 'category');
  end if;

  if old_event.emoji is distinct from prop_emoji then
    prev_snapshot := prev_snapshot || jsonb_build_object('emoji', old_event.emoji);
    prop_snapshot := prop_snapshot || jsonb_build_object('emoji', prop_emoji);
    changed_keys := array_append(changed_keys, 'emoji');
  end if;

  if old_event.cover_image is distinct from prop_cover_image then
    prev_snapshot := prev_snapshot || jsonb_build_object('cover_image', old_event.cover_image);
    prop_snapshot := prop_snapshot || jsonb_build_object('cover_image', prop_cover_image);
    changed_keys := array_append(changed_keys, 'cover_image');
  end if;

  if old_event.images is distinct from prop_images then
    prev_snapshot := prev_snapshot || jsonb_build_object('images', old_event.images);
    prop_snapshot := prop_snapshot || jsonb_build_object('images', prop_images);
    changed_keys := array_append(changed_keys, 'images');
  end if;

  if old_event.vibes is distinct from prop_vibes then
    prev_snapshot := prev_snapshot || jsonb_build_object('vibes', old_event.vibes);
    prop_snapshot := prop_snapshot || jsonb_build_object('vibes', prop_vibes);
    changed_keys := array_append(changed_keys, 'vibes');
  end if;

  if old_event.price_pp is distinct from prop_price_pp or old_event.is_free is distinct from prop_is_free then
    prev_snapshot := prev_snapshot || jsonb_build_object('price_pp', old_event.price_pp, 'is_free', old_event.is_free);
    prop_snapshot := prop_snapshot || jsonb_build_object('price_pp', prop_price_pp, 'is_free', prop_is_free);
    changed_keys := array_append(changed_keys, 'price');
  end if;

  if prop_snapshot = '{}'::jsonb then
    raise exception 'No changes detected in submission' using errcode = '22023';
  end if;

  -- 4. Apply or Queue
  if has_sensitive_changes then
    -- High risk: Queue for admin review
    insert into public.event_revisions (
      event_id, status, risk_level, enforcement_code, rule_code,
      previous_values, proposed_values, changed_fields, submitted_by, revision_source
    ) values (
      p_event_id, 'pending', 'high', 'R', rule_code_value,
      prev_snapshot, prop_snapshot, changed_keys, actor, 'partner'
    )
    returning id into revision_id_value;

    return jsonb_build_object(
      'status', 'pending',
      'revision_id', revision_id_value,
      'risk_level', 'high',
      'message', 'Your sensitive changes (schedule/location/title/capacity) have been submitted for admin review.'
    );
  else
    -- Low risk: Apply immediately
    update public.events
    set
      description = prop_description,
      category = prop_category,
      vibes = coalesce(prop_vibes, '{}'::text[]),
      cover_image = prop_cover_image,
      images = coalesce(prop_images, '{}'::text[]),
      price_pp = prop_price_pp,
      is_free = prop_is_free,
      capacity = nullif(prop_capacity, 0),
      spots_total = prop_capacity,
      emoji = prop_emoji,
      updated_at = now()
    where id = p_event_id
    returning * into updated_event;

    insert into public.event_revisions (
      event_id, status, risk_level, enforcement_code, rule_code,
      previous_values, proposed_values, changed_fields, submitted_by, revision_source
    ) values (
      p_event_id, 'applied', 'low', 'A', 'metadata_update',
      prev_snapshot, prop_snapshot, changed_keys, actor, 'partner'
    )
    returning id into revision_id_value;

    return jsonb_build_object(
      'status', 'applied',
      'revision_id', revision_id_value,
      'risk_level', 'low',
      'message', 'Your changes have been applied immediately to public discovery.'
    );
  end if;
end;
$function$;

revoke all on function public.partner_submit_event_revision(uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.partner_submit_event_revision(uuid, jsonb, timestamptz) to authenticated;

-- Admin Review Event Revision RPC
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

    return jsonb_build_object('status', 'approved', 'revision_id', p_revision_id);
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

    return jsonb_build_object('status', 'rejected', 'revision_id', p_revision_id);
  end if;
end;
$function$;

revoke all on function public.admin_review_event_revision(uuid, text, text) from public, anon;
grant execute on function public.admin_review_event_revision(uuid, text, text) to authenticated;