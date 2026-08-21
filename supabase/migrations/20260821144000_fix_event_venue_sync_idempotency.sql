-- A repeated attribution sync is a read-preserving no-op. Serialize by event
-- advisory key instead of retaining an event row lock across relationship and
-- compatibility-projection work, and avoid timestamp churn on unchanged rows.

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

  perform pg_advisory_xact_lock(hashtextextended('event_venue_relationship:' || p_event_id::text, 0));
  select * into event_row from public.events where id = p_event_id;
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
    if active_relationship.organizer_organization_id is distinct from event_row.organizer_organization_id
      or active_relationship.venue_organization_id is distinct from venue_row.operator_organization_id then
      update public.event_venue_relationships
      set organizer_organization_id = event_row.organizer_organization_id,
          venue_organization_id = venue_row.operator_organization_id,
          version = version + 1,
          updated_at = now()
      where id = active_relationship.id
      returning * into active_relationship;
    end if;
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

revoke all on function public.sync_event_venue_attribution(uuid, text) from public, anon;
grant execute on function public.sync_event_venue_attribution(uuid, text) to authenticated;
