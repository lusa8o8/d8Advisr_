create table if not exists public.partner_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_application_id uuid references public.partner_applications(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint partner_notifications_type_check
    check (type in ('system', 'approval', 'action', 'review'))
);

alter table public.partner_notifications enable row level security;

revoke all on public.partner_notifications from anon, authenticated;
grant select on public.partner_notifications to authenticated;
grant update (read_at) on public.partner_notifications to authenticated;

drop policy if exists "Partners can view own notifications" on public.partner_notifications;
drop policy if exists "Partners can mark own notifications read" on public.partner_notifications;
drop policy if exists "Admins can view partner notifications" on public.partner_notifications;

create policy "Partners can view own notifications"
  on public.partner_notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "Partners can mark own notifications read"
  on public.partner_notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins can view partner notifications"
  on public.partner_notifications for select
  to authenticated
  using (public.is_admin_user());

create index if not exists partner_notifications_user_created_idx
  on public.partner_notifications(user_id, created_at desc);

create index if not exists partner_notifications_unread_idx
  on public.partner_notifications(user_id)
  where read_at is null;

insert into public.partner_notifications (
  user_id,
  partner_application_id,
  type,
  title,
  body,
  metadata
)
select
  pa.user_id,
  pa.id,
  'approval',
  'Your listing is live',
  'Your listing is live. You''re now appearing in D8Advisr searches for ' || split_part(pa.city, ',', 1) || '.',
  jsonb_build_object('status', 'live', 'city', pa.city)
from public.partner_applications pa
where pa.status = 'live'
  and not exists (
    select 1
    from public.partner_notifications pn
    where pn.partner_application_id = pa.id
      and pn.type = 'approval'
      and pn.metadata ->> 'status' = 'live'
  );

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
  notification_title text;
  notification_body text;
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

  if new_status = 'live' then
    notification_title := 'Your listing is live';
    notification_body := 'Your listing is live. You''re now appearing in D8Advisr searches for ' || split_part(updated_application.city, ',', 1) || '.';
  elsif new_status = 'needs_update' then
    notification_title := 'Application needs an update';
    notification_body := 'The D8 team needs more information before your partner tools can go live.';
  elsif new_status = 'rejected' then
    notification_title := 'Application not approved';
    notification_body := 'The D8 team reviewed your partner application and could not approve it yet.';
  end if;

  if notification_title is not null
    and not exists (
      select 1
      from public.partner_notifications pn
      where pn.partner_application_id = updated_application.id
        and pn.metadata ->> 'status' = new_status
    )
  then
    insert into public.partner_notifications (
      user_id,
      partner_application_id,
      type,
      title,
      body,
      metadata
    )
    values (
      updated_application.user_id,
      updated_application.id,
      case when new_status = 'live' then 'approval' else 'review' end,
      notification_title,
      notification_body,
      jsonb_build_object('status', new_status, 'city', updated_application.city)
    );
  end if;

  return updated_application;
end;
$$;

revoke all on function public.admin_update_partner_application_status(uuid, text) from public;
grant execute on function public.admin_update_partner_application_status(uuid, text) to authenticated;
