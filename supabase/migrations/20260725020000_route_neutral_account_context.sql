-- Keep account identity in PostgreSQL while leaving client URL decisions to
-- each independently deployed application.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

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

create or replace function public.get_current_account_context()
returns table (
  scope text,
  partner_status text,
  partner_type text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  admin_access boolean := false;
  partner public.partner_applications;
begin
  if current_user_id is null then
    return query select 'anonymous'::text, null::text, null::text;
    return;
  end if;

  select coalesce(p.is_admin, false)
  into admin_access
  from public.profiles p
  where p.id = current_user_id;

  if admin_access then
    return query select 'admin'::text, null::text, null::text;
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
      partner.status::text,
      partner.partner_type::text;
    return;
  end if;

  return query select 'consumer'::text, null::text, null::text;
end;
$$;

revoke all on function public.get_current_account_context() from public;
grant execute on function public.get_current_account_context() to authenticated;

-- Restore the hardened trigger definition after the display-name backfill
-- migration replaced it without a fixed search_path or conflict handling.
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
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
