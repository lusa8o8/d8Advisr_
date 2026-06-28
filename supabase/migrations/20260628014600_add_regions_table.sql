-- Create regions table
create table public.regions (
  id text primary key,
  name text not null,
  country_code text not null,
  currency_code text not null,
  currency_symbol text not null,
  timezone text not null,
  is_live boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.regions enable row level security;

-- Allow public read access to live regions
create policy "Public can view live regions"
  on public.regions
  for select
  using (is_live = true);

-- Allow admins full access
create policy "Admins can manage regions"
  on public.regions
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Seed initial data
insert into public.regions (id, name, country_code, currency_code, currency_symbol, timezone, is_live)
values 
  ('lagos', 'Lagos', 'NG', 'NGN', '₦', 'Africa/Lagos', true),
  ('lusaka', 'Lusaka', 'ZM', 'ZMW', 'K', 'Africa/Lusaka', true);
