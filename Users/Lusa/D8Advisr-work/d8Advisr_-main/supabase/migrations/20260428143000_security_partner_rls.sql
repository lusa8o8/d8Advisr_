-- Security hardening and partner feature schema alignment.
-- This migration is additive so it can be applied after the original generated schema.

create extension if not exists "uuid-ossp";

create table if not exists public.partner_applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  partner_type text not null check (partner_type in ('venue', 'organizer', 'both')),
  city text not null,
  contact text not null,
  status text not null default 'pending' check (status in ('pending', 'live', 'needs_update', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.events
  add column if not exists partner_id uuid references public.profiles(id) on delete set null,
  add column if not exists frequency text,
  add column if not exists weekday text,
  add column if not exists next_occurrence text,
  add column if not exists spots_total integer not null default 0,
  add column if not exists spots_filled integer not null default 0,
  add column if not exists emoji text,
  add column if not exists event_status text not null default 'live',
  add column if not exists updated_at timestamptz not null default now();

alter table public.events
  drop constraint if exists events_event_status_check;

alter table public.events
  add constraint events_event_status_check
  check (event_status in ('draft', 'live', 'paused', 'past', 'cancelled'));

alter table public.partner_applications enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.is_live_partner(user_uuid uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_applications
    where user_id = user_uuid
      and status = 'live'
  );
$$;

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Venues are publicly viewable" on public.venues;
drop policy if exists "Partners can manage own venues" on public.venues;
create policy "Public can view active venues"
  on public.venues for select
  using (is_active = true);
create policy "Live partners can insert own venues"
  on public.venues for insert
  with check (auth.uid() = partner_id and public.is_live_partner(auth.uid()));
create policy "Live partners can update own venues"
  on public.venues for update
  using (auth.uid() = partner_id and public.is_live_partner(auth.uid()))
  with check (auth.uid() = partner_id and public.is_live_partner(auth.uid()));
create policy "Live partners can delete own venues"
  on public.venues for delete
  using (auth.uid() = partner_id and public.is_live_partner(auth.uid()));

drop policy if exists "Events are publicly viewable" on public.events;
create policy "Public can view live events"
  on public.events for select
  using (event_status = 'live' or auth.uid() = partner_id);
create policy "Live partners can insert own events"
  on public.events for insert
  with check (auth.uid() = partner_id and public.is_live_partner(auth.uid()));
create policy "Live partners can update own events"
  on public.events for update
  using (auth.uid() = partner_id and public.is_live_partner(auth.uid()))
  with check (auth.uid() = partner_id and public.is_live_partner(auth.uid()));
create policy "Live partners can delete own events"
  on public.events for delete
  using (auth.uid() = partner_id and public.is_live_partner(auth.uid()));

drop policy if exists "Users can manage own plans" on public.plans;
create policy "Users can view own plans"
  on public.plans for select
  using (auth.uid() = owner_id);
create policy "Users can insert own plans"
  on public.plans for insert
  with check (auth.uid() = owner_id);
create policy "Users can update own plans"
  on public.plans for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
create policy "Users can delete own plans"
  on public.plans for delete
  using (auth.uid() = owner_id);

drop policy if exists "Plan stops visible to plan owners" on public.plan_stops;
create policy "Plan stops manageable by plan owners"
  on public.plan_stops for all
  using (
    exists (
      select 1 from public.plans
      where plans.id = plan_stops.plan_id
        and plans.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plans
      where plans.id = plan_stops.plan_id
        and plans.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can manage own stash funds" on public.stash_funds;
create policy "Users can view own stash funds"
  on public.stash_funds for select
  using (auth.uid() = owner_id);
create policy "Users can insert own stash funds"
  on public.stash_funds for insert
  with check (auth.uid() = owner_id);
create policy "Users can update own stash funds"
  on public.stash_funds for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
create policy "Users can delete own stash funds"
  on public.stash_funds for delete
  using (auth.uid() = owner_id);

drop policy if exists "Users can manage own saved venues" on public.saved_venues;
create policy "Users can view own saved venues"
  on public.saved_venues for select
  using (auth.uid() = user_id);
create policy "Users can insert own saved venues"
  on public.saved_venues for insert
  with check (auth.uid() = user_id);
create policy "Users can delete own saved venues"
  on public.saved_venues for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own partner application" on public.partner_applications;
drop policy if exists "Users can create own partner application" on public.partner_applications;
drop policy if exists "Users can update own partner application details" on public.partner_applications;
create policy "Users can view own partner application"
  on public.partner_applications for select
  using (auth.uid() = user_id);
create policy "Users can create own partner application"
  on public.partner_applications for insert
  with check (auth.uid() = user_id and status = 'pending');
create policy "Users can update own partner application details"
  on public.partner_applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke update on public.partner_applications from anon, authenticated;
grant select, insert on public.partner_applications to authenticated;
grant update (name, partner_type, city, contact, updated_at) on public.partner_applications to authenticated;

drop trigger if exists set_partner_applications_updated_at on public.partner_applications;
create trigger set_partner_applications_updated_at
  before update on public.partner_applications
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

create index if not exists partner_applications_user_id_idx
  on public.partner_applications(user_id);
create index if not exists events_partner_id_idx
  on public.events(partner_id);
create index if not exists events_status_starts_at_idx
  on public.events(event_status, starts_at);
