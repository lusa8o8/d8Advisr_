-- Add future country/region admin scopes without changing current authorization.

create table public.admin_access_assignments (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('platform_admin', 'country_admin', 'region_admin')),
  country_code text,
  region_id text references public.regions(id) on update cascade on delete restrict,
  is_active boolean not null default true,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (role = 'platform_admin' and country_code is null and region_id is null)
    or (role = 'country_admin' and country_code is not null and region_id is null)
    or (role = 'region_admin' and country_code is null and region_id is not null)
  ),
  check (country_code is null or country_code ~ '^[A-Z]{2}$')
);

create unique index admin_access_platform_unique
  on public.admin_access_assignments(user_id) where role = 'platform_admin';
create unique index admin_access_country_unique
  on public.admin_access_assignments(user_id, country_code) where role = 'country_admin';
create unique index admin_access_region_unique
  on public.admin_access_assignments(user_id, region_id) where role = 'region_admin';

insert into public.admin_access_assignments (user_id, role, granted_by)
select profile.id, 'platform_admin', profile.id
from public.profiles profile
where coalesce(profile.is_admin, false)
on conflict do nothing;

create or replace function public.is_platform_admin(user_uuid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $function$
  select coalesce(exists (
    select 1 from public.admin_access_assignments assignment
    join public.profiles profile on profile.id = assignment.user_id
    where assignment.user_id = user_uuid
      and assignment.role = 'platform_admin'
      and assignment.is_active
      and profile.is_admin
  ), false);
$function$;

create or replace function public.admin_can_access_region(
  region_value text,
  user_uuid uuid default auth.uid()
)
returns boolean
language sql stable security definer set search_path = public as $function$
  select coalesce(exists (
    select 1
    from public.admin_access_assignments assignment
    join public.profiles profile on profile.id = assignment.user_id
    left join public.regions region on region.id = region_value
    where assignment.user_id = user_uuid
      and assignment.is_active
      and profile.is_admin
      and (
        assignment.role = 'platform_admin'
        or (assignment.role = 'region_admin' and assignment.region_id = region_value)
        or (assignment.role = 'country_admin' and assignment.country_code = region.country_code)
      )
  ), false);
$function$;

revoke all on function public.is_platform_admin(uuid) from public;
revoke all on function public.admin_can_access_region(text, uuid) from public;
grant execute on function public.is_platform_admin(uuid) to authenticated;
grant execute on function public.admin_can_access_region(text, uuid) to authenticated;

alter table public.admin_access_assignments enable row level security;
revoke all on public.admin_access_assignments from anon, authenticated;
grant select, insert, update, delete on public.admin_access_assignments to authenticated;

create policy admins_view_relevant_access_assignments
on public.admin_access_assignments for select to authenticated
using (user_id = auth.uid() or public.is_platform_admin());

create policy platform_admins_create_access_assignments
on public.admin_access_assignments for insert to authenticated
with check (public.is_platform_admin());

create policy platform_admins_update_access_assignments
on public.admin_access_assignments for update to authenticated
using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy platform_admins_delete_access_assignments
on public.admin_access_assignments for delete to authenticated
using (public.is_platform_admin());

create trigger set_admin_access_assignments_updated_at
before update on public.admin_access_assignments
for each row execute function public.set_updated_at();
