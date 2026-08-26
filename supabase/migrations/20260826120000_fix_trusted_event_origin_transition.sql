-- Forward repair: the shared legacy organization trigger restored events.source
-- after the newer provenance RPC performed an authorized d8_admin -> import
-- transition. Give events a dedicated organization-field trigger and reconcile
-- draft rows whose immutable provenance audit already records that transition.

create or replace function public.protect_event_organization_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if tg_op = 'INSERT' and caller_id is not null and not public.is_admin_user() then
    new.created_by := caller_id;
    new.source := 'partner';
    new.organizer_organization_id := null;
    return new;
  end if;

  if tg_op = 'UPDATE' and caller_id is not null then
    new.created_by := old.created_by;
    if not public.is_admin_user() then
      new.organizer_organization_id := old.organizer_organization_id;
    end if;
    -- events.source is enforced by 00_protect_event_listing_origin. Do not
    -- silently restore it here after that trigger authorizes a trusted RPC.
  end if;

  return new;
end;
$function$;

revoke all on function public.protect_event_organization_fields() from public, anon, authenticated;

drop trigger if exists protect_event_organization_fields on public.events;
create trigger protect_event_organization_fields
  before insert or update on public.events
  for each row execute function public.protect_event_organization_fields();

do $repair$
declare
  repair_event_id uuid;
begin
  for repair_event_id in
    select distinct event.id
    from public.events event
    join public.event_provenance_audit audit on audit.event_id = event.id
    where event.source = 'd8_admin'
      and event.event_status = 'draft'
      and event.first_published_at is null
      and audit.resulting_state ->> 'event_source' = 'import'
  loop
    perform set_config('d8.event_origin_event_id', repair_event_id::text, true);
    update public.events
    set source = 'import', updated_at = clock_timestamp()
    where id = repair_event_id;
  end loop;
end;
$repair$;
