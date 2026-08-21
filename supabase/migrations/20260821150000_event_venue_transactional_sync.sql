-- Phase 4.6D4 slice two: venue placement is server-owned and canonical
-- attribution follows every persisted event location change transactionally.

create or replace function public.derive_event_venue_page_projection()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  authorized_event_id text := nullif(current_setting('d8.event_venue_placement_event_id', true), '');
  relationship_row public.event_venue_relationships;
  venue_row public.venues;
  same_organization boolean := false;
  same_legacy_owner boolean := false;
begin
  if tg_op = 'UPDATE' and authorized_event_id = old.id::text then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and new.event_location_kind is not distinct from old.event_location_kind
    and new.venue_id is not distinct from old.venue_id
    and new.organizer_organization_id is not distinct from old.organizer_organization_id
    and new.partner_id is not distinct from old.partner_id then
    new.venue_page_status := old.venue_page_status;
    return new;
  end if;

  if new.event_location_kind <> 'd8_venue' or new.venue_id is null then
    new.venue_page_status := 'hidden';
    return new;
  end if;

  if tg_op = 'UPDATE' and new.venue_id = old.venue_id then
    select * into relationship_row
    from public.event_venue_relationships
    where event_id = new.id and venue_id = new.venue_id and is_active;
  end if;

  if relationship_row.id is not null then
    new.venue_page_status := case
      when relationship_row.attribution_status in ('disputed', 'resolved_invalid', 'withdrawn') then 'hidden'
      when relationship_row.placement_status = 'approved' then 'approved'
      when relationship_row.placement_status = 'requested' then 'requested'
      when relationship_row.placement_status = 'declined' then 'rejected'
      else 'hidden'
    end;
    return new;
  end if;

  select * into venue_row from public.venues where id = new.venue_id;
  if not found then
    new.venue_page_status := 'requested';
    return new;
  end if;

  same_organization := new.organizer_organization_id is not null
    and new.organizer_organization_id = venue_row.operator_organization_id;
  same_legacy_owner := new.organizer_organization_id is null
    and venue_row.operator_organization_id is null
    and new.partner_id is not null
    and new.partner_id = venue_row.partner_id;
  new.venue_page_status := case
    when same_organization or same_legacy_owner then 'approved'
    else 'requested'
  end;
  return new;
end;
$function$;

revoke all on function public.derive_event_venue_page_projection() from public, anon, authenticated;

drop trigger if exists c_derive_event_venue_page_projection on public.events;
create trigger c_derive_event_venue_page_projection
  before insert or update on public.events
  for each row execute function public.derive_event_venue_page_projection();

create or replace function public.sync_persisted_event_venue_attribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_op = 'UPDATE'
    and new.event_location_kind is not distinct from old.event_location_kind
    and new.venue_id is not distinct from old.venue_id
    and new.organizer_organization_id is not distinct from old.organizer_organization_id
    and new.partner_id is not distinct from old.partner_id then
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  perform public.sync_event_venue_attribution(
    new.id,
    case when tg_op = 'INSERT' then 'event location created' else 'event location changed' end
  );
  return new;
end;
$function$;

revoke all on function public.sync_persisted_event_venue_attribution() from public, anon, authenticated;

drop trigger if exists sync_event_venue_attribution_after_insert on public.events;
create trigger sync_event_venue_attribution_after_insert
  after insert on public.events
  for each row execute function public.sync_persisted_event_venue_attribution();

drop trigger if exists sync_event_venue_attribution_after_location_update on public.events;
create trigger sync_event_venue_attribution_after_location_update
  after update of event_location_kind, venue_id, organizer_organization_id, partner_id
  on public.events
  for each row execute function public.sync_persisted_event_venue_attribution();

alter function public.partner_apply_event_revision_v11(uuid, jsonb, timestamptz, boolean, text)
  rename to partner_apply_event_revision_v11_venue_legacy_core;

revoke all on function public.partner_apply_event_revision_v11_venue_legacy_core(
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
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid event revision request' using errcode = '22023';
  end if;
  if p_payload ? 'venue_page_status' then
    raise exception 'event_venue_placement_is_server_managed' using errcode = '42501';
  end if;

  return public.partner_apply_event_revision_v11_venue_legacy_core(
    p_event_id, p_payload, p_expected_updated_at, p_confirmed,
    p_organizer_reason
  );
end;
$function$;

revoke all on function public.partner_apply_event_revision_v11(
  uuid, jsonb, timestamptz, boolean, text
) from public, anon;
grant execute on function public.partner_apply_event_revision_v11(
  uuid, jsonb, timestamptz, boolean, text
) to authenticated;
