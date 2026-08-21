-- Phase 4.6D4 slice one: separate factual venue attribution from revocable
-- venue-page marketing placement. The events.venue_page_status column remains
-- a temporary compatibility projection while clients move to this contract.

create table public.event_venue_relationships (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete restrict,
  organizer_organization_id uuid references public.partner_organizations(id) on delete set null,
  venue_organization_id uuid references public.partner_organizations(id) on delete set null,
  attribution_status text not null default 'uncontested' check (
    attribution_status in (
      'uncontested', 'disputed', 'resolved_confirmed',
      'resolved_invalid', 'withdrawn'
    )
  ),
  placement_status text not null default 'requested' check (
    placement_status in ('requested', 'approved', 'declined', 'revoked', 'withdrawn')
  ),
  request_source text not null default 'organizer' check (
    request_source in ('organizer', 'admin', 'same_organization', 'legacy_owner', 'migration')
  ),
  policy_id text not null default 'event-venue-attribution-placement-v1.0',
  policy_version text not null default '1.0',
  is_active boolean not null default true,
  requested_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decision_reason text,
  disputed_by uuid references public.profiles(id) on delete set null,
  disputed_at timestamptz,
  dispute_reason text,
  responded_by uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  response_reason text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution_reason text,
  withdrawn_by uuid references public.profiles(id) on delete set null,
  withdrawn_at timestamptz,
  withdrawal_reason text,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_venue_relationship_active_shape check (
    (is_active and attribution_status <> 'withdrawn' and placement_status <> 'withdrawn' and withdrawn_at is null)
    or
    (not is_active and attribution_status in ('withdrawn', 'resolved_invalid') and placement_status = 'withdrawn' and withdrawn_at is not null)
  ),
  constraint event_venue_relationship_dispute_shape check (
    (attribution_status <> 'disputed')
    or (disputed_at is not null and disputed_by is not null and length(btrim(dispute_reason)) > 0)
  )
);

create unique index event_venue_relationship_one_active_event_idx
  on public.event_venue_relationships(event_id)
  where is_active;

create index event_venue_relationship_venue_queue_idx
  on public.event_venue_relationships(venue_id, placement_status, requested_at desc)
  where is_active;

create index event_venue_relationship_dispute_queue_idx
  on public.event_venue_relationships(attribution_status, disputed_at desc)
  where attribution_status = 'disputed' and is_active;

create table public.event_venue_relationship_audit (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.event_venue_relationships(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete restrict,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_organization_id uuid references public.partner_organizations(id) on delete set null,
  action text not null check (action in (
    'created', 'migrated', 'placement_approved', 'placement_declined',
    'placement_revoked', 'placement_resubmitted', 'attribution_disputed',
    'dispute_response_added', 'dispute_resolved_confirmed',
    'dispute_resolved_invalid', 'withdrawn'
  )),
  previous_state jsonb not null default '{}'::jsonb,
  new_state jsonb not null default '{}'::jsonb,
  reason text,
  policy_id text not null default 'event-venue-attribution-placement-v1.0',
  policy_version text not null default '1.0',
  created_at timestamptz not null default now()
);

create index event_venue_relationship_audit_relationship_idx
  on public.event_venue_relationship_audit(relationship_id, created_at desc);

create or replace function public.can_manage_event_attribution(
  event_uuid uuid,
  user_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select case
    when user_uuid is null then false
    when user_uuid <> auth.uid() and not public.is_admin_user() then false
    when public.is_admin_user() then true
    else exists (
      select 1
      from public.events event_row
      where event_row.id = event_uuid
        and (
          public.can_manage_event(event_row.id, user_uuid)
          or (
            event_row.partner_id = user_uuid
            and public.live_partner_can(user_uuid, 'events')
          )
        )
    )
  end;
$function$;

create or replace function public.can_manage_venue_placement(
  venue_uuid uuid,
  user_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select case
    when user_uuid is null then false
    when user_uuid <> auth.uid() and not public.is_admin_user() then false
    when public.is_admin_user() then true
    else exists (
      select 1
      from public.venues venue
      where venue.id = venue_uuid
        and (
          public.can_manage_venue(venue.id, user_uuid)
          or (
            venue.partner_id = user_uuid
            and public.live_partner_can(user_uuid, 'venues')
          )
        )
    )
  end;
$function$;

revoke all on function public.can_manage_event_attribution(uuid, uuid) from public, anon;
revoke all on function public.can_manage_venue_placement(uuid, uuid) from public, anon;
grant execute on function public.can_manage_event_attribution(uuid, uuid) to authenticated;
grant execute on function public.can_manage_venue_placement(uuid, uuid) to authenticated;

create or replace function public.record_event_venue_relationship_audit(
  p_relationship public.event_venue_relationships,
  p_action text,
  p_previous_state jsonb,
  p_reason text default null,
  p_actor_organization_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.event_venue_relationship_audit (
    relationship_id, event_id, venue_id, actor_user_id, actor_organization_id,
    action, previous_state, new_state, reason, policy_id, policy_version
  ) values (
    p_relationship.id, p_relationship.event_id, p_relationship.venue_id,
    auth.uid(), p_actor_organization_id, p_action,
    coalesce(p_previous_state, '{}'::jsonb), to_jsonb(p_relationship),
    nullif(btrim(p_reason), ''), p_relationship.policy_id,
    p_relationship.policy_version
  );
end;
$function$;

revoke all on function public.record_event_venue_relationship_audit(
  public.event_venue_relationships, text, jsonb, text, uuid
) from public, anon, authenticated;

-- Dedicated relationship RPCs are the only callers allowed to update the
-- legacy projection without presenting it as an organizer event revision.
create or replace function public.project_event_venue_page_status(
  p_event_id uuid,
  p_placement_status text,
  p_attribution_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  projected_status text;
begin
  projected_status := case
    when p_attribution_status in ('disputed', 'resolved_invalid', 'withdrawn') then 'hidden'
    when p_placement_status = 'approved' then 'approved'
    when p_placement_status = 'requested' then 'requested'
    when p_placement_status = 'declined' then 'rejected'
    else 'hidden'
  end;

  perform set_config('d8.event_venue_placement_event_id', p_event_id::text, true);
  update public.events
  set venue_page_status = projected_status,
      updated_at = now()
  where id = p_event_id
    and venue_page_status is distinct from projected_status;
end;
$function$;

revoke all on function public.project_event_venue_page_status(uuid, text, text)
  from public, anon, authenticated;

-- Preserve the published-event integrity boundary while allowing only the
-- compatibility projection to change through the relationship RPCs.
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
  authorized_placement_id text := nullif(current_setting('d8.event_venue_placement_event_id', true), '');
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
        or (
          new.venue_page_status is distinct from old.venue_page_status
          and authorized_placement_id is distinct from old.id::text
        )
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

create or replace function public.sync_event_venue_attribution(
  p_event_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  event_row public.events;
  venue_row public.venues;
  active_relationship public.event_venue_relationships;
  previous_state jsonb;
  placement_value text;
  source_value text;
  same_organization boolean := false;
  same_legacy_owner boolean := false;
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select * into event_row from public.events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if not public.can_manage_event_attribution(event_row.id, actor) then
    raise exception 'event_management_required' using errcode = '42501';
  end if;

  select * into active_relationship
  from public.event_venue_relationships
  where event_id = event_row.id and is_active
  for update;

  if event_row.event_location_kind <> 'd8_venue' or event_row.venue_id is null then
    if active_relationship.id is not null then
      previous_state := to_jsonb(active_relationship);
      update public.event_venue_relationships
      set attribution_status = 'withdrawn', placement_status = 'withdrawn',
          is_active = false, withdrawn_by = actor, withdrawn_at = now(),
          withdrawal_reason = coalesce(nullif(btrim(p_reason), ''), 'event venue removed'),
          version = version + 1, updated_at = now()
      where id = active_relationship.id
      returning * into active_relationship;
      perform public.record_event_venue_relationship_audit(
        active_relationship, 'withdrawn', previous_state,
        active_relationship.withdrawal_reason, event_row.organizer_organization_id
      );
    end if;
    perform public.project_event_venue_page_status(event_row.id, 'withdrawn', 'withdrawn');
    return jsonb_build_object('relationship', null, 'action', 'withdrawn');
  end if;

  select * into venue_row from public.venues where id = event_row.venue_id;
  if not found then
    raise exception 'venue_not_found' using errcode = 'P0002';
  end if;

  if active_relationship.id is not null and active_relationship.venue_id = venue_row.id then
    update public.event_venue_relationships
    set organizer_organization_id = event_row.organizer_organization_id,
        venue_organization_id = venue_row.operator_organization_id,
        updated_at = now()
    where id = active_relationship.id
    returning * into active_relationship;
    perform public.project_event_venue_page_status(
      event_row.id, active_relationship.placement_status,
      active_relationship.attribution_status
    );
    return jsonb_build_object('relationship', to_jsonb(active_relationship), 'action', 'preserved');
  end if;

  if active_relationship.id is not null then
    previous_state := to_jsonb(active_relationship);
    update public.event_venue_relationships
    set attribution_status = 'withdrawn', placement_status = 'withdrawn',
        is_active = false, withdrawn_by = actor, withdrawn_at = now(),
        withdrawal_reason = coalesce(nullif(btrim(p_reason), ''), 'event venue changed'),
        version = version + 1, updated_at = now()
    where id = active_relationship.id
    returning * into active_relationship;
    perform public.record_event_venue_relationship_audit(
      active_relationship, 'withdrawn', previous_state,
      active_relationship.withdrawal_reason, event_row.organizer_organization_id
    );
  end if;

  same_organization := event_row.organizer_organization_id is not null
    and event_row.organizer_organization_id = venue_row.operator_organization_id;
  same_legacy_owner := event_row.organizer_organization_id is null
    and venue_row.operator_organization_id is null
    and event_row.partner_id is not null
    and event_row.partner_id = venue_row.partner_id;
  placement_value := case when same_organization or same_legacy_owner then 'approved' else 'requested' end;
  source_value := case
    when same_organization then 'same_organization'
    when same_legacy_owner then 'legacy_owner'
    when public.is_admin_user() then 'admin'
    else 'organizer'
  end;

  insert into public.event_venue_relationships (
    event_id, venue_id, organizer_organization_id, venue_organization_id,
    attribution_status, placement_status, request_source, requested_by,
    decided_by, decided_at
  ) values (
    event_row.id, venue_row.id, event_row.organizer_organization_id,
    venue_row.operator_organization_id, 'uncontested', placement_value,
    source_value, actor,
    case when placement_value = 'approved' then actor else null end,
    case when placement_value = 'approved' then now() else null end
  ) returning * into active_relationship;

  perform public.record_event_venue_relationship_audit(
    active_relationship, 'created', '{}'::jsonb, p_reason,
    event_row.organizer_organization_id
  );
  perform public.project_event_venue_page_status(
    event_row.id, active_relationship.placement_status,
    active_relationship.attribution_status
  );
  return jsonb_build_object('relationship', to_jsonb(active_relationship), 'action', 'created');
end;
$function$;

create or replace function public.decide_event_venue_placement(
  p_relationship_id uuid,
  p_decision text,
  p_reason text default null,
  p_expected_version bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  relationship_row public.event_venue_relationships;
  previous_state jsonb;
  action_value text;
begin
  if actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'declined', 'revoked') then
    raise exception 'invalid_placement_decision' using errcode = '22023';
  end if;

  select * into relationship_row from public.event_venue_relationships
  where id = p_relationship_id for update;
  if not found then raise exception 'event_venue_relationship_not_found' using errcode = 'P0002'; end if;
  if not relationship_row.is_active then raise exception 'event_venue_relationship_inactive' using errcode = '22023'; end if;
  if not public.can_manage_venue_placement(relationship_row.venue_id, actor) then
    raise exception 'venue_management_required' using errcode = '42501';
  end if;
  if p_expected_version is not null and relationship_row.version <> p_expected_version then
    raise exception 'event_venue_relationship_conflict' using errcode = '40001';
  end if;
  if not public.is_admin_user() and (
    (p_decision in ('approved', 'declined') and relationship_row.placement_status <> 'requested')
    or (p_decision = 'revoked' and relationship_row.placement_status <> 'approved')
  ) then
    raise exception 'invalid_placement_transition' using errcode = '22023';
  end if;

  previous_state := to_jsonb(relationship_row);
  update public.event_venue_relationships
  set placement_status = p_decision, decided_by = actor, decided_at = now(),
      decision_reason = nullif(btrim(p_reason), ''), version = version + 1,
      updated_at = now()
  where id = relationship_row.id
  returning * into relationship_row;

  action_value := case p_decision
    when 'approved' then 'placement_approved'
    when 'declined' then 'placement_declined'
    else 'placement_revoked'
  end;
  perform public.record_event_venue_relationship_audit(
    relationship_row, action_value, previous_state, p_reason,
    relationship_row.venue_organization_id
  );
  perform public.project_event_venue_page_status(
    relationship_row.event_id, relationship_row.placement_status,
    relationship_row.attribution_status
  );
  return to_jsonb(relationship_row);
end;
$function$;

create or replace function public.resubmit_event_venue_placement(
  p_relationship_id uuid,
  p_reason text default null,
  p_expected_version bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  relationship_row public.event_venue_relationships;
  previous_state jsonb;
begin
  if actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into relationship_row from public.event_venue_relationships
  where id = p_relationship_id for update;
  if not found then raise exception 'event_venue_relationship_not_found' using errcode = 'P0002'; end if;
  if not relationship_row.is_active or relationship_row.attribution_status = 'disputed' then
    raise exception 'event_venue_relationship_not_resubmittable' using errcode = '22023';
  end if;
  if relationship_row.placement_status not in ('declined', 'revoked') then
    raise exception 'invalid_placement_transition' using errcode = '22023';
  end if;
  if not public.can_manage_event_attribution(relationship_row.event_id, actor) then
    raise exception 'event_management_required' using errcode = '42501';
  end if;
  if p_expected_version is not null and relationship_row.version <> p_expected_version then
    raise exception 'event_venue_relationship_conflict' using errcode = '40001';
  end if;

  previous_state := to_jsonb(relationship_row);
  update public.event_venue_relationships
  set placement_status = 'requested', requested_by = actor, requested_at = now(),
      decided_by = null, decided_at = null, decision_reason = null,
      version = version + 1, updated_at = now()
  where id = relationship_row.id
  returning * into relationship_row;
  perform public.record_event_venue_relationship_audit(
    relationship_row, 'placement_resubmitted', previous_state, p_reason,
    relationship_row.organizer_organization_id
  );
  perform public.project_event_venue_page_status(
    relationship_row.event_id, relationship_row.placement_status,
    relationship_row.attribution_status
  );
  return to_jsonb(relationship_row);
end;
$function$;

create or replace function public.report_event_venue_attribution(
  p_relationship_id uuid,
  p_reason text,
  p_expected_version bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  relationship_row public.event_venue_relationships;
  previous_state jsonb;
begin
  if actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'attribution_dispute_reason_required' using errcode = '22023';
  end if;
  select * into relationship_row from public.event_venue_relationships
  where id = p_relationship_id for update;
  if not found then raise exception 'event_venue_relationship_not_found' using errcode = 'P0002'; end if;
  if not relationship_row.is_active or relationship_row.attribution_status = 'disputed' then
    raise exception 'event_venue_relationship_not_disputable' using errcode = '22023';
  end if;
  if not public.can_manage_venue_placement(relationship_row.venue_id, actor) then
    raise exception 'venue_management_required' using errcode = '42501';
  end if;
  if p_expected_version is not null and relationship_row.version <> p_expected_version then
    raise exception 'event_venue_relationship_conflict' using errcode = '40001';
  end if;

  previous_state := to_jsonb(relationship_row);
  update public.event_venue_relationships
  set attribution_status = 'disputed', disputed_by = actor, disputed_at = now(),
      dispute_reason = btrim(p_reason), version = version + 1, updated_at = now()
  where id = relationship_row.id
  returning * into relationship_row;
  perform public.record_event_venue_relationship_audit(
    relationship_row, 'attribution_disputed', previous_state, p_reason,
    relationship_row.venue_organization_id
  );
  perform public.project_event_venue_page_status(
    relationship_row.event_id, relationship_row.placement_status,
    relationship_row.attribution_status
  );
  return to_jsonb(relationship_row);
end;
$function$;

create or replace function public.respond_event_venue_dispute(
  p_relationship_id uuid,
  p_response text,
  p_expected_version bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  relationship_row public.event_venue_relationships;
  previous_state jsonb;
begin
  if actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if nullif(btrim(p_response), '') is null then
    raise exception 'attribution_dispute_response_required' using errcode = '22023';
  end if;
  select * into relationship_row from public.event_venue_relationships
  where id = p_relationship_id for update;
  if not found then raise exception 'event_venue_relationship_not_found' using errcode = 'P0002'; end if;
  if not relationship_row.is_active or relationship_row.attribution_status <> 'disputed' then
    raise exception 'event_venue_relationship_not_disputed' using errcode = '22023';
  end if;
  if not public.can_manage_event_attribution(relationship_row.event_id, actor) then
    raise exception 'event_management_required' using errcode = '42501';
  end if;
  if p_expected_version is not null and relationship_row.version <> p_expected_version then
    raise exception 'event_venue_relationship_conflict' using errcode = '40001';
  end if;

  previous_state := to_jsonb(relationship_row);
  update public.event_venue_relationships
  set responded_by = actor, responded_at = now(), response_reason = btrim(p_response),
      version = version + 1, updated_at = now()
  where id = relationship_row.id
  returning * into relationship_row;
  perform public.record_event_venue_relationship_audit(
    relationship_row, 'dispute_response_added', previous_state, p_response,
    relationship_row.organizer_organization_id
  );
  return to_jsonb(relationship_row);
end;
$function$;

create or replace function public.resolve_event_venue_dispute(
  p_relationship_id uuid,
  p_resolution text,
  p_reason text,
  p_expected_version bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  relationship_row public.event_venue_relationships;
  previous_state jsonb;
  action_value text;
begin
  if actor is null or not public.is_admin_user() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_resolution not in ('confirmed', 'invalid') then
    raise exception 'invalid_attribution_resolution' using errcode = '22023';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'attribution_resolution_reason_required' using errcode = '22023';
  end if;
  select * into relationship_row from public.event_venue_relationships
  where id = p_relationship_id for update;
  if not found then raise exception 'event_venue_relationship_not_found' using errcode = 'P0002'; end if;
  if not relationship_row.is_active or relationship_row.attribution_status <> 'disputed' then
    raise exception 'event_venue_relationship_not_disputed' using errcode = '22023';
  end if;
  if p_expected_version is not null and relationship_row.version <> p_expected_version then
    raise exception 'event_venue_relationship_conflict' using errcode = '40001';
  end if;

  previous_state := to_jsonb(relationship_row);
  if p_resolution = 'confirmed' then
    update public.event_venue_relationships
    set attribution_status = 'resolved_confirmed', resolved_by = actor,
        resolved_at = now(), resolution_reason = btrim(p_reason),
        version = version + 1, updated_at = now()
    where id = relationship_row.id
    returning * into relationship_row;
    action_value := 'dispute_resolved_confirmed';
  else
    update public.event_venue_relationships
    set attribution_status = 'resolved_invalid', placement_status = 'withdrawn',
        is_active = false, resolved_by = actor, resolved_at = now(),
        resolution_reason = btrim(p_reason), withdrawn_by = actor,
        withdrawn_at = now(), withdrawal_reason = 'attribution resolved as invalid',
        version = version + 1, updated_at = now()
    where id = relationship_row.id
    returning * into relationship_row;
    action_value := 'dispute_resolved_invalid';
  end if;
  perform public.record_event_venue_relationship_audit(
    relationship_row, action_value, previous_state, p_reason, null
  );
  perform public.project_event_venue_page_status(
    relationship_row.event_id, relationship_row.placement_status,
    relationship_row.attribution_status
  );
  return to_jsonb(relationship_row);
end;
$function$;

revoke all on function public.sync_event_venue_attribution(uuid, text) from public, anon;
revoke all on function public.decide_event_venue_placement(uuid, text, text, bigint) from public, anon;
revoke all on function public.resubmit_event_venue_placement(uuid, text, bigint) from public, anon;
revoke all on function public.report_event_venue_attribution(uuid, text, bigint) from public, anon;
revoke all on function public.respond_event_venue_dispute(uuid, text, bigint) from public, anon;
revoke all on function public.resolve_event_venue_dispute(uuid, text, text, bigint) from public, anon;
grant execute on function public.sync_event_venue_attribution(uuid, text) to authenticated;
grant execute on function public.decide_event_venue_placement(uuid, text, text, bigint) to authenticated;
grant execute on function public.resubmit_event_venue_placement(uuid, text, bigint) to authenticated;
grant execute on function public.report_event_venue_attribution(uuid, text, bigint) to authenticated;
grant execute on function public.respond_event_venue_dispute(uuid, text, bigint) to authenticated;
grant execute on function public.resolve_event_venue_dispute(uuid, text, text, bigint) to authenticated;

-- Keep the old RPC as a constrained adapter until the venue/admin clients move
-- to relationship IDs. It no longer writes organizer-controlled event state.
create or replace function public.set_event_venue_page_status(
  p_event_id uuid,
  p_status text
)
returns public.events
language plpgsql
security definer
set search_path = public
as $function$
declare
  relationship_row public.event_venue_relationships;
  decision_value text;
  updated_event public.events;
begin
  select * into relationship_row
  from public.event_venue_relationships
  where event_id = p_event_id and is_active;
  if not found then
    raise exception 'event_venue_relationship_not_found' using errcode = 'P0002';
  end if;

  decision_value := case
    when p_status = 'approved' then 'approved'
    when p_status = 'rejected' then 'declined'
    when p_status = 'hidden' and relationship_row.placement_status = 'approved' then 'revoked'
    when p_status = 'hidden' then 'declined'
    else null
  end;
  if decision_value is null then
    raise exception 'invalid_placement_decision' using errcode = '22023';
  end if;

  perform public.decide_event_venue_placement(
    relationship_row.id, decision_value, 'legacy venue-page decision adapter',
    relationship_row.version
  );
  select * into updated_event from public.events where id = p_event_id;
  return updated_event;
end;
$function$;

revoke all on function public.set_event_venue_page_status(uuid, text) from public, anon;
grant execute on function public.set_event_venue_page_status(uuid, text) to authenticated;

alter table public.event_venue_relationships enable row level security;
alter table public.event_venue_relationship_audit enable row level security;

create policy "Relevant parties can view event venue relationships"
  on public.event_venue_relationships for select
  to authenticated
  using (
    public.is_admin_user()
    or public.can_manage_event_attribution(event_id, auth.uid())
    or public.can_manage_venue_placement(venue_id, auth.uid())
  );

create policy "Relevant parties can view event venue relationship audit"
  on public.event_venue_relationship_audit for select
  to authenticated
  using (
    public.is_admin_user()
    or public.can_manage_event_attribution(event_id, auth.uid())
    or public.can_manage_venue_placement(venue_id, auth.uid())
  );

revoke all on public.event_venue_relationships from anon, authenticated;
revoke all on public.event_venue_relationship_audit from anon, authenticated;
grant select on public.event_venue_relationships to authenticated;
grant select on public.event_venue_relationship_audit to authenticated;

-- Backfill all persisted D8 venue selections. This intentionally creates no
-- notifications; durable awareness begins with the client integration slice.
insert into public.event_venue_relationships (
  event_id, venue_id, organizer_organization_id, venue_organization_id,
  attribution_status, placement_status, request_source, requested_by,
  requested_at, decided_by, decided_at, decision_reason, created_at, updated_at
)
select
  event_row.id,
  venue.id,
  event_row.organizer_organization_id,
  venue.operator_organization_id,
  'uncontested',
  case event_row.venue_page_status
    when 'approved' then 'approved'
    when 'rejected' then 'declined'
    else 'requested'
  end,
  'migration',
  event_row.created_by,
  coalesce(event_row.created_at, now()),
  case when event_row.venue_page_status in ('approved', 'rejected') then event_row.created_by else null end,
  case when event_row.venue_page_status in ('approved', 'rejected') then event_row.updated_at else null end,
  case when event_row.venue_page_status in ('approved', 'rejected') then 'migrated legacy venue-page state' else null end,
  coalesce(event_row.created_at, now()),
  coalesce(event_row.updated_at, now())
from public.events event_row
join public.venues venue on venue.id = event_row.venue_id
where event_row.event_location_kind = 'd8_venue'
  and event_row.venue_id is not null
on conflict do nothing;

insert into public.event_venue_relationship_audit (
  relationship_id, event_id, venue_id, actor_user_id, actor_organization_id,
  action, previous_state, new_state, reason, policy_id, policy_version, created_at
)
select
  relationship.id, relationship.event_id, relationship.venue_id,
  relationship.requested_by, relationship.organizer_organization_id,
  'migrated', '{}'::jsonb, to_jsonb(relationship),
  'migrated from events.venue_page_status', relationship.policy_id,
  relationship.policy_version, relationship.created_at
from public.event_venue_relationships relationship
where relationship.request_source = 'migration'
  and not exists (
    select 1 from public.event_venue_relationship_audit audit
    where audit.relationship_id = relationship.id and audit.action = 'migrated'
  );

-- Align the temporary projection with the canonical backfill. Requested rows
-- remain absent from public venue pages because those queries require approved.
do $block$
declare
  relationship_row public.event_venue_relationships;
begin
  for relationship_row in
    select * from public.event_venue_relationships where is_active
  loop
    perform public.project_event_venue_page_status(
      relationship_row.event_id, relationship_row.placement_status,
      relationship_row.attribution_status
    );
  end loop;
end;
$block$;
