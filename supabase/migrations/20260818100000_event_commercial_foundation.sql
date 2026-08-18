-- Phase 4.6A: preserve the commercial promise made at first publication.

alter table public.events
  drop constraint if exists events_price_pp_nonnegative,
  drop constraint if exists events_free_entry_price_zero;

alter table public.events
  alter column price_pp type numeric(12,2) using price_pp::numeric(12,2),
  alter column price_pp set default 0;

comment on column public.events.price_pp is
  'Mandatory entry price in major currency units, with at most two decimal places.';

alter table public.events
  add column if not exists first_published_at timestamptz,
  add column if not exists initial_published_is_free boolean,
  add column if not exists initial_published_price numeric(12,2),
  add column if not exists initial_published_currency text,
  add column if not exists commercial_policy_id text,
  add column if not exists commercial_policy_version text,
  add column if not exists commercial_baseline_source text;

alter table public.events
  add constraint events_commercial_baseline_source_check check (
    commercial_baseline_source is null
    or commercial_baseline_source in ('first_publication', 'legacy_backfill')
  ) not valid;

create table public.event_commercial_migration_exceptions (
  id uuid primary key default extensions.uuid_generate_v4(),
  event_id uuid references public.events(id) on delete set null,
  reason text not null,
  previous_status text,
  event_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

alter table public.event_commercial_migration_exceptions enable row level security;
revoke all on public.event_commercial_migration_exceptions from anon, authenticated;
grant select, update (resolved_at, resolved_by) on public.event_commercial_migration_exceptions to authenticated;

create policy admin_view_event_commercial_migration_exceptions
on public.event_commercial_migration_exceptions for select to authenticated
using (public.is_admin_user());

create policy admin_resolve_event_commercial_migration_exceptions
on public.event_commercial_migration_exceptions for update to authenticated
using (public.is_admin_user()) with check (public.is_admin_user());

insert into public.event_commercial_migration_exceptions (
  event_id, reason, previous_status, event_snapshot
)
select
  event_row.id,
  'live_paid_event_requires_positive_price',
  event_row.event_status,
  jsonb_build_object(
    'title', event_row.title,
    'is_free', event_row.is_free,
    'price_pp', event_row.price_pp,
    'currency', event_row.currency,
    'partner_id', event_row.partner_id,
    'organizer_organization_id', event_row.organizer_organization_id
  )
from public.events event_row
where event_row.event_status = 'live'
  and not coalesce(event_row.is_free, false)
  and coalesce(event_row.price_pp, 0) <= 0;

-- Do not invent a price or silently call an invalid paid event free. It must be
-- corrected explicitly and then republished through the policy RPC.
update public.events
set event_status = 'draft'
where event_status = 'live'
  and not coalesce(is_free, false)
  and coalesce(price_pp, 0) <= 0;

update public.events
set
  first_published_at = coalesce(updated_at, created_at, now()),
  initial_published_is_free = coalesce(is_free, false),
  initial_published_price = price_pp,
  initial_published_currency = currency,
  commercial_policy_id = 'partner-event-publishing-v1.0',
  commercial_policy_version = '1.0',
  commercial_baseline_source = 'legacy_backfill'
where event_status = 'live'
  and first_published_at is null;

alter table public.events
  add constraint events_price_pp_nonnegative check (price_pp >= 0) not valid,
  add constraint events_price_pp_scale check (price_pp = round(price_pp, 2)) not valid,
  add constraint events_free_entry_price_zero check (not is_free or price_pp = 0) not valid,
  add constraint events_live_paid_price_positive check (
    event_status <> 'live' or is_free or price_pp > 0
  ) not valid,
  add constraint events_publication_baseline_complete check (
    first_published_at is null
    or (
      initial_published_is_free is not null
      and initial_published_price is not null
      and initial_published_currency is not null
      and commercial_policy_id is not null
      and commercial_policy_version is not null
      and commercial_baseline_source is not null
    )
  ) not valid;

alter table public.events validate constraint events_commercial_baseline_source_check;
alter table public.events validate constraint events_price_pp_nonnegative;
alter table public.events validate constraint events_price_pp_scale;
alter table public.events validate constraint events_free_entry_price_zero;
alter table public.events validate constraint events_live_paid_price_positive;
alter table public.events validate constraint events_publication_baseline_complete;

create table public.event_publication_acknowledgements (
  id uuid primary key default extensions.uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete restrict,
  organization_id uuid references public.partner_organizations(id) on delete set null,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  policy_id text not null,
  policy_version text not null,
  policy_content_hash text not null,
  request_key uuid not null,
  acknowledged_snapshot jsonb not null,
  acknowledged_at timestamptz not null default now(),
  source text not null check (source in ('partner', 'admin')),
  unique (actor_user_id, request_key)
);

create index event_publication_acknowledgements_event_idx
  on public.event_publication_acknowledgements(event_id, acknowledged_at desc);

alter table public.event_publication_acknowledgements enable row level security;
revoke all on public.event_publication_acknowledgements from anon, authenticated;
grant select on public.event_publication_acknowledgements to authenticated;

create policy event_publishers_view_acknowledgements
on public.event_publication_acknowledgements for select to authenticated
using (
  public.is_admin_user()
  or actor_user_id = auth.uid()
  or exists (
    select 1 from public.events event_row
    where event_row.id = event_id
      and (
        event_row.partner_id = auth.uid()
        or public.can_manage_event(event_row.id, auth.uid())
      )
  )
);

create or replace function public.enforce_event_attendance_contract()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  caller_id uuid := auth.uid();
begin
  new.spots_total := greatest(coalesce(new.spots_total, 0), 0);
  new.price_pp := coalesce(new.price_pp, 0);

  if new.price_pp < 0 then
    raise exception 'Event entry price cannot be negative' using errcode = '22023';
  end if;
  if new.price_pp <> round(new.price_pp, 2) then
    raise exception 'Event entry price supports at most two decimal places' using errcode = '22023';
  end if;
  if coalesce(new.is_free, false) then
    new.price_pp := 0;
  end if;
  if new.event_status = 'live' and not coalesce(new.is_free, false) and new.price_pp <= 0 then
    raise exception 'Paid live events require a positive entry price' using errcode = '22023';
  end if;

  if tg_op = 'INSERT' then
    if caller_id is not null and not public.is_admin_user() then
      new.spots_filled := 0;
    else
      new.spots_filled := greatest(coalesce(new.spots_filled, 0), 0);
    end if;
  else
    if caller_id is not null and not public.is_admin_user() then
      new.spots_filled := old.spots_filled;
    else
      new.spots_filled := greatest(coalesce(new.spots_filled, 0), 0);
    end if;
  end if;

  if new.spots_total > 0 and new.spots_filled > new.spots_total then
    raise exception 'Event capacity cannot be lower than preserved registrations'
      using errcode = '22023';
  end if;

  new.capacity := nullif(new.spots_total, 0);
  new.spots_left := null;
  return new;
end;
$function$;

create or replace function public.enforce_event_commercial_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  authorized_event_id text := nullif(current_setting('d8.event_publish_event_id', true), '');
begin
  if tg_op = 'INSERT' then
    if new.event_status = 'live' then
      raise exception 'event_publication_rpc_required' using errcode = '42501';
    end if;
    if new.first_published_at is not null
      or new.initial_published_is_free is not null
      or new.initial_published_price is not null
      or new.initial_published_currency is not null then
      raise exception 'event_publication_baseline_is_server_managed' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.first_published_at is not null then
    if new.first_published_at is distinct from old.first_published_at
      or new.initial_published_is_free is distinct from old.initial_published_is_free
      or new.initial_published_price is distinct from old.initial_published_price
      or new.initial_published_currency is distinct from old.initial_published_currency
      or new.commercial_policy_id is distinct from old.commercial_policy_id
      or new.commercial_policy_version is distinct from old.commercial_policy_version
      or new.commercial_baseline_source is distinct from old.commercial_baseline_source then
      raise exception 'event_publication_baseline_is_immutable' using errcode = '22023';
    end if;

    if coalesce(old.is_free, false) and not coalesce(new.is_free, false) then
      raise exception 'published_free_event_cannot_become_paid' using errcode = '22023';
    end if;
    if not coalesce(old.is_free, false)
      and not coalesce(new.is_free, false)
      and new.price_pp > old.price_pp then
      raise exception 'published_event_price_cannot_increase' using errcode = '22023';
    end if;
    if new.currency is distinct from old.currency then
      raise exception 'published_event_currency_is_immutable' using errcode = '22023';
    end if;
  elsif new.first_published_at is not null and authorized_event_id is distinct from new.id::text then
    raise exception 'event_publication_baseline_is_server_managed' using errcode = '42501';
  end if;

  if new.event_status = 'live'
    and old.event_status <> 'live'
    and authorized_event_id is distinct from new.id::text then
    raise exception 'event_publication_rpc_required' using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function public.enforce_event_commercial_integrity() from public;

drop trigger if exists zz_enforce_event_commercial_integrity on public.events;
create trigger zz_enforce_event_commercial_integrity
  before insert or update on public.events
  for each row execute function public.enforce_event_commercial_integrity();

create or replace function public.protect_published_event_deletion()
returns trigger language plpgsql security definer set search_path = public as $function$
begin
  if old.first_published_at is not null then
    raise exception 'published_event_history_cannot_be_deleted' using errcode = '22023';
  end if;
  return old;
end;
$function$;

revoke all on function public.protect_published_event_deletion() from public;
drop trigger if exists protect_published_event_deletion on public.events;
create trigger protect_published_event_deletion
  before delete on public.events
  for each row execute function public.protect_published_event_deletion();

create or replace function public.publish_event_with_policy(
  p_event_id uuid,
  p_policy_id text,
  p_policy_version text,
  p_acknowledged boolean,
  p_request_key uuid
)
returns public.events
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  event_row public.events;
  existing_ack public.event_publication_acknowledgements;
  source_value text;
  policy_hash constant text := '749f2d5c230588a3b540c5b69e774d816cfb79810ebc58d899b697a7d6fd226e';
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_request_key is null then
    raise exception 'publication_request_key_required' using errcode = '22023';
  end if;

  select * into event_row from public.events where id = p_event_id for update;
  if not found then raise exception 'event_not_found' using errcode = 'P0002'; end if;

  if public.is_admin_user() then
    source_value := 'admin';
  elsif event_row.partner_id = actor and public.live_partner_can(actor, 'events') then
    source_value := 'partner';
  elsif public.can_manage_event(event_row.id, actor) then
    source_value := 'partner';
  else
    raise exception 'event_management_required' using errcode = '42501';
  end if;

  if p_policy_id is distinct from 'partner-event-publishing-v1.0'
    or p_policy_version is distinct from '1.0' then
    raise exception 'unsupported_event_policy_version' using errcode = '22023';
  end if;
  if not coalesce(p_acknowledged, false) then
    raise exception 'event_policy_acknowledgement_required' using errcode = '22023';
  end if;
  if event_row.event_status in ('past', 'cancelled') then
    raise exception 'event_status_cannot_be_published' using errcode = '22023';
  end if;
  if coalesce(event_row.is_free, false) and event_row.price_pp <> 0 then
    raise exception 'free_event_price_must_be_zero' using errcode = '22023';
  end if;
  if not coalesce(event_row.is_free, false) and event_row.price_pp <= 0 then
    raise exception 'paid_event_price_must_be_positive' using errcode = '22023';
  end if;
  if event_row.currency is null or btrim(event_row.currency) = '' then
    raise exception 'event_currency_required' using errcode = '22023';
  end if;

  select * into existing_ack
  from public.event_publication_acknowledgements acknowledgement
  where acknowledgement.actor_user_id = actor
    and acknowledgement.request_key = p_request_key;

  if found and (
    existing_ack.event_id <> event_row.id
    or existing_ack.policy_id <> p_policy_id
    or existing_ack.policy_version <> p_policy_version
  ) then
    raise exception 'publication_request_key_conflict' using errcode = '23505';
  end if;

  if not found then
    insert into public.event_publication_acknowledgements (
      event_id, organization_id, actor_user_id, policy_id, policy_version,
      policy_content_hash, request_key, acknowledged_snapshot, source
    ) values (
      event_row.id, event_row.organizer_organization_id, actor, p_policy_id,
      p_policy_version, policy_hash, p_request_key,
      jsonb_build_object(
        'title', event_row.title,
        'starts_at', event_row.starts_at,
        'ends_at', event_row.ends_at,
        'region_id', event_row.region_id,
        'city', event_row.city,
        'location_kind', event_row.event_location_kind,
        'venue_id', event_row.venue_id,
        'external_location_name', event_row.external_location_name,
        'external_location_address', event_row.external_location_address,
        'is_free', event_row.is_free,
        'price_pp', event_row.price_pp,
        'currency', event_row.currency,
        'spots_total', event_row.spots_total,
        'frequency', event_row.frequency
      ),
      source_value
    );
  end if;

  perform set_config('d8.event_publish_event_id', event_row.id::text, true);
  update public.events
  set
    first_published_at = coalesce(first_published_at, now()),
    initial_published_is_free = coalesce(initial_published_is_free, is_free),
    initial_published_price = coalesce(initial_published_price, price_pp),
    initial_published_currency = coalesce(initial_published_currency, currency),
    commercial_policy_id = coalesce(commercial_policy_id, p_policy_id),
    commercial_policy_version = coalesce(commercial_policy_version, p_policy_version),
    commercial_baseline_source = coalesce(commercial_baseline_source, 'first_publication'),
    event_status = 'live',
    updated_at = now()
  where id = event_row.id
  returning * into event_row;

  return event_row;
end;
$function$;

revoke all on function public.publish_event_with_policy(uuid, text, text, boolean, uuid) from public, anon;
grant execute on function public.publish_event_with_policy(uuid, text, text, boolean, uuid) to authenticated;

-- Keep the retry-safe Phase 4 wrapper, but make the underlying creation path
-- decimal-aware and publish only through the policy RPC.
create or replace function public.admin_create_event_phase4_legacy(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  attribution text;
  publication_status text;
  event_title text;
  event_city text;
  event_id uuid;
  starts_at_value timestamptz;
  ends_at_value timestamptz;
  location_kind text;
  linked_venue_id uuid;
  price_value numeric(12,2);
  capacity_value integer;
  free_event boolean;
  source_value text;
  organizer_organization uuid;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can create listings' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Event payload must be a JSON object' using errcode = '22023';
  end if;

  event_title := nullif(btrim(p_payload ->> 'title'), '');
  event_city := nullif(btrim(p_payload ->> 'city'), '');
  starts_at_value := nullif(p_payload ->> 'starts_at', '')::timestamptz;
  ends_at_value := nullif(p_payload ->> 'ends_at', '')::timestamptz;
  attribution := lower(coalesce(nullif(btrim(p_payload ->> 'attribution'), ''), 'unclaimed'));
  publication_status := lower(coalesce(nullif(btrim(p_payload ->> 'publication_status'), ''), 'draft'));
  location_kind := lower(coalesce(nullif(btrim(p_payload ->> 'event_location_kind'), ''), 'undisclosed'));
  linked_venue_id := nullif(p_payload ->> 'venue_id', '')::uuid;
  free_event := coalesce(nullif(p_payload ->> 'is_free', '')::boolean, false);
  price_value := case when free_event then 0 else coalesce(nullif(p_payload ->> 'price_pp', '')::numeric(12,2), 0) end;
  capacity_value := coalesce(nullif(p_payload ->> 'capacity', '')::integer, 0);

  if event_title is null or event_city is null or starts_at_value is null then
    raise exception 'Event title, city, and starts_at are required' using errcode = '22023';
  end if;
  if attribution not in ('unclaimed', 'd8advisr') then
    raise exception 'Event attribution must be unclaimed or d8advisr' using errcode = '22023';
  end if;
  if publication_status not in ('draft', 'live') then
    raise exception 'Event publication_status must be draft or live' using errcode = '22023';
  end if;
  if location_kind not in ('d8_venue', 'external', 'undisclosed') then
    raise exception 'Invalid event location kind' using errcode = '22023';
  end if;
  if ends_at_value is not null and ends_at_value <= starts_at_value then
    raise exception 'Event ends_at must be after starts_at' using errcode = '22023';
  end if;
  if price_value < 0 or capacity_value < 0 then
    raise exception 'Event price and capacity cannot be negative' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_payload -> 'images', '[]'::jsonb)) <> 'array' then
    raise exception 'Event images must be an array' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_payload -> 'vibes', '[]'::jsonb)) <> 'array' then
    raise exception 'Event vibes must be an array' using errcode = '22023';
  end if;

  if location_kind = 'd8_venue' then
    if linked_venue_id is null or not exists (select 1 from public.venues where id = linked_venue_id) then
      raise exception 'A valid venue_id is required for a D8 venue event' using errcode = '22023';
    end if;
  elsif location_kind = 'external' then
    if nullif(btrim(p_payload ->> 'external_location_name'), '') is null or linked_venue_id is not null then
      raise exception 'External events require a location name and cannot use venue_id' using errcode = '22023';
    end if;
  elsif linked_venue_id is not null then
    raise exception 'Undisclosed events cannot use venue_id' using errcode = '22023';
  end if;

  source_value := case when attribution = 'd8advisr' then 'd8_admin' else 'admin_unclaimed' end;
  if attribution = 'd8advisr' then
    select id into organizer_organization from public.partner_organizations
    where organization_type = 'platform' and status = 'active' order by created_at limit 1;
  end if;

  insert into public.events (
    venue_id, title, description, category, vibes, cover_image, images,
    starts_at, ends_at, price_pp, currency, capacity, spots_left,
    is_free, is_featured, city, event_location_kind,
    external_location_name, external_location_address, venue_page_status,
    partner_id, organizer_organization_id, source, frequency, weekday,
    next_occurrence, spots_total, spots_filled, emoji, event_status,
    created_at, updated_at
  ) values (
    linked_venue_id, event_title, nullif(btrim(p_payload ->> 'description'), ''),
    nullif(btrim(p_payload ->> 'category'), ''),
    array(select jsonb_array_elements_text(coalesce(p_payload -> 'vibes', '[]'::jsonb))),
    nullif(btrim(p_payload ->> 'cover_image'), ''),
    array(select jsonb_array_elements_text(coalesce(p_payload -> 'images', '[]'::jsonb))),
    starts_at_value, ends_at_value, price_value,
    coalesce(nullif(btrim(p_payload ->> 'currency'), ''), 'ZMW'),
    nullif(capacity_value, 0), null, free_event,
    coalesce(nullif(p_payload ->> 'is_featured', '')::boolean, false),
    event_city, location_kind,
    nullif(btrim(p_payload ->> 'external_location_name'), ''),
    nullif(btrim(p_payload ->> 'external_location_address'), ''),
    case when location_kind = 'd8_venue' then 'approved' else 'hidden' end,
    null, organizer_organization, source_value,
    coalesce(nullif(btrim(p_payload ->> 'frequency'), ''), 'one-off'),
    nullif(btrim(p_payload ->> 'weekday'), ''),
    nullif(btrim(p_payload ->> 'next_occurrence'), ''),
    capacity_value, 0, coalesce(nullif(btrim(p_payload ->> 'emoji'), ''), '📅'),
    publication_status, now(), now()
  ) returning id into event_id;

  insert into public.listing_admin_audit_log (
    event_id, action, attribution, publication_status, actor_id, metadata
  ) values (
    event_id, 'created', attribution, publication_status, actor,
    jsonb_build_object('title', event_title, 'city', event_city, 'location_kind', location_kind)
  );
  return event_id;
end;
$function$;

revoke all on function public.admin_create_event_phase4_legacy(jsonb) from public, anon, authenticated;

create or replace function public.admin_create_event(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  request_key_value uuid;
  existing_event_id uuid;
  created_event_id uuid;
  requested_status text;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can create listings' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Event payload must be a JSON object' using errcode = '22023';
  end if;

  request_key_value := nullif(btrim(p_payload ->> 'request_key'), '')::uuid;
  if request_key_value is null then
    raise exception 'Event request_key is required' using errcode = '22023';
  end if;
  requested_status := lower(coalesce(nullif(btrim(p_payload ->> 'publication_status'), ''), 'draft'));

  perform pg_advisory_xact_lock(hashtextextended(actor::text || ':admin_create_event:' || request_key_value::text, 0));
  select audit.event_id into existing_event_id
  from public.listing_admin_audit_log audit
  where audit.actor_id = actor and audit.action = 'created'
    and audit.request_key = request_key_value and audit.event_id is not null;

  if existing_event_id is not null then return existing_event_id; end if;

  created_event_id := public.admin_create_event_phase4_legacy(
    (p_payload - 'publication_status') || jsonb_build_object('publication_status', 'draft')
  );

  update public.listing_admin_audit_log set request_key = request_key_value
  where event_id = created_event_id and actor_id = actor and action = 'created';

  if requested_status = 'live' then
    perform public.publish_event_with_policy(
      created_event_id,
      p_payload ->> 'policy_id',
      p_payload ->> 'policy_version',
      coalesce((p_payload ->> 'policy_acknowledged')::boolean, false),
      request_key_value
    );
    update public.listing_admin_audit_log set publication_status = 'live'
    where event_id = created_event_id and actor_id = actor and action = 'created';
  elsif requested_status <> 'draft' then
    raise exception 'Event publication_status must be draft or live' using errcode = '22023';
  end if;
  return created_event_id;
end;
$function$;

revoke all on function public.admin_create_event(jsonb) from public, anon;
grant execute on function public.admin_create_event(jsonb) to authenticated;

grant select (
  first_published_at, initial_published_is_free, initial_published_price,
  initial_published_currency, commercial_policy_id, commercial_policy_version,
  commercial_baseline_source
) on public.events to anon, authenticated;
