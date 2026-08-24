begin;

-- Partner-created events belong to the market approved on the partner
-- application. Direct draft updates may not move an event between markets.
create or replace function public.enforce_partner_event_region_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  approved_region_id text;
begin
  if actor is null or public.is_admin_user() then return new; end if;

  if tg_op = 'INSERT' then
    select application.region_id into approved_region_id
    from public.partner_applications application
    where application.user_id = actor
      and application.status = 'live'
      and application.partner_type in ('venue', 'organizer', 'both')
    limit 1;

    if approved_region_id is null then
      raise exception 'partner_event_region_scope_required' using errcode = '42501';
    end if;
    if nullif(btrim(new.region_id), '') is null then
      raise exception 'region_id_required' using errcode = '22023';
    end if;
    if new.region_id is distinct from approved_region_id then
      raise exception 'partner_event_region_mismatch' using errcode = '42501';
    end if;
  elsif new.region_id is distinct from old.region_id then
    raise exception 'partner_event_region_change_not_allowed' using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function public.enforce_partner_event_region_scope() from public;
drop trigger if exists "00_enforce_partner_event_region_scope" on public.events;
create trigger "00_enforce_partner_event_region_scope"
before insert or update of region_id on public.events
for each row execute function public.enforce_partner_event_region_scope();

-- Keep linked D8 venues and events in the same discovery market regardless of
-- which trusted write path performs the change.
create or replace function public.enforce_event_venue_region_scope()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if new.event_location_kind = 'd8_venue' and (
    new.venue_id is null or not exists (
      select 1 from public.venues venue
      where venue.id = new.venue_id and venue.region_id = new.region_id
    )
  ) then
    raise exception 'event_venue_must_belong_to_selected_market' using errcode = '22023';
  end if;
  return new;
end;
$function$;

revoke all on function public.enforce_event_venue_region_scope() from public;
drop trigger if exists "01_enforce_event_venue_region_scope" on public.events;
create trigger "01_enforce_event_venue_region_scope"
before insert or update of region_id, event_location_kind, venue_id on public.events
for each row execute function public.enforce_event_venue_region_scope();

-- Wrap the mature admin draft validator and make the canonical market explicit.
alter function public.admin_update_draft_event(uuid, jsonb, timestamptz)
  rename to admin_update_draft_event_phase47c1_core;
revoke all on function public.admin_update_draft_event_phase47c1_core(uuid, jsonb, timestamptz)
  from public, anon, authenticated;

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
  old_event public.events;
  updated_event public.events;
  selected_region_id text;
begin
  if actor is null or not public.is_admin_user() then
    raise exception 'Only admins can edit D8 event drafts' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or not (p_payload ? 'region_id') then
    raise exception 'Event draft edit requires an explicit region_id' using errcode = '22023';
  end if;

  select * into old_event from public.events where id = p_event_id;
  if old_event.id is null then raise exception 'Event not found' using errcode = 'P0002'; end if;
  selected_region_id := public.resolve_listing_region_id(p_payload->>'region_id', null);

  if coalesce(p_payload->>'event_location_kind', old_event.event_location_kind) = 'd8_venue'
    and not exists (
      select 1 from public.venues venue
      where venue.id = coalesce(nullif(p_payload->>'venue_id','')::uuid, old_event.venue_id)
        and venue.region_id = selected_region_id
    ) then
    raise exception 'D8 venue must belong to the selected market' using errcode = '22023';
  end if;

  updated_event := public.admin_update_draft_event_phase47c1_core(
    p_event_id, p_payload - 'region_id' - 'currency', p_expected_updated_at
  );

  if updated_event.region_id is distinct from selected_region_id then
    update public.events set region_id = selected_region_id, updated_at = now()
    where id = p_event_id returning * into updated_event;

    update public.listing_admin_audit_log
    set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'region_id', selected_region_id,
      'previous_region_id', old_event.region_id
    )
    where id = (
      select audit.id from public.listing_admin_audit_log audit
      where audit.event_id = p_event_id and audit.actor_id = actor
        and audit.action = 'updated_draft'
      order by audit.created_at desc limit 1
    );
  end if;
  return updated_event;
end;
$function$;

revoke all on function public.admin_update_draft_event(uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.admin_update_draft_event(uuid, jsonb, timestamptz) to authenticated;

-- Preserve timestamp normalization and policy-v1.1 diffing as a private core.
-- A market move joins the same confirmation and immutable revision contract.
alter function public.admin_apply_event_revision_v11(uuid, jsonb, timestamptz, boolean, text)
  rename to admin_apply_event_revision_v11_phase47c1_core;
revoke all on function public.admin_apply_event_revision_v11_phase47c1_core(
  uuid, jsonb, timestamptz, boolean, text
) from public, anon, authenticated;

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
  old_event public.events;
  selected_region_id text;
  region_changed boolean;
  core_result jsonb;
  preview_result jsonb := '{}'::jsonb;
  revision_id uuid;
  recipient_count integer := 0;
  notification_count integer := 0;
  combined_changed text[];
  combined_material text[];
begin
  if actor is null or not public.is_admin_user() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or not (p_payload ? 'region_id') then
    raise exception 'Live event edit requires an explicit region_id' using errcode = '22023';
  end if;

  select * into old_event from public.events where id = p_event_id for update;
  if old_event.id is null then raise exception 'Event not found' using errcode = 'P0002'; end if;
  if old_event.updated_at is distinct from p_expected_updated_at then
    raise exception 'Event changed after it was loaded; refresh before saving' using errcode = '40001';
  end if;

  selected_region_id := public.resolve_listing_region_id(p_payload->>'region_id', null);
  region_changed := old_event.region_id is distinct from selected_region_id;

  if coalesce(p_payload->>'event_location_kind', old_event.event_location_kind) = 'd8_venue'
    and not exists (
      select 1 from public.venues venue
      where venue.id = coalesce(nullif(p_payload->>'venue_id','')::uuid, old_event.venue_id)
        and venue.region_id = selected_region_id
    ) then
    raise exception 'D8 venue must belong to the selected market' using errcode = '22023';
  end if;

  if region_changed and not p_confirmed then
    -- Preview the established classifier. If it would apply only non-material
    -- changes, deliberately roll its writes back inside this subtransaction.
    begin
      preview_result := public.admin_apply_event_revision_v11_phase47c1_core(
        p_event_id, p_payload - 'region_id', p_expected_updated_at, false, p_admin_reason
      );
      if preview_result->>'status' = 'applied' then
        raise exception 'phase47c2b_preview_rollback' using errcode = 'P0001';
      end if;
    exception when raise_exception then
      if sqlerrm <> 'phase47c2b_preview_rollback' then raise; end if;
    end;

    select count(distinct interest.user_id)::integer into recipient_count
    from public.event_interests interest
    where interest.event_id = p_event_id and interest.active = true;

    combined_changed := coalesce(
      array(select jsonb_array_elements_text(preview_result->'changed_fields')),
      array[]::text[]
    );
    combined_material := coalesce(
      array(select jsonb_array_elements_text(preview_result->'material_fields')),
      array[]::text[]
    );
    if not ('region_id' = any(combined_changed)) then combined_changed := array_append(combined_changed, 'region_id'); end if;
    if not ('region_id' = any(combined_material)) then combined_material := array_append(combined_material, 'region_id'); end if;

    return jsonb_build_object(
      'status', 'confirmation_required',
      'policy_id', 'partner-event-publishing-v1.1', 'policy_version', '1.1',
      'changed_fields', to_jsonb(combined_changed),
      'material_fields', to_jsonb(combined_material),
      'previous_values', coalesce(preview_result->'previous_values', '{}'::jsonb)
        || jsonb_build_object('region_id', old_event.region_id),
      'proposed_values', coalesce(preview_result->'proposed_values', '{}'::jsonb)
        || jsonb_build_object('region_id', selected_region_id),
      'interested_count', recipient_count
    );
  end if;

  core_result := public.admin_apply_event_revision_v11_phase47c1_core(
    p_event_id, p_payload - 'region_id', p_expected_updated_at, p_confirmed, p_admin_reason
  );

  if not region_changed then return core_result; end if;

  revision_id := nullif(core_result->>'revision_id','')::uuid;
  perform set_config('d8.event_revision_event_id', p_event_id::text, true);
  update public.events set region_id = selected_region_id, updated_at = now() where id = p_event_id;

  if revision_id is null then
    insert into public.event_revisions (
      event_id, status, risk_level, enforcement_code, rule_code,
      previous_values, proposed_values, changed_fields, submitted_by,
      organizer_reason, policy_id, policy_version, reviewed_by, reviewed_at
    ) values (
      p_event_id, 'applied', 'high', 'C', 'MATERIAL_CONFIRMED',
      jsonb_build_object('region_id', old_event.region_id),
      jsonb_build_object('region_id', selected_region_id),
      array['region_id'], actor, nullif(btrim(p_admin_reason), ''),
      'partner-event-publishing-v1.1', '1.1', actor, now()
    ) returning id into revision_id;

    notification_count := public.dispatch_event_change_notifications(
      p_event_id, revision_id, array['region_id'],
      jsonb_build_object('region_id', old_event.region_id),
      jsonb_build_object('region_id', selected_region_id)
    );
  else
    update public.event_revisions set
      previous_values = previous_values || jsonb_build_object('region_id', old_event.region_id),
      proposed_values = proposed_values || jsonb_build_object('region_id', selected_region_id),
      changed_fields = case when 'region_id' = any(changed_fields) then changed_fields else array_append(changed_fields, 'region_id') end,
      risk_level = 'high', enforcement_code = 'C', rule_code = 'MATERIAL_CONFIRMED'
    where id = revision_id;
    notification_count := coalesce((core_result->>'notification_count')::integer, 0);
  end if;

  combined_changed := coalesce(
    array(select jsonb_array_elements_text(core_result->'changed_fields')),
    array[]::text[]
  );
  combined_material := coalesce(
    array(select jsonb_array_elements_text(core_result->'material_fields')),
    array[]::text[]
  );
  if not ('region_id' = any(combined_changed)) then combined_changed := array_append(combined_changed, 'region_id'); end if;
  if not ('region_id' = any(combined_material)) then combined_material := array_append(combined_material, 'region_id'); end if;

  return core_result || jsonb_build_object(
    'status', 'applied', 'revision_id', revision_id,
    'changed_fields', to_jsonb(combined_changed),
    'material_fields', to_jsonb(combined_material),
    'notification_count', notification_count,
    'message', 'Confirmed changes are live'
  );
end;
$function$;

revoke all on function public.admin_apply_event_revision_v11(uuid, jsonb, timestamptz, boolean, text)
  from public, anon;
grant execute on function public.admin_apply_event_revision_v11(uuid, jsonb, timestamptz, boolean, text)
  to authenticated;

-- Partner live revisions carry explicit market scope, but partner accounts may
-- not move an already-created event between markets.
alter function public.partner_apply_event_revision_v11(uuid, jsonb, timestamptz, boolean, text)
  rename to partner_apply_event_revision_v11_phase47c1_core;
revoke all on function public.partner_apply_event_revision_v11_phase47c1_core(
  uuid, jsonb, timestamptz, boolean, text
) from public, anon, authenticated;

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
  target_event public.events;
  selected_region_id text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or not (p_payload ? 'region_id') then
    raise exception 'partner_live_event_region_id_required' using errcode = '22023';
  end if;
  select * into target_event from public.events where id = p_event_id;
  if target_event.id is null then raise exception 'Event not found' using errcode = 'P0002'; end if;
  selected_region_id := public.resolve_listing_region_id(p_payload->>'region_id', null);
  if selected_region_id is distinct from target_event.region_id then
    raise exception 'partner_event_region_change_not_allowed' using errcode = '42501';
  end if;
  return public.partner_apply_event_revision_v11_phase47c1_core(
    p_event_id, p_payload - 'region_id', p_expected_updated_at,
    p_confirmed, p_organizer_reason
  );
end;
$function$;

revoke all on function public.partner_apply_event_revision_v11(
  uuid, jsonb, timestamptz, boolean, text
) from public, anon;
grant execute on function public.partner_apply_event_revision_v11(
  uuid, jsonb, timestamptz, boolean, text
) to authenticated;

commit;
