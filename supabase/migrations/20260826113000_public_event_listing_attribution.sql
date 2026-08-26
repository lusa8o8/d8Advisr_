-- Consumer-safe listing attribution. Expose only the name needed for a visible
-- event; do not widen partner_organizations RLS or expose organization details.

create or replace function public.get_public_event_listing_attribution(p_event_id uuid)
returns table (
  attribution_type text,
  display_name text
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    case
      when event.source in ('d8_admin', 'import') then 'd8advisr'
      when event.source = 'partner' and organization.name is not null then 'partner'
      else 'unknown'
    end as attribution_type,
    case
      when event.source in ('d8_admin', 'import') then 'D8Advisr'
      when event.source = 'partner' then organization.name
      else null
    end as display_name
  from public.events event
  left join public.partner_organizations organization
    on organization.id = event.organizer_organization_id
  where event.id = p_event_id
    and public.is_public_event_for_provenance(event.id)
    and (
      event.source in ('d8_admin', 'import')
      or (event.source = 'partner' and organization.name is not null)
    );
$function$;

revoke all on function public.get_public_event_listing_attribution(uuid) from public;
grant execute on function public.get_public_event_listing_attribution(uuid) to anon, authenticated;
