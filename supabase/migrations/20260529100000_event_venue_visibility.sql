-- Add explicit event location attribution and venue-page approval state.
-- Organizer-created events can reference an existing D8 venue without appearing
-- on that venue page until the venue owner or an admin approves the placement.

alter table public.events
  add column if not exists event_location_kind text not null default 'undisclosed',
  add column if not exists external_location_name text,
  add column if not exists external_location_address text,
  add column if not exists venue_page_status text not null default 'hidden';

alter table public.events
  drop constraint if exists events_event_location_kind_check;

alter table public.events
  add constraint events_event_location_kind_check
  check (event_location_kind in ('d8_venue', 'external', 'undisclosed'));

alter table public.events
  drop constraint if exists events_venue_page_status_check;

alter table public.events
  add constraint events_venue_page_status_check
  check (venue_page_status in ('hidden', 'requested', 'approved', 'rejected'));

alter table public.events
  drop constraint if exists events_location_shape_check;

alter table public.events
  add constraint events_location_shape_check
  check (
    (event_location_kind = 'd8_venue' and venue_id is not null)
    or (event_location_kind = 'external' and venue_id is null and external_location_name is not null)
    or (event_location_kind = 'undisclosed' and venue_id is null)
  );

create index if not exists events_venue_visibility_idx
  on public.events(venue_id, venue_page_status, starts_at)
  where venue_id is not null;

create or replace function public.set_event_venue_page_status(
  p_event_id uuid,
  p_status text
)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_event public.events;
begin
  if p_status not in ('approved', 'rejected', 'hidden') then
    raise exception 'Invalid venue page status: %', p_status
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.events e
    left join public.venues v on v.id = e.venue_id
    where e.id = p_event_id
      and e.venue_id is not null
      and (
        public.is_admin(auth.uid())
        or v.partner_id = auth.uid()
      )
  ) then
    raise exception 'Only admins or the venue owner can update venue page event visibility'
      using errcode = '42501';
  end if;

  update public.events
  set venue_page_status = p_status,
      updated_at = now()
  where id = p_event_id
  returning * into updated_event;

  return updated_event;
end;
$$;

revoke all on function public.set_event_venue_page_status(uuid, text) from public;
grant execute on function public.set_event_venue_page_status(uuid, text) to authenticated;
