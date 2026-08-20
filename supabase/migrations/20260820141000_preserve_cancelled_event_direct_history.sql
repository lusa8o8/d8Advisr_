-- Keep cancelled events reachable from durable notifications and direct links.
-- Ordinary discovery enforces the 24-hour window in its explicit query.
drop policy if exists "Public can view live and recent cancelled events" on public.events;
drop policy if exists "Public can view live and cancelled event history" on public.events;

create policy "Public can view live and cancelled event history"
  on public.events for select
  to anon, authenticated
  using (event_status in ('live', 'cancelled'));
