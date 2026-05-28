create or replace function public.get_current_account_scope()
returns table (
  scope text,
  home_path text,
  partner_status text,
  partner_type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean := false;
  partner public.partner_applications;
begin
  if current_user_id is null then
    return query select 'anonymous'::text, '/'::text, null::text, null::text;
    return;
  end if;

  select coalesce(p.is_admin, false)
  into is_admin
  from public.profiles p
  where p.id = current_user_id;

  if is_admin then
    return query select 'admin'::text, '/admin'::text, null::text, null::text;
    return;
  end if;

  select *
  into partner
  from public.partner_applications pa
  where pa.user_id = current_user_id
  limit 1;

  if found then
    return query select
      'partner'::text,
      case when partner.status = 'live' then '/partner/dashboard' else '/partner' end::text,
      partner.status::text,
      partner.partner_type::text;
    return;
  end if;

  return query select 'consumer'::text, '/home'::text, null::text, null::text;
end;
$$;

revoke all on function public.get_current_account_scope() from public;
grant execute on function public.get_current_account_scope() to authenticated;
