begin;

-- A live admin revision can change both the discovery market and linked D8
-- venue in one transaction. The revision core writes the location fields
-- before the market wrapper writes region_id, so an immediate row trigger
-- observes a temporary (but never committed) mismatch. Validate the final
-- event row at transaction end instead.
drop trigger if exists "01_enforce_event_venue_region_scope" on public.events;
drop trigger if exists "c_enforce_event_venue_region_scope" on public.events;
drop trigger if exists "event_venue_region_scope_final" on public.events;

create or replace function public.enforce_event_venue_region_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  final_event record;
begin
  select
    event.event_location_kind,
    event.venue_id,
    event.region_id
  into final_event
  from public.events event
  where event.id = new.id;

  -- An event removed later in the same transaction has no remaining
  -- venue/market invariant to enforce.
  if not found then
    return null;
  end if;

  if final_event.event_location_kind = 'd8_venue' and (
    final_event.venue_id is null or not exists (
      select 1
      from public.venues venue
      where venue.id = final_event.venue_id
        and venue.region_id = final_event.region_id
    )
  ) then
    raise exception 'event_venue_must_belong_to_selected_market' using errcode = '22023';
  end if;

  return null;
end;
$function$;

revoke all on function public.enforce_event_venue_region_scope() from public;

create constraint trigger "event_venue_region_scope_final"
after insert or update of region_id, event_location_kind, venue_id on public.events
deferrable initially deferred
for each row execute function public.enforce_event_venue_region_scope();

commit;
