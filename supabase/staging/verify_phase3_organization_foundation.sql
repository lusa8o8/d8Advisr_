-- Run after the Phase 3 migration is explicitly applied to staging.
-- Read-only postconditions: no fixture or production data is changed.

begin;

do $$
declare
  secured_relation text;
  secured_function text;
begin
  foreach secured_relation in array array[
    'partner_organizations',
    'partner_organization_memberships',
    'partner_organization_claims'
  ] loop
    if to_regclass('public.' || secured_relation) is null then
      raise exception 'Missing Phase 3 table: %', secured_relation;
    end if;

    if not exists (
      select 1
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = secured_relation
        and relation.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', secured_relation;
    end if;
  end loop;

  if not exists (
    select 1
    from public.partner_organizations
    where id = '00000000-0000-4000-8000-00000000d800'::uuid
      and name = 'D8Advisr'
      and organization_type = 'platform'
      and status = 'active'
  ) then
    raise exception 'Deterministic D8Advisr platform organization is missing or invalid';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'venues'
      and column_name = 'operator_organization_id' and is_nullable = 'YES'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events'
      and column_name = 'organizer_organization_id' and is_nullable = 'YES'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'partner_applications'
      and column_name = 'organization_id' and is_nullable = 'YES'
  ) then
    raise exception 'Nullable compatibility organization columns are incomplete';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'venues' and column_name = 'partner_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'partner_id'
  ) then
    raise exception 'Legacy partner_id compatibility columns were removed';
  end if;

  foreach secured_function in array array[
    'is_active_organization_member',
    'organization_member_role',
    'organization_can',
    'is_claimable_organization',
    'can_manage_venue',
    'can_manage_event',
    'protect_listing_organization_fields'
  ] loop
    if not exists (
      select 1
      from pg_proc function_row
      join pg_namespace namespace on namespace.oid = function_row.pronamespace
      where namespace.nspname = 'public'
        and function_row.proname = secured_function
        and function_row.prosecdef
        and array_to_string(function_row.proconfig, ',') like '%search_path=public%'
    ) then
      raise exception 'Missing hardened security-definer function: %', secured_function;
    end if;
  end loop;

  if has_table_privilege('anon', 'public.partner_organizations', 'select')
    or has_table_privilege('anon', 'public.partner_organization_memberships', 'select')
    or has_table_privilege('anon', 'public.partner_organization_claims', 'select') then
    raise exception 'Anonymous role unexpectedly has organization table access';
  end if;

  if has_column_privilege('authenticated', 'public.partner_organizations', 'contact', 'select')
    or has_column_privilege('authenticated', 'public.partner_organization_claims', 'review_notes', 'select')
    or has_column_privilege('authenticated', 'public.venues', 'created_by', 'select')
    or has_column_privilege('authenticated', 'public.events', 'created_by', 'select') then
    raise exception 'Private organization columns are exposed to authenticated clients';
  end if;

  if has_table_privilege('authenticated', 'public.partner_organization_memberships', 'insert')
    or has_table_privilege('authenticated', 'public.partner_organization_memberships', 'update')
    or has_table_privilege('authenticated', 'public.partner_organization_claims', 'update') then
    raise exception 'Authenticated clients can directly grant membership or decide claims';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'venues'
      and policyname = 'Live venue partners can update own venues'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events'
      and policyname = 'Live event partners can update own events'
  ) or to_regprocedure('public.live_partner_can(uuid,text)') is null then
    raise exception 'Legacy partner authorization was changed during additive Phase 3';
  end if;
end;
$$;

rollback;
