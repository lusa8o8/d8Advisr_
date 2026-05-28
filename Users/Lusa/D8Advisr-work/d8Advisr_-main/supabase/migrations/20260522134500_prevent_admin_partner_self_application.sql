drop policy if exists "Users can create own partner application" on public.partner_applications;
drop policy if exists "Users can update own partner application details" on public.partner_applications;

create policy "Users can create own partner application"
  on public.partner_applications for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and not public.is_admin_user()
  );

create policy "Users can update own partner application details"
  on public.partner_applications for update
  to authenticated
  using (
    auth.uid() = user_id
    and not public.is_admin_user()
  )
  with check (
    auth.uid() = user_id
    and not public.is_admin_user()
  );
