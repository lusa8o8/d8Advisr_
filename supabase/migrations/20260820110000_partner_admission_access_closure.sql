-- Phase 4.6D: partner admission is an additive capability grant, not an
-- exclusive account scope. Keep application decisions and capability changes
-- behind auditable RPC boundaries.

alter table public.partner_applications
  add column if not exists region_id text references public.regions(id)
    on update cascade on delete restrict,
  add column if not exists review_reason text,
  add column if not exists internal_review_note text,
  add column if not exists reviewed_by uuid references public.profiles(id)
    on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists submitted_at timestamptz;

update public.partner_applications pa
set
  region_id = region.id,
  city = region.name,
  submitted_at = coalesce(pa.submitted_at, pa.created_at)
from public.regions region
where pa.region_id is null
  and (lower(region.id) = lower(pa.city) or lower(region.name) = lower(pa.city));

update public.partner_applications
set submitted_at = coalesce(submitted_at, created_at)
where submitted_at is null;

create index if not exists partner_applications_region_idx
  on public.partner_applications(region_id);

create or replace function public.live_partner_can(user_uuid uuid, capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when capability = 'events' then public.live_partner_type(user_uuid) in ('venue', 'organizer', 'both')
    when capability = 'venues' then public.live_partner_type(user_uuid) in ('venue', 'both')
    else false
  end;
$$;

drop policy if exists "Users can create own partner application" on public.partner_applications;
drop policy if exists "Users can update own partner application details" on public.partner_applications;

revoke insert, update on public.partner_applications from authenticated;

create or replace function public.submit_partner_application(
  p_name text,
  p_partner_type text,
  p_region_id text,
  p_contact text
)
returns public.partner_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  canonical_region public.regions;
  existing_application public.partner_applications;
  saved_application public.partner_applications;
begin
  if current_user_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  if public.is_admin_user() then
    raise exception 'Administrator accounts cannot submit partner applications'
      using errcode = '42501';
  end if;

  if p_partner_type not in ('venue', 'organizer', 'both') then
    raise exception 'Invalid partner type' using errcode = '22023';
  end if;

  if nullif(btrim(p_name), '') is null or nullif(btrim(p_contact), '') is null then
    raise exception 'Name and contact are required' using errcode = '22023';
  end if;

  select * into canonical_region
  from public.regions
  where id = p_region_id and is_live = true;

  if not found then
    raise exception 'Select an available D8 region' using errcode = '22023';
  end if;

  select * into existing_application
  from public.partner_applications
  where user_id = current_user_id
  for update;

  if found then
    if existing_application.status not in ('needs_update', 'rejected') then
      raise exception 'This application cannot be changed in its current state'
        using errcode = '55000';
    end if;

    update public.partner_applications
    set
      name = btrim(p_name),
      partner_type = p_partner_type,
      region_id = canonical_region.id,
      city = canonical_region.name,
      contact = btrim(p_contact),
      status = 'pending',
      review_reason = null,
      internal_review_note = null,
      reviewed_by = null,
      reviewed_at = null,
      submitted_at = now(),
      updated_at = now()
    where id = existing_application.id
    returning * into saved_application;
  else
    insert into public.partner_applications (
      user_id, name, partner_type, region_id, city, contact, status, submitted_at
    ) values (
      current_user_id,
      btrim(p_name),
      p_partner_type,
      canonical_region.id,
      canonical_region.name,
      btrim(p_contact),
      'pending',
      now()
    )
    returning * into saved_application;
  end if;

  return saved_application;
end;
$$;

revoke all on function public.submit_partner_application(text, text, text, text) from public;
grant execute on function public.submit_partner_application(text, text, text, text) to authenticated;

drop function if exists public.admin_update_partner_application_status(uuid, text);

create function public.admin_update_partner_application_status(
  application_id uuid,
  new_status text,
  p_review_reason text default null,
  p_internal_note text default null
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

  if new_status not in ('live', 'needs_update', 'rejected') then
    raise exception 'Invalid partner application status: %', new_status
      using errcode = '22023';
  end if;

  if new_status in ('needs_update', 'rejected')
    and nullif(btrim(p_review_reason), '') is null
  then
    raise exception 'A reason is required for this decision'
      using errcode = '22023';
  end if;

  update public.partner_applications
  set
    status = new_status,
    review_reason = case
      when new_status = 'live' then null
      else btrim(p_review_reason)
    end,
    internal_review_note = nullif(btrim(p_internal_note), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = application_id
  returning * into updated_application;

  if not found then
    raise exception 'Partner application not found: %', application_id
      using errcode = 'P0002';
  end if;

  update public.profiles
  set is_partner = (new_status = 'live'), updated_at = now()
  where id = updated_application.user_id;

  if new_status = 'live' then
    notification_title := 'Your partner account is approved';
    notification_body := 'Your D8 Partner tools are unlocked. Venue listings still follow their own review and publication lifecycle.';
  elsif new_status = 'needs_update' then
    notification_title := 'Application needs an update';
    notification_body := btrim(p_review_reason);
  else
    notification_title := 'Application not approved';
    notification_body := btrim(p_review_reason);
  end if;

  insert into public.partner_notifications (
    user_id, partner_application_id, type, title, body, metadata
  ) values (
    updated_application.user_id,
    updated_application.id,
    case when new_status = 'live' then 'approval' else 'review' end,
    notification_title,
    notification_body,
    jsonb_build_object(
      'status', new_status,
      'city', updated_application.city,
      'reviewed_at', updated_application.reviewed_at
    )
  );

  return updated_application;
end;
$$;

revoke all on function public.admin_update_partner_application_status(uuid, text, text, text) from public;
grant execute on function public.admin_update_partner_application_status(uuid, text, text, text) to authenticated;

comment on column public.partner_applications.internal_review_note is
  'Non-sensitive D8 operational note. Never store identity documents or secret credentials.';
