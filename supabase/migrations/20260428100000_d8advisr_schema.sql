-- D8Advisr core schema
-- Tables: profiles, venues, events, plans, plan_stops, stash_funds, stash_members

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique,
  display_name  text,
  avatar_url    text,
  city          text default 'Lagos',        -- 'Lagos' | 'Lusaka'
  budget_pref   integer default 150,         -- weekly date budget in USD
  vibe_prefs    text[] default '{}',         -- e.g. ['Romantic','Foodie']
  is_partner    boolean default false,       -- D8 Partner Portal flag
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Venues ──────────────────────────────────────────────────────────────────
create table if not exists public.venues (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text unique,
  city          text not null,              -- 'Lagos' | 'Lusaka'
  area          text,                       -- e.g. 'Victoria Island'
  category      text not null,             -- 'Restaurant' | 'Bar' | 'Activity' etc.
  tier          text not null,             -- 'Verified' | 'D8 Approved' | 'Hidden Gem'
  price_tier    text,                      -- '$' | '$$' | '$$$' | '$$$$'
  description   text,
  address       text,
  lat           double precision,
  lng           double precision,
  cover_image   text,
  images        text[] default '{}',
  vibes         text[] default '{}',       -- e.g. ['Romantic','Cozy']
  rating        numeric(3,2),
  review_count  integer default 0,
  avg_cost_pp   integer,                   -- average cost per person in USD
  open_hours    jsonb,                     -- {mon: '9:00-22:00', ...}
  is_active     boolean default true,
  is_hidden_gem boolean default false,
  partner_id    uuid references public.profiles(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.venues enable row level security;

create policy "Venues are publicly viewable"
  on public.venues for select using (is_active = true);

create policy "Partners can manage own venues"
  on public.venues for all using (auth.uid() = partner_id);

-- ─── Events ──────────────────────────────────────────────────────────────────
create table if not exists public.events (
  id            uuid primary key default uuid_generate_v4(),
  venue_id      uuid references public.venues(id) on delete cascade,
  title         text not null,
  description   text,
  category      text,
  vibes         text[] default '{}',
  cover_image   text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  price_pp      integer default 0,          -- price per person in USD cents
  currency      text default 'USD',
  capacity      integer,
  spots_left    integer,
  is_free       boolean default false,
  is_featured   boolean default false,
  city          text not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.events enable row level security;

create policy "Events are publicly viewable"
  on public.events for select using (true);

-- ─── Plans ───────────────────────────────────────────────────────────────────
create table if not exists public.plans (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid references public.profiles(id) on delete cascade,
  title         text not null,
  status        text default 'draft',       -- 'draft' | 'upcoming' | 'completed' | 'cancelled'
  date          date,
  time          text,                       -- e.g. '19:00'
  city          text,
  budget        integer,                    -- target budget in USD
  total_cost    integer,                    -- calculated total in USD cents
  vibes         text[] default '{}',
  notes         text,
  is_group      boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.plans enable row level security;

create policy "Users can manage own plans"
  on public.plans for all using (auth.uid() = owner_id);

-- Plan collaborators (for group plans)
create table if not exists public.plan_members (
  id        uuid primary key default uuid_generate_v4(),
  plan_id   uuid references public.plans(id) on delete cascade,
  user_id   uuid references public.profiles(id) on delete cascade,
  role      text default 'viewer',          -- 'owner' | 'editor' | 'viewer'
  joined_at timestamptz default now(),
  unique(plan_id, user_id)
);

alter table public.plan_members enable row level security;

create policy "Plan members can view their plans"
  on public.plan_members for select using (auth.uid() = user_id);

-- ─── Plan Stops ──────────────────────────────────────────────────────────────
create table if not exists public.plan_stops (
  id          uuid primary key default uuid_generate_v4(),
  plan_id     uuid references public.plans(id) on delete cascade,
  venue_id    uuid references public.venues(id),
  position    integer not null,             -- ordering within the plan
  label       text,                         -- e.g. 'Dinner', 'Pre-drinks'
  time        text,                         -- e.g. '19:00'
  cost_pp     integer default 0,            -- cost per person in USD cents
  is_free     boolean default false,
  transport   jsonb,                        -- {mode: 'walk'|'ride', duration: '10 min', cost: 5}
  notes       text,
  created_at  timestamptz default now()
);

alter table public.plan_stops enable row level security;

create policy "Plan stops visible to plan owners"
  on public.plan_stops for all
  using (
    exists (
      select 1 from public.plans
      where plans.id = plan_stops.plan_id
      and plans.owner_id = auth.uid()
    )
  );

-- ─── Stash Funds ─────────────────────────────────────────────────────────────
create table if not exists public.stash_funds (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid references public.profiles(id) on delete cascade,
  name          text not null,
  emoji         text default '💰',
  fund_type     text not null,              -- 'experience' | 'group' | 'anniversary' | 'milestone'
  goal          integer not null,           -- target amount in USD cents
  saved         integer default 0,          -- current saved amount in USD cents
  auto_save     integer default 0,          -- weekly auto-save amount in USD cents
  linked_plan   uuid references public.plans(id),
  linked_venue  uuid references public.venues(id),
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.stash_funds enable row level security;

create policy "Users can manage own stash funds"
  on public.stash_funds for all using (auth.uid() = owner_id);

-- Group stash members
create table if not exists public.stash_members (
  id            uuid primary key default uuid_generate_v4(),
  fund_id       uuid references public.stash_funds(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  contributed   integer default 0,          -- amount contributed in USD cents
  joined_at     timestamptz default now(),
  unique(fund_id, user_id)
);

alter table public.stash_members enable row level security;

create policy "Stash members can view their funds"
  on public.stash_members for select using (auth.uid() = user_id);

-- Stash contribution log
create table if not exists public.stash_transactions (
  id          uuid primary key default uuid_generate_v4(),
  fund_id     uuid references public.stash_funds(id) on delete cascade,
  user_id     uuid references public.profiles(id),
  amount      integer not null,             -- in USD cents, positive = deposit, negative = withdrawal
  label       text,
  tx_type     text default 'manual',        -- 'manual' | 'auto' | 'payout'
  created_at  timestamptz default now()
);

alter table public.stash_transactions enable row level security;

create policy "Users can view own transactions"
  on public.stash_transactions for select using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.stash_transactions for insert with check (auth.uid() = user_id);

-- ─── Saved / Wishlist ────────────────────────────────────────────────────────
create table if not exists public.saved_venues (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid references public.profiles(id) on delete cascade,
  venue_id  uuid references public.venues(id) on delete cascade,
  saved_at  timestamptz default now(),
  unique(user_id, venue_id)
);

alter table public.saved_venues enable row level security;

create policy "Users can manage own saved venues"
  on public.saved_venues for all using (auth.uid() = user_id);

-- ─── Updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_venues_updated_at before update on public.venues
  for each row execute procedure public.set_updated_at();
create trigger set_plans_updated_at before update on public.plans
  for each row execute procedure public.set_updated_at();
create trigger set_stash_funds_updated_at before update on public.stash_funds
  for each row execute procedure public.set_updated_at();

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists venues_city_idx on public.venues(city);
create index if not exists venues_tier_idx on public.venues(tier);
create index if not exists events_city_idx on public.events(city);
create index if not exists events_starts_at_idx on public.events(starts_at);
create index if not exists plans_owner_idx on public.plans(owner_id);
create index if not exists stash_funds_owner_idx on public.stash_funds(owner_id);
