-- Add the organization ownership model without cutting over legacy partner_id
-- authorization. Existing policies, functions, triggers, and clients remain
-- authoritative until the explicit Phase 6 reconciliation and cutover.

create table public.partner_organizations (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null check (length(btrim(name)) > 0),
  organization_type text not null check (
    organization_type in ('venue_operator', 'event_organizer', 'both', 'platform')
  ),
  status text not null default 'unclaimed' check (
    status in ('unclaimed', 'pending', 'active', 'suspended', 'archived')
  ),
  contact text,
  city text,
  created_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_organizations_verification_pair check (
    (verified_at is null and verified_by is null)
    or verified_at is not null
  )
);

create table public.partner_organization_memberships (
  id uuid primary key default extensions.uuid_generate_v4(),
  organization_id uuid not null references public.partner_organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('primary_owner', 'owner', 'manager', 'editor')),
  status text not null default 'invited' check (
    status in ('invited', 'active', 'suspended', 'revoked')
  ),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_organization_memberships_user_key unique (organization_id, user_id),
  constraint partner_organization_memberships_dates check (
    (status = 'active' and granted_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
    or status in ('invited', 'suspended')
  )
);

create unique index partner_organization_one_active_primary_owner_idx
  on public.partner_organization_memberships(organization_id)
  where role = 'primary_owner' and status = 'active';

create table public.partner_organization_claims (
  id uuid primary key default extensions.uuid_generate_v4(),
  organization_id uuid not null references public.partner_organizations(id) on delete restrict,
  claimant_user_id uuid not null references public.profiles(id) on delete cascade,
  source_venue_id uuid references public.venues(id) on delete set null,
  requested_role text not null default 'primary_owner' check (
    requested_role in ('primary_owner', 'manager')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'cancelled', 'disputed')
  ),
  evidence jsonb not null default '{}'::jsonb,
  review_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_organization_claims_review_pair check (
    (status in ('pending', 'cancelled') and reviewed_by is null and reviewed_at is null)
    or (status in ('approved', 'rejected', 'disputed') and reviewed_by is not null and reviewed_at is not null)
  )
);

create unique index partner_organization_one_active_claim_idx
  on public.partner_organization_claims(organization_id, claimant_user_id)
  where status in ('pending', 'disputed');

create index partner_organization_memberships_user_idx
  on public.partner_organization_memberships(user_id, status);
create index partner_organization_claims_claimant_idx
  on public.partner_organization_claims(claimant_user_id, status);
create index partner_organization_claims_status_idx
  on public.partner_organization_claims(status, created_at desc);

alter table public.partner_applications
  add column organization_id uuid references public.partner_organizations(id) on delete set null;

alter table public.venues
  add column operator_organization_id uuid references public.partner_organizations(id) on delete set null,
  add column created_by uuid references public.profiles(id) on delete set null,
  add column source text check (source in ('d8_admin', 'partner', 'import', 'community'));

alter table public.events
  add column organizer_organization_id uuid references public.partner_organizations(id) on delete set null,
  add column created_by uuid references public.profiles(id) on delete set null,
  add column source text check (source in ('d8_admin', 'partner', 'import', 'community'));

create index partner_applications_organization_idx
  on public.partner_applications(organization_id);
create index venues_operator_organization_idx
  on public.venues(operator_organization_id);
create index events_organizer_organization_idx
  on public.events(organizer_organization_id);

insert into public.partner_organizations (
  id, name, organization_type, status, city, created_at, updated_at
)
values (
  '00000000-0000-4000-8000-00000000d800'::uuid,
  'D8Advisr',
  'platform',
  'active',
  null,
  now(),
  now()
)
on conflict (id) do nothing;

create or replace function public.is_active_organization_member(
  organization_uuid uuid,
  user_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when user_uuid is null then false
    when user_uuid <> auth.uid() and not public.is_admin_user() then false
    else exists (
      select 1
      from public.partner_organization_memberships membership
      join public.partner_organizations organization
        on organization.id = membership.organization_id
      where membership.organization_id = organization_uuid
        and membership.user_id = user_uuid
        and membership.status = 'active'
        and organization.status = 'active'
    )
  end;
$$;

create or replace function public.organization_member_role(
  organization_uuid uuid,
  user_uuid uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when user_uuid is null then null
    when user_uuid <> auth.uid() and not public.is_admin_user() then null
    else (
      select membership.role
      from public.partner_organization_memberships membership
      where membership.organization_id = organization_uuid
        and membership.user_id = user_uuid
        and membership.status = 'active'
      limit 1
    )
  end;
$$;

create or replace function public.organization_can(
  organization_uuid uuid,
  capability text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_organizations organization
    where organization.id = organization_uuid
      and organization.status = 'active'
      and case
        when capability = 'venues' then organization.organization_type in ('venue_operator', 'both')
        when capability = 'events' then organization.organization_type in ('event_organizer', 'both')
        else false
      end
  );
$$;

create or replace function public.is_claimable_organization(
  organization_uuid uuid,
  source_venue_uuid uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_organizations organization
    where organization.id = organization_uuid
      and organization.status in ('unclaimed', 'pending')
      and organization.organization_type <> 'platform'
      and (
        source_venue_uuid is null
        or exists (
          select 1
          from public.venues venue
          where venue.id = source_venue_uuid
            and venue.operator_organization_id = organization.id
        )
      )
  );
$$;

create or replace function public.can_manage_venue(
  venue_uuid uuid,
  user_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.venues venue
    where venue.id = venue_uuid
      and venue.operator_organization_id is not null
      and public.is_active_organization_member(venue.operator_organization_id, user_uuid)
      and public.organization_can(venue.operator_organization_id, 'venues')
  );
$$;

create or replace function public.can_manage_event(
  event_uuid uuid,
  user_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events event_row
    where event_row.id = event_uuid
      and event_row.organizer_organization_id is not null
      and public.is_active_organization_member(event_row.organizer_organization_id, user_uuid)
      and public.organization_can(event_row.organizer_organization_id, 'events')
  );
$$;

revoke all on function public.is_active_organization_member(uuid, uuid) from public;
revoke all on function public.organization_member_role(uuid, uuid) from public;
revoke all on function public.organization_can(uuid, text) from public;
revoke all on function public.is_claimable_organization(uuid, uuid) from public;
revoke all on function public.can_manage_venue(uuid, uuid) from public;
revoke all on function public.can_manage_event(uuid, uuid) from public;

grant execute on function public.is_active_organization_member(uuid, uuid) to authenticated;
grant execute on function public.organization_member_role(uuid, uuid) to authenticated;
grant execute on function public.organization_can(uuid, text) to authenticated;
grant execute on function public.is_claimable_organization(uuid, uuid) to authenticated;
grant execute on function public.can_manage_venue(uuid, uuid) to authenticated;
grant execute on function public.can_manage_event(uuid, uuid) to authenticated;

create or replace function public.protect_listing_organization_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  organization_column text := case when tg_table_name = 'venues'
    then 'operator_organization_id'
    else 'organizer_organization_id'
  end;
begin
  if tg_op = 'INSERT' and caller_id is not null and not public.is_admin_user() then
    new.created_by := caller_id;
    new.source := 'partner';
    if organization_column = 'operator_organization_id' then
      new.operator_organization_id := null;
    else
      new.organizer_organization_id := null;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and caller_id is not null then
    new.created_by := old.created_by;
    new.source := old.source;
    if not public.is_admin_user() then
      if organization_column = 'operator_organization_id' then
        new.operator_organization_id := old.operator_organization_id;
      else
        new.organizer_organization_id := old.organizer_organization_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_listing_organization_fields() from public;

drop trigger if exists protect_venue_organization_fields on public.venues;
create trigger protect_venue_organization_fields
  before insert or update on public.venues
  for each row execute procedure public.protect_listing_organization_fields();

drop trigger if exists protect_event_organization_fields on public.events;
create trigger protect_event_organization_fields
  before insert or update on public.events
  for each row execute procedure public.protect_listing_organization_fields();

drop trigger if exists set_partner_organizations_updated_at on public.partner_organizations;
create trigger set_partner_organizations_updated_at
  before update on public.partner_organizations
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_partner_organization_memberships_updated_at on public.partner_organization_memberships;
create trigger set_partner_organization_memberships_updated_at
  before update on public.partner_organization_memberships
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_partner_organization_claims_updated_at on public.partner_organization_claims;
create trigger set_partner_organization_claims_updated_at
  before update on public.partner_organization_claims
  for each row execute procedure public.set_updated_at();

alter table public.partner_organizations enable row level security;
alter table public.partner_organization_memberships enable row level security;
alter table public.partner_organization_claims enable row level security;

create policy "Admins can manage partner organizations"
  on public.partner_organizations for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "Members can view active organizations"
  on public.partner_organizations for select
  to authenticated
  using (public.is_active_organization_member(id, auth.uid()));

create policy "Admins can manage organization memberships"
  on public.partner_organization_memberships for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "Users can view own organization memberships"
  on public.partner_organization_memberships for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can view organization claims"
  on public.partner_organization_claims for select
  to authenticated
  using (public.is_admin_user());

create policy "Users can view own organization claims"
  on public.partner_organization_claims for select
  to authenticated
  using (claimant_user_id = auth.uid());

create policy "Users can submit organization claims"
  on public.partner_organization_claims for insert
  to authenticated
  with check (
    claimant_user_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and public.is_claimable_organization(organization_id, source_venue_id)
  );

revoke all on public.partner_organizations from anon, authenticated;
grant select (
  id, name, organization_type, status, city, created_by, verified_at,
  verified_by, created_at, updated_at
) on public.partner_organizations to authenticated;

revoke all on public.partner_organization_memberships from anon, authenticated;
grant select on public.partner_organization_memberships to authenticated;

revoke all on public.partner_organization_claims from anon, authenticated;
grant select (
  id, organization_id, claimant_user_id, source_venue_id, requested_role,
  status, evidence, reviewed_by, reviewed_at, created_at, updated_at
) on public.partner_organization_claims to authenticated;
grant insert (
  organization_id, claimant_user_id, source_venue_id, requested_role, evidence
) on public.partner_organization_claims to authenticated;

-- Existing table-level SELECT grants would expose the new created_by audit
-- columns through select('*'). Replace them with explicit client-safe columns.
revoke select on public.venues from anon, authenticated;
grant select (
  id, name, slug, city, area, category, tier, price_tier, description, address,
  lat, lng, cover_image, images, vibes, rating, review_count, avg_cost_pp,
  open_hours, is_active, is_hidden_gem, listing_status, verification_status,
  reverification_reason, last_verified_at, next_verification_due_at, partner_id,
  operator_organization_id, source, created_at, updated_at
) on public.venues to anon, authenticated;

revoke select on public.events from anon, authenticated;
grant select (
  id, venue_id, partner_id, title, description, category, vibes, cover_image,
  images, starts_at, ends_at, price_pp, currency, capacity, spots_left, is_free,
  is_featured, city, event_location_kind, external_location_name,
  external_location_address, venue_page_status, frequency, weekday,
  next_occurrence, spots_total, spots_filled, emoji, event_status,
  organizer_organization_id, source, created_at, updated_at
) on public.events to anon, authenticated;
