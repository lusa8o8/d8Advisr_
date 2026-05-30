alter table public.venues
  add column if not exists listing_status text not null default 'draft',
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists reverification_reason text,
  add column if not exists last_verified_at timestamptz,
  add column if not exists next_verification_due_at timestamptz;

alter table public.venues
  drop constraint if exists venues_listing_status_check;

alter table public.venues
  add constraint venues_listing_status_check
  check (listing_status in ('draft', 'submitted', 'under_review', 'live', 'needs_update', 'hidden'));

alter table public.venues
  drop constraint if exists venues_verification_status_check;

alter table public.venues
  add constraint venues_verification_status_check
  check (verification_status in ('unverified', 'verified', 'reverify_required', 'expired'));

update public.venues
set
  listing_status = case when is_active then 'live' else 'draft' end,
  verification_status = case when is_active then 'verified' else 'unverified' end,
  last_verified_at = case when is_active and last_verified_at is null then coalesce(updated_at, created_at, now()) else last_verified_at end
where listing_status = 'draft'
  and verification_status = 'unverified';

create table if not exists public.venue_reverification_tasks (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  reason text not null,
  status text not null default 'open',
  triggered_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  notes text,
  constraint venue_reverification_tasks_status_check
    check (status in ('open', 'in_progress', 'resolved', 'dismissed'))
);

create index if not exists venue_reverification_tasks_venue_status_idx
  on public.venue_reverification_tasks(venue_id, status);

alter table public.venue_reverification_tasks enable row level security;

drop policy if exists "Admins can manage venue reverification tasks" on public.venue_reverification_tasks;
create policy "Admins can manage venue reverification tasks"
  on public.venue_reverification_tasks for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Venue partners can view own reverification tasks" on public.venue_reverification_tasks;
create policy "Venue partners can view own reverification tasks"
  on public.venue_reverification_tasks for select
  to authenticated
  using (
    exists (
      select 1
      from public.venues v
      where v.id = venue_id
        and v.partner_id = auth.uid()
    )
  );

create table if not exists public.venue_change_log (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  changed_by uuid references public.profiles(id),
  field_name text not null,
  old_value text,
  new_value text,
  risk_level text not null default 'low',
  applied_immediately boolean not null default true,
  created_reverification boolean not null default false,
  reverification_reason text,
  created_at timestamptz not null default now(),
  constraint venue_change_log_risk_check check (risk_level in ('low', 'high'))
);

create index if not exists venue_change_log_venue_created_idx
  on public.venue_change_log(venue_id, created_at desc);

alter table public.venue_change_log enable row level security;

drop policy if exists "Admins can manage venue change log" on public.venue_change_log;
create policy "Admins can manage venue change log"
  on public.venue_change_log for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Venue partners can view own change log" on public.venue_change_log;
create policy "Venue partners can view own change log"
  on public.venue_change_log for select
  to authenticated
  using (
    exists (
      select 1
      from public.venues v
      where v.id = venue_id
        and v.partner_id = auth.uid()
    )
  );

create or replace function public.venue_reverification_reason(
  old_venue public.venues,
  new_venue public.venues
)
returns text
language plpgsql
stable
as $$
begin
  if old_venue.name is distinct from new_venue.name then
    return 'name_changed';
  end if;
  if old_venue.address is distinct from new_venue.address
     or old_venue.lat is distinct from new_venue.lat
     or old_venue.lng is distinct from new_venue.lng then
    return 'address_changed';
  end if;
  if old_venue.category is distinct from new_venue.category then
    return 'category_changed';
  end if;
  if old_venue.price_tier is distinct from new_venue.price_tier
     or old_venue.avg_cost_pp is distinct from new_venue.avg_cost_pp then
    return 'price_changed';
  end if;
  if old_venue.cover_image is distinct from new_venue.cover_image
     or old_venue.images is distinct from new_venue.images then
    return 'sensitive_field_changed';
  end if;
  return null;
end;
$$;

create or replace function public.apply_venue_partner_safety()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reason text;
  actor uuid := auth.uid();
begin
  if public.is_admin_user() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_active := false;
    new.listing_status := 'draft';
    new.verification_status := 'unverified';
    new.reverification_reason := null;
    new.last_verified_at := null;
    new.next_verification_due_at := null;
    new.tier := 'Verified';
    new.is_hidden_gem := false;
    return new;
  end if;

  reason := public.venue_reverification_reason(old, new);

  new.partner_id := old.partner_id;
  new.tier := old.tier;
  new.is_hidden_gem := old.is_hidden_gem;
  new.listing_status := old.listing_status;
  new.is_active := old.is_active;
  new.last_verified_at := old.last_verified_at;
  new.next_verification_due_at := old.next_verification_due_at;

  if reason is not null then
    new.verification_status := 'reverify_required';
    new.reverification_reason := reason;

    insert into public.venue_reverification_tasks (venue_id, reason, triggered_by)
    values (old.id, reason, actor);
  else
    new.verification_status := old.verification_status;
    new.reverification_reason := old.reverification_reason;
  end if;

  return new;
end;
$$;

drop trigger if exists apply_venue_partner_safety on public.venues;
create trigger apply_venue_partner_safety
  before insert or update on public.venues
  for each row
  execute function public.apply_venue_partner_safety();

create or replace function public.admin_update_venue_listing_status(
  venue_id uuid,
  new_status text,
  reason text default null
)
returns public.venues
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_venue public.venues;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can update venue listing status';
  end if;

  if new_status not in ('draft', 'submitted', 'under_review', 'live', 'needs_update', 'hidden') then
    raise exception 'Invalid venue listing status: %', new_status;
  end if;

  update public.venues
  set
    listing_status = new_status,
    is_active = (new_status = 'live'),
    verification_status = case
      when new_status = 'live' then 'verified'
      when new_status in ('needs_update', 'hidden') then 'reverify_required'
      else verification_status
    end,
    reverification_reason = case
      when new_status = 'live' then null
      when reason is not null then reason
      else reverification_reason
    end,
    last_verified_at = case when new_status = 'live' then now() else last_verified_at end,
    next_verification_due_at = case when new_status = 'live' then now() + interval '6 months' else next_verification_due_at end,
    updated_at = now()
  where id = venue_id
  returning * into updated_venue;

  if updated_venue.id is null then
    raise exception 'Venue not found';
  end if;

  if new_status in ('needs_update', 'hidden') then
    insert into public.venue_reverification_tasks (venue_id, reason, triggered_by)
    values (venue_id, coalesce(reason, 'admin_flag'), auth.uid());
  end if;

  return updated_venue;
end;
$$;

drop policy if exists "Public can view active venues" on public.venues;
create policy "Public can view live venues"
  on public.venues for select
  to anon, authenticated
  using (is_active = true and listing_status = 'live');

drop policy if exists "Venue partners can view own venues" on public.venues;
create policy "Venue partners can view own venues"
  on public.venues for select
  to authenticated
  using (auth.uid() = partner_id and public.live_partner_can(auth.uid(), 'venues'));

drop policy if exists "Admins can view all venues" on public.venues;
create policy "Admins can view all venues"
  on public.venues for select
  to authenticated
  using (public.is_admin_user());

revoke all on public.venues from anon, authenticated;
grant select on public.venues to anon, authenticated;
grant insert (
  id, name, slug, city, area, category, price_tier, description, address,
  lat, lng, cover_image, images, vibes, rating, review_count, avg_cost_pp,
  open_hours, partner_id, created_at, updated_at
) on public.venues to authenticated;
grant update (
  name, slug, city, area, category, price_tier, description, address,
  lat, lng, cover_image, images, vibes, rating, review_count, avg_cost_pp,
  open_hours, updated_at
) on public.venues to authenticated;
grant delete on public.venues to authenticated;

revoke all on public.venue_reverification_tasks from anon, authenticated;
grant select on public.venue_reverification_tasks to authenticated;
grant insert, update, delete on public.venue_reverification_tasks to authenticated;

revoke all on public.venue_change_log from anon, authenticated;
grant select on public.venue_change_log to authenticated;
grant insert, update, delete on public.venue_change_log to authenticated;

revoke all on function public.venue_reverification_reason(public.venues, public.venues) from public;
revoke all on function public.apply_venue_partner_safety() from public;
revoke all on function public.admin_update_venue_listing_status(uuid, text, text) from public;
grant execute on function public.admin_update_venue_listing_status(uuid, text, text) to authenticated;

create index if not exists venues_listing_visibility_idx
  on public.venues(city, listing_status, is_active);

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
    notification_title := 'Your partner account is approved';
    notification_body := 'Your D8 Partner tools are unlocked. Complete your venue listing so D8 can review it before it appears publicly.';
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

update public.partner_notifications
set
  title = 'Your partner account is approved',
  body = 'Your D8 Partner tools are unlocked. Complete your venue listing so D8 can review it before it appears publicly.'
where title = 'Your listing is live'
  and metadata ->> 'status' = 'live';
