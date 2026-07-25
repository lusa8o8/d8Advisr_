-- Role isolation hardening for the drifted remote D8Advisr schema.
-- This migration is intentionally reconciliatory: the remote project already
-- contains some partner/admin columns, but not the intended policy model.

create extension if not exists "uuid-ossp";

-- The remote project already had this operational column when the original
-- hardening migration was authored. Declare it here as well so a clean local
-- rebuild does not depend on untracked remote schema drift.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

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

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid() limit 1),
    false
  );
$$;

create or replace function public.is_live_partner(user_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_applications pa
    where pa.user_id = user_uuid
      and pa.status = 'live'
  );
$$;

-- ---------------------------------------------------------------------------
-- Schema constraints and defaults
-- ---------------------------------------------------------------------------

alter table public.partner_applications
  alter column user_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_applications_user_id_key'
      and conrelid = 'public.partner_applications'::regclass
  ) then
    alter table public.partner_applications
      add constraint partner_applications_user_id_key unique (user_id);
  end if;
end;
$$;

alter table public.partner_applications
  drop constraint if exists partner_applications_status_check;

alter table public.partner_applications
  add constraint partner_applications_status_check
  check (status in ('pending', 'live', 'needs_update', 'rejected'));

alter table public.events
  drop constraint if exists events_event_status_check;

alter table public.events
  add constraint events_event_status_check
  check (event_status in ('draft', 'live', 'paused', 'past', 'cancelled'));

alter table public.venues
  alter column tier set default 'Verified',
  alter column is_hidden_gem set default false,
  alter column is_active set default true;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists set_partner_applications_updated_at on public.partner_applications;
create trigger set_partner_applications_updated_at
  before update on public.partner_applications
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants: keep client capabilities narrow, let RLS decide row ownership.
-- ---------------------------------------------------------------------------

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, username, display_name, avatar_url, city, budget_pref, vibe_prefs, created_at, updated_at)
  on public.profiles to authenticated;
grant update (username, display_name, avatar_url, city, budget_pref, vibe_prefs, updated_at)
  on public.profiles to authenticated;

revoke all on public.partner_applications from anon, authenticated;
grant select on public.partner_applications to authenticated;
grant insert (id, user_id, name, partner_type, city, contact, status, created_at, updated_at)
  on public.partner_applications to authenticated;
grant update (name, partner_type, city, contact, updated_at)
  on public.partner_applications to authenticated;

revoke all on public.events from anon, authenticated;
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;

revoke all on public.venues from anon, authenticated;
grant select on public.venues to anon, authenticated;
grant insert (
  id, name, slug, city, area, category, tier, price_tier, description, address,
  lat, lng, cover_image, images, vibes, rating, review_count, avg_cost_pp,
  open_hours, is_active, partner_id, created_at, updated_at
) on public.venues to authenticated;
grant update (
  name, slug, city, area, category, price_tier, description, address,
  lat, lng, cover_image, images, vibes, rating, review_count, avg_cost_pp,
  open_hours, is_active, partner_id, updated_at
) on public.venues to authenticated;
grant delete on public.venues to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles policies
-- ---------------------------------------------------------------------------

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Partner application policies
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can update applications" on public.partner_applications;
drop policy if exists "Admins can view all applications" on public.partner_applications;
drop policy if exists "Partners can manage their own application" on public.partner_applications;
drop policy if exists "Users can view own partner application" on public.partner_applications;
drop policy if exists "Users can create own partner application" on public.partner_applications;
drop policy if exists "Users can update own partner application details" on public.partner_applications;

create policy "Admins can view all applications"
  on public.partner_applications for select
  to authenticated
  using (public.is_admin_user());

create policy "Admins can update applications"
  on public.partner_applications for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "Users can view own partner application"
  on public.partner_applications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create own partner application"
  on public.partner_applications for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');

create policy "Users can update own partner application details"
  on public.partner_applications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Event policies
-- ---------------------------------------------------------------------------

drop policy if exists "Events are publicly viewable" on public.events;
drop policy if exists "Partners can manage their own events" on public.events;
drop policy if exists "Public can view live events" on public.events;
drop policy if exists "Live partners can insert own events" on public.events;
drop policy if exists "Live partners can update own events" on public.events;
drop policy if exists "Live partners can delete own events" on public.events;
drop policy if exists "Admins can manage events" on public.events;

create policy "Public can view live events"
  on public.events for select
  to anon, authenticated
  using (event_status = 'live');

create policy "Partners can view own events"
  on public.events for select
  to authenticated
  using (auth.uid() = partner_id);

create policy "Live partners can insert own events"
  on public.events for insert
  to authenticated
  with check (auth.uid() = partner_id and public.is_live_partner(auth.uid()));

create policy "Live partners can update own events"
  on public.events for update
  to authenticated
  using (auth.uid() = partner_id and public.is_live_partner(auth.uid()))
  with check (auth.uid() = partner_id and public.is_live_partner(auth.uid()));

create policy "Live partners can delete own events"
  on public.events for delete
  to authenticated
  using (auth.uid() = partner_id and public.is_live_partner(auth.uid()));

create policy "Admins can manage events"
  on public.events for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- ---------------------------------------------------------------------------
-- Venue policies
-- ---------------------------------------------------------------------------

drop policy if exists "Venues are publicly viewable" on public.venues;
drop policy if exists "Public can view active venues" on public.venues;
drop policy if exists "Partners can manage own venues" on public.venues;
drop policy if exists "Live partners can insert own venues" on public.venues;
drop policy if exists "Live partners can update own venues" on public.venues;
drop policy if exists "Live partners can delete own venues" on public.venues;
drop policy if exists "Admins can manage venues" on public.venues;

create policy "Public can view active venues"
  on public.venues for select
  to anon, authenticated
  using (is_active = true);

create policy "Live partners can insert own venues"
  on public.venues for insert
  to authenticated
  with check (
    auth.uid() = partner_id
    and public.is_live_partner(auth.uid())
    and tier = 'Verified'
    and coalesce(is_hidden_gem, false) = false
  );

create policy "Live partners can update own venues"
  on public.venues for update
  to authenticated
  using (auth.uid() = partner_id and public.is_live_partner(auth.uid()))
  with check (auth.uid() = partner_id and public.is_live_partner(auth.uid()));

create policy "Live partners can delete own venues"
  on public.venues for delete
  to authenticated
  using (auth.uid() = partner_id and public.is_live_partner(auth.uid()));

create policy "Admins can manage venues"
  on public.venues for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- ---------------------------------------------------------------------------
-- Existing owner-scoped policies with missing WITH CHECK clauses.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can manage own plans" on public.plans;
drop policy if exists "Users can view own plans" on public.plans;
drop policy if exists "Users can insert own plans" on public.plans;
drop policy if exists "Users can update own plans" on public.plans;
drop policy if exists "Users can delete own plans" on public.plans;
create policy "Users can manage own plans"
  on public.plans for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Plan stops visible to plan owners" on public.plan_stops;
drop policy if exists "Plan stops manageable by plan owners" on public.plan_stops;
create policy "Plan stops manageable by plan owners"
  on public.plan_stops for all
  to authenticated
  using (
    exists (
      select 1
      from public.plans
      where plans.id = plan_stops.plan_id
        and plans.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.plans
      where plans.id = plan_stops.plan_id
        and plans.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can manage own saved venues" on public.saved_venues;
drop policy if exists "Users can view own saved venues" on public.saved_venues;
drop policy if exists "Users can insert own saved venues" on public.saved_venues;
drop policy if exists "Users can delete own saved venues" on public.saved_venues;
create policy "Users can manage own saved venues"
  on public.saved_venues for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Indexes for policy predicates and partner lookups.
-- ---------------------------------------------------------------------------

create index if not exists partner_applications_user_id_idx
  on public.partner_applications(user_id);

create index if not exists events_partner_id_idx
  on public.events(partner_id);

create index if not exists events_status_starts_at_idx
  on public.events(event_status, starts_at);
