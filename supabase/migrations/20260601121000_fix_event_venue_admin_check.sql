create or replace function public.set_event_venue_page_status(
  p_event_id uuid,
  p_status text
)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_event public.events;
begin
  if p_status not in ('approved', 'rejected', 'hidden') then
    raise exception 'Invalid venue page status: %', p_status
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.events e
    left join public.venues v on v.id = e.venue_id
    where e.id = p_event_id
      and e.venue_id is not null
      and (
        public.is_admin_user()
        or v.partner_id = auth.uid()
      )
  ) then
    raise exception 'Only admins or the venue owner can update venue page event visibility'
      using errcode = '42501';
  end if;

  update public.events
  set
    venue_page_status = p_status,
    updated_at = now()
  where id = p_event_id
  returning * into updated_event;

  return updated_event;
end;
$$;

revoke all on function public.set_event_venue_page_status(uuid, text) from public;
grant execute on function public.set_event_venue_page_status(uuid, text) to authenticated;
