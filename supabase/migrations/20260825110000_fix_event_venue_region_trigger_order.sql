begin;

-- PostgreSQL runs triggers with the same timing/event alphabetically. The
-- first C2B name (`01_...`) ran before `a_sync_event_reference_fields`, while
-- the legacy admin creation core still derives NEW.region_id from city in
-- that sync trigger. Run the invariant after both canonical reference
-- triggers (`a_...`, `b_...`) so it validates the normalized row.
drop trigger if exists "01_enforce_event_venue_region_scope" on public.events;
drop trigger if exists "c_enforce_event_venue_region_scope" on public.events;

create trigger "c_enforce_event_venue_region_scope"
before insert or update of region_id, event_location_kind, venue_id on public.events
for each row execute function public.enforce_event_venue_region_scope();

commit;
