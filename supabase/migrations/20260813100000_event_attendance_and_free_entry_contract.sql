-- Canonical event attendance and free-entry semantics.
-- spots_total is a capacity ceiling, not live ticket inventory.

update public.events
set
  spots_total = case
    when greatest(coalesce(spots_total, 0), 0) = 0 then 0
    else greatest(coalesce(spots_total, 0), greatest(coalesce(spots_filled, 0), 0))
  end,
  spots_filled = greatest(coalesce(spots_filled, 0), 0),
  price_pp = case when coalesce(is_free, false) then 0 else greatest(coalesce(price_pp, 0), 0) end,
  capacity = nullif(
    case
      when greatest(coalesce(spots_total, 0), 0) = 0 then 0
      else greatest(coalesce(spots_total, 0), greatest(coalesce(spots_filled, 0), 0))
    end,
    0
  ),
  spots_left = null;

alter table public.events
  drop constraint if exists events_spots_total_nonnegative,
  drop constraint if exists events_spots_filled_nonnegative,
  drop constraint if exists events_filled_within_capacity,
  drop constraint if exists events_price_pp_nonnegative,
  drop constraint if exists events_free_entry_price_zero;

alter table public.events
  add constraint events_spots_total_nonnegative check (spots_total >= 0) not valid,
  add constraint events_spots_filled_nonnegative check (spots_filled >= 0) not valid,
  add constraint events_filled_within_capacity check (spots_total = 0 or spots_filled <= spots_total) not valid,
  add constraint events_price_pp_nonnegative check (price_pp >= 0) not valid,
  add constraint events_free_entry_price_zero check (not is_free or price_pp = 0) not valid;

alter table public.events validate constraint events_spots_total_nonnegative;
alter table public.events validate constraint events_spots_filled_nonnegative;
alter table public.events validate constraint events_filled_within_capacity;
alter table public.events validate constraint events_price_pp_nonnegative;
alter table public.events validate constraint events_free_entry_price_zero;

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
  new.price_pp := greatest(coalesce(new.price_pp, 0), 0);

  if coalesce(new.is_free, false) then
    new.price_pp := 0;
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

  -- Keep legacy columns non-authoritative while old database consumers exist.
  new.capacity := nullif(new.spots_total, 0);
  new.spots_left := null;
  return new;
end;
$function$;

revoke all on function public.enforce_event_attendance_contract() from public;

drop trigger if exists enforce_event_attendance_contract on public.events;
create trigger enforce_event_attendance_contract
  before insert or update on public.events
  for each row execute procedure public.enforce_event_attendance_contract();
