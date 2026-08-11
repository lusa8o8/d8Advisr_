-- Keep the admin policy out of anonymous query planning. The previous policy
-- applied to PUBLIC and directly queried profiles, causing public region reads
-- to fail at table-privilege evaluation before the live-region policy ran.

drop policy if exists "Admins can manage regions" on public.regions;

create policy "Admins can manage regions"
  on public.regions
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());
