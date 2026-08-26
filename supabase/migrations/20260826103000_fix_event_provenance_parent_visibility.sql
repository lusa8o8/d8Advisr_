-- Forward repair: child-table RLS must not require browser roles to hold a
-- table-level SELECT grant on events. Keep the parent visibility decision in a
-- narrow, non-row-returning security-definer helper.

create or replace function public.is_public_event_for_provenance(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1 from public.events event
    where event.id = p_event_id
      and event.retired_at is null
      and event.event_status in ('live', 'cancelled')
  );
$function$;

revoke all on function public.is_public_event_for_provenance(uuid) from public;
grant execute on function public.is_public_event_for_provenance(uuid) to anon, authenticated;

drop policy if exists event_sources_public_select on public.event_sources;
create policy event_sources_public_select
  on public.event_sources for select
  to anon, authenticated
  using (
    show_publicly
    and verification_status = 'verified'
    and public.is_public_event_for_provenance(event_id)
  );

drop policy if exists event_action_links_public_select on public.event_action_links;
create policy event_action_links_public_select
  on public.event_action_links for select
  to anon, authenticated
  using (
    status in ('active', 'sold_out')
    and public.is_public_event_for_provenance(event_id)
  );
