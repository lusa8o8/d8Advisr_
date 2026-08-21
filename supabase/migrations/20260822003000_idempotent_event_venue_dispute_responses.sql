-- Make an identical organizer dispute-response retry a no-op. This protects
-- immutable audit history and opposite-party notifications from duplicate
-- browser submissions while preserving explicit changed-response updates.

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

  -- Check retry equality before optimistic concurrency. A caller that did not
  -- receive the first response may safely repeat the same request with its old
  -- expected version without creating another transition or notification.
  if relationship_row.response_reason = btrim(p_response) then
    return to_jsonb(relationship_row);
  end if;

  if p_expected_version is not null and relationship_row.version <> p_expected_version then
    raise exception 'event_venue_relationship_conflict' using errcode = 'P0001';
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

revoke all on function public.respond_event_venue_dispute(uuid, text, bigint) from public, anon;
grant execute on function public.respond_event_venue_dispute(uuid, text, bigint) to authenticated;
