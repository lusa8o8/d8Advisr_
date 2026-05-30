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
  notification_title text;
  notification_body text;
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
    values (venue_id, coalesce(reason, 'admin_review'), auth.uid());
  end if;

  if new_status = 'live' then
    notification_title := 'Your venue listing is live';
    notification_body := updated_venue.name || ' is now visible in D8Advisr search and discovery.';
  elsif new_status = 'needs_update' then
    notification_title := 'Venue listing needs an update';
    notification_body := 'D8 reviewed ' || updated_venue.name || ' and needs a few changes before it can appear publicly.';
  elsif new_status = 'hidden' then
    notification_title := 'Venue listing hidden';
    notification_body := updated_venue.name || ' is no longer visible publicly while D8 reviews it.';
  end if;

  if updated_venue.partner_id is not null
    and notification_title is not null
    and not exists (
      select 1
      from public.partner_notifications pn
      where pn.user_id = updated_venue.partner_id
        and pn.metadata ->> 'venue_id' = updated_venue.id::text
        and pn.metadata ->> 'listing_status' = new_status
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
      updated_venue.partner_id,
      null,
      case when new_status = 'live' then 'approval' else 'review' end,
      notification_title,
      notification_body,
      jsonb_build_object(
        'venue_id', updated_venue.id,
        'venue_name', updated_venue.name,
        'listing_status', new_status,
        'reason', reason
      )
    );
  end if;

  return updated_venue;
end;
$$;

revoke all on function public.admin_update_venue_listing_status(uuid, text, text) from public;
grant execute on function public.admin_update_venue_listing_status(uuid, text, text) to authenticated;
