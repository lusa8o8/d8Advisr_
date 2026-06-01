create table if not exists public.venue_inspections (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  inspector_id uuid references public.profiles(id),
  atmosphere_score numeric(2,1) check (atmosphere_score >= 0 and atmosphere_score <= 5),
  lighting_score numeric(2,1) check (lighting_score >= 0 and lighting_score <= 5),
  noise_level text check (noise_level in ('quiet', 'moderate', 'lively', 'loud')),
  occasion_fit text[] not null default ARRAY[]::text[],
  inspector_notes text,
  inspected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venue_inspections_venue_inspected_idx
  on public.venue_inspections(venue_id, inspected_at desc);

alter table public.venue_inspections enable row level security;

drop policy if exists "Admins can manage venue inspections" on public.venue_inspections;
create policy "Admins can manage venue inspections"
  on public.venue_inspections for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop trigger if exists set_venue_inspections_updated_at on public.venue_inspections;
create trigger set_venue_inspections_updated_at
  before update on public.venue_inspections
  for each row execute procedure public.set_updated_at();

revoke all on public.venue_inspections from anon, authenticated;
grant select, insert, update, delete on public.venue_inspections to authenticated;
