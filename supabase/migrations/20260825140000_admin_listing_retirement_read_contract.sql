-- Retirement-aware read contract for all listing surfaces.
-- Admins can inspect retirement metadata; operational/public and partner reads
-- cannot see retired rows.

grant select (retired_at, retired_by, retirement_reason, retired_from_status)
  on public.venues to authenticated;
grant select (retired_at, retired_by, retirement_reason, retired_from_status)
  on public.events to authenticated;

drop policy if exists "Public can view live venues" on public.venues;
create policy "Public can view live venues"
  on public.venues for select
  to anon, authenticated
  using (
    retired_at is null
    and is_active = true
    and listing_status = 'live'
  );

drop policy if exists "Venue partners can view own venues" on public.venues;
create policy "Venue partners can view own venues"
  on public.venues for select
  to authenticated
  using (
    retired_at is null
    and auth.uid() = partner_id
    and public.live_partner_can(auth.uid(), 'venues')
  );

drop policy if exists "Public can view live and cancelled event history" on public.events;
create policy "Public can view live and cancelled event history"
  on public.events for select
  to anon, authenticated
  using (
    retired_at is null
    and event_status in ('live', 'cancelled')
  );

drop policy if exists "Partners can view own events" on public.events;
create policy "Partners can view own events"
  on public.events for select
  to authenticated
  using (
    retired_at is null
    and auth.uid() = partner_id
  );
