-- Tighten partner capabilities at the database policy layer.
-- The UI already gates partner tools, but RLS must enforce the same split.

create or replace function public.live_partner_type(user_uuid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pa.partner_type::text
  from public.partner_applications pa
  where pa.user_id = user_uuid
    and pa.status = 'live'
  limit 1;
$$;

create or replace function public.live_partner_can(user_uuid uuid, capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when capability = 'events' then public.live_partner_type(user_uuid) in ('organizer', 'both')
    when capability = 'venues' then public.live_partner_type(user_uuid) in ('venue', 'both')
    else false
  end;
$$;

drop policy if exists "Live partners can insert own events" on public.events;
drop policy if exists "Live partners can update own events" on public.events;
drop policy if exists "Live partners can delete own events" on public.events;
drop policy if exists "Live event partners can insert own events" on public.events;
drop policy if exists "Live event partners can update own events" on public.events;
drop policy if exists "Live event partners can delete own events" on public.events;

create policy "Live event partners can insert own events"
  on public.events for insert
  to authenticated
  with check (
    auth.uid() = partner_id
    and public.live_partner_can(auth.uid(), 'events')
  );

create policy "Live event partners can update own events"
  on public.events for update
  to authenticated
  using (
    auth.uid() = partner_id
    and public.live_partner_can(auth.uid(), 'events')
  )
  with check (
    auth.uid() = partner_id
    and public.live_partner_can(auth.uid(), 'events')
  );

create policy "Live event partners can delete own events"
  on public.events for delete
  to authenticated
  using (
    auth.uid() = partner_id
    and public.live_partner_can(auth.uid(), 'events')
  );

drop policy if exists "Live partners can insert own venues" on public.venues;
drop policy if exists "Live partners can update own venues" on public.venues;
drop policy if exists "Live partners can delete own venues" on public.venues;
drop policy if exists "Live venue partners can insert own venues" on public.venues;
drop policy if exists "Live venue partners can update own venues" on public.venues;
drop policy if exists "Live venue partners can delete own venues" on public.venues;

create policy "Live venue partners can insert own venues"
  on public.venues for insert
  to authenticated
  with check (
    auth.uid() = partner_id
    and public.live_partner_can(auth.uid(), 'venues')
    and tier = 'Verified'
    and coalesce(is_hidden_gem, false) = false
  );

create policy "Live venue partners can update own venues"
  on public.venues for update
  to authenticated
  using (
    auth.uid() = partner_id
    and public.live_partner_can(auth.uid(), 'venues')
  )
  with check (
    auth.uid() = partner_id
    and public.live_partner_can(auth.uid(), 'venues')
  );

create policy "Live venue partners can delete own venues"
  on public.venues for delete
  to authenticated
  using (
    auth.uid() = partner_id
    and public.live_partner_can(auth.uid(), 'venues')
  );

revoke all on function public.live_partner_type(uuid) from public;
grant execute on function public.live_partner_type(uuid) to authenticated;

revoke all on function public.live_partner_can(uuid, text) from public;
grant execute on function public.live_partner_can(uuid, text) to authenticated;
