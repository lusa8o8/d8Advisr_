begin;

create table public.countries (
  code text primary key,
  name text not null,
  continent_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint countries_code_iso_alpha2 check (code ~ '^[A-Z]{2}$'),
  constraint countries_continent_m49 check (continent_code ~ '^[0-9]{3}$'),
  constraint countries_name_not_blank check (btrim(name) <> '')
);

comment on table public.countries is
  'Small operational country catalog for configured D8 discovery markets; not a complete world geography import.';

create trigger set_countries_updated_at
before update on public.countries
for each row execute function public.set_updated_at();

insert into public.countries (code, name, continent_code, is_active) values
  ('NG', 'Nigeria', '002', true),
  ('ZM', 'Zambia', '002', true);

alter table public.regions
  add column slug text,
  add column administrative_area_code text,
  add column administrative_area_name text,
  add column updated_at timestamptz not null default now();

create trigger set_regions_updated_at
before update on public.regions
for each row execute function public.set_updated_at();

update public.regions
set slug = regexp_replace(
  regexp_replace(lower(btrim(name)), '[^a-z0-9]+', '-', 'g'),
  '(^-+|-+$)', '', 'g'
)
where slug is null;

update public.regions
set administrative_area_code = case id
      when 'lagos' then 'NG-LA'
      when 'lusaka' then 'ZM-09'
      else administrative_area_code
    end,
    administrative_area_name = case id
      when 'lagos' then 'Lagos State'
      when 'lusaka' then 'Lusaka Province'
      else administrative_area_name
    end
where id in ('lagos', 'lusaka');

do $validation$
begin
  if exists (
    select 1 from public.regions
    where slug is null or slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ) then
    raise exception 'Phase 4.7B refused: an existing market cannot be assigned a normalized slug';
  end if;

  if exists (
    select 1 from public.regions
    group by country_code, slug
    having count(*) > 1
  ) then
    raise exception 'Phase 4.7B refused: existing markets contain a country/slug collision';
  end if;

  if exists (
    select 1 from public.regions region
    left join public.countries country on country.code = region.country_code
    where country.code is null
  ) then
    raise exception 'Phase 4.7B refused: an existing market has an unknown country code';
  end if;

  if exists (
    select 1 from public.admin_access_assignments assignment
    left join public.countries country on country.code = assignment.country_code
    where assignment.country_code is not null and country.code is null
  ) then
    raise exception 'Phase 4.7B refused: a country-admin assignment has an unknown country code';
  end if;
end
$validation$;

alter table public.regions
  alter column slug set not null,
  add constraint regions_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  add constraint regions_administrative_area_code_format
    check (
      administrative_area_code is null
      or administrative_area_code ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$'
    ),
  add constraint regions_country_slug_unique unique (country_code, slug),
  add constraint regions_country_code_fkey foreign key (country_code)
    references public.countries(code) on update cascade on delete restrict;

alter table public.admin_access_assignments
  add constraint admin_access_assignments_country_code_fkey
  foreign key (country_code) references public.countries(code)
  on update cascade on delete restrict;

insert into public.regions (
  id,
  slug,
  name,
  country_code,
  administrative_area_code,
  administrative_area_name,
  currency_code,
  currency_symbol,
  timezone,
  is_live
) values
  ('zm-livingstone', 'livingstone', 'Livingstone', 'ZM', 'ZM-07', 'Southern Province', 'ZMW', 'K', 'Africa/Lusaka', false),
  ('zm-kitwe', 'kitwe', 'Kitwe', 'ZM', 'ZM-08', 'Copperbelt Province', 'ZMW', 'K', 'Africa/Lusaka', false),
  ('zm-ndola', 'ndola', 'Ndola', 'ZM', 'ZM-08', 'Copperbelt Province', 'ZMW', 'K', 'Africa/Lusaka', false),
  ('zm-siavonga', 'siavonga', 'Siavonga', 'ZM', 'ZM-07', 'Southern Province', 'ZMW', 'K', 'Africa/Lusaka', false);

alter table public.countries enable row level security;

create policy countries_public_active
on public.countries for select to anon, authenticated
using (is_active);

create policy countries_admin_manage
on public.countries for all to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

grant select on table public.countries to anon, authenticated;
grant insert, update, delete on table public.countries to authenticated;

comment on column public.regions.slug is
  'Country-scoped URL/display slug; never a foreign-key identity.';
comment on column public.regions.administrative_area_code is
  'Optional generic external subdivision code such as ISO 3166-2; not a product hierarchy.';
comment on column public.regions.administrative_area_name is
  'Optional administrative context label; discovery remains keyed by regions.id.';

commit;
