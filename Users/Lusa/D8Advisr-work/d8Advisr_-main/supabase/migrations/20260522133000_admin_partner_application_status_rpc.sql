create or replace function public.admin_update_partner_application_status(
  application_id uuid,
  new_status text
)
returns public.partner_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_application public.partner_applications;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can update partner application status'
      using errcode = '42501';
  end if;

  if new_status not in ('pending', 'live', 'needs_update', 'rejected') then
    raise exception 'Invalid partner application status: %', new_status
      using errcode = '22023';
  end if;

  update public.partner_applications
  set
    status = new_status,
    updated_at = now()
  where id = application_id
  returning * into updated_application;

  if not found then
    raise exception 'Partner application not found: %', application_id
      using errcode = 'P0002';
  end if;

  update public.profiles
  set
    is_partner = (new_status = 'live'),
    updated_at = now()
  where id = updated_application.user_id;

  return updated_application;
end;
$$;

revoke all on function public.admin_update_partner_application_status(uuid, text) from public;
grant execute on function public.admin_update_partner_application_status(uuid, text) to authenticated;
