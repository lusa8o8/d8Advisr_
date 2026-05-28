-- Persist lightweight, partner-safe demand signals from real user interactions.
-- Raw rows remain private; partners read only aggregated counts through RPC.

create table if not exists public.demand_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  signal_type text not null,
  event_id uuid references public.events(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint demand_signals_type_check check (
    signal_type in (
      'event_view',
      'venue_view',
      'event_add_to_plan',
      'venue_add_to_plan',
      'event_reminder_enabled',
      'venue_saved'
    )
  ),
  constraint demand_signals_target_check check (
    event_id is not null or venue_id is not null
  )
);

alter table public.demand_signals enable row level security;

revoke all on public.demand_signals from anon, authenticated;
grant insert on public.demand_signals to authenticated;

drop policy if exists "Users can insert own demand signals" on public.demand_signals;
create policy "Users can insert own demand signals"
  on public.demand_signals for insert
  to authenticated
  with check (auth.uid() = user_id);

create index if not exists demand_signals_event_created_idx
  on public.demand_signals(event_id, signal_type, created_at desc)
  where event_id is not null;

create index if not exists demand_signals_venue_created_idx
  on public.demand_signals(venue_id, signal_type, created_at desc)
  where venue_id is not null;

create index if not exists demand_signals_user_recent_idx
  on public.demand_signals(user_id, signal_type, created_at desc);

create or replace function public.record_demand_signal(
  p_signal_type text,
  p_event_id uuid default null,
  p_venue_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_exists boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_signal_type not in (
    'event_view',
    'venue_view',
    'event_add_to_plan',
    'venue_add_to_plan',
    'event_reminder_enabled',
    'venue_saved'
  ) then
    raise exception 'Unsupported demand signal type: %', p_signal_type;
  end if;

  if p_event_id is null and p_venue_id is null then
    raise exception 'A demand signal requires an event or venue target';
  end if;

  if p_event_id is not null then
    select exists (
      select 1
      from public.events e
      where e.id = p_event_id
        and e.event_status = 'live'
    ) into target_exists;

    if not target_exists then
      raise exception 'Event is not available for demand tracking';
    end if;
  end if;

  if p_venue_id is not null then
    select exists (
      select 1
      from public.venues v
      where v.id = p_venue_id
        and v.is_active = true
    ) into target_exists;

    if not target_exists then
      raise exception 'Venue is not available for demand tracking';
    end if;
  end if;

  -- De-dupe accidental repeated taps/refreshes without losing useful intent.
  if exists (
    select 1
    from public.demand_signals ds
    where ds.user_id = current_user_id
      and ds.signal_type = p_signal_type
      and ds.created_at >= now() - interval '6 hours'
      and (
        (p_event_id is not null and ds.event_id = p_event_id)
        or (p_venue_id is not null and ds.venue_id = p_venue_id)
      )
  ) then
    return;
  end if;

  insert into public.demand_signals (
    user_id,
    signal_type,
    event_id,
    venue_id,
    metadata
  )
  values (
    current_user_id,
    p_signal_type,
    p_event_id,
    p_venue_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.get_partner_demand_summary(
  p_since timestamptz default now() - interval '7 days'
)
returns table (
  signal_type text,
  event_id uuid,
  venue_id uuid,
  label text,
  count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ds.signal_type,
    e.id as event_id,
    null::uuid as venue_id,
    e.title as label,
    count(*)::bigint as count
  from public.demand_signals ds
  join public.events e on e.id = ds.event_id
  where e.partner_id = auth.uid()
    and ds.created_at >= p_since
  group by ds.signal_type, e.id, e.title

  union all

  select
    ds.signal_type,
    null::uuid as event_id,
    v.id as venue_id,
    v.name as label,
    count(*)::bigint as count
  from public.demand_signals ds
  join public.venues v on v.id = ds.venue_id
  where v.partner_id = auth.uid()
    and ds.created_at >= p_since
  group by ds.signal_type, v.id, v.name
  order by count desc, label asc;
$$;

revoke all on function public.record_demand_signal(text, uuid, uuid, jsonb) from public;
grant execute on function public.record_demand_signal(text, uuid, uuid, jsonb) to authenticated;

revoke all on function public.get_partner_demand_summary(timestamptz) from public;
grant execute on function public.get_partner_demand_summary(timestamptz) to authenticated;
