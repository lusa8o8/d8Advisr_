create or replace function public.admin_update_venue_tier(
  p_venue_id uuid,
  new_tier text,
  reason text
)
returns public.venues
language plpgsql
security definer
set search_path = public
as $$
declare
  old_venue public.venues;
  updated_venue public.venues;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can update venue tiers';
  end if;

  if new_tier not in ('D8 Approved', 'Verified', 'Hidden Gem') then
    raise exception 'Invalid venue tier: %', new_tier;
  end if;

  if reason is null or length(trim(reason)) = 0 then
    raise exception 'A reason is required to update venue tier';
  end if;

  select *
  into old_venue
  from public.venues
  where id = p_venue_id
  for update;

  if old_venue.id is null then
    raise exception 'Venue not found';
  end if;

  update public.venues
  set
    tier = new_tier,
    is_hidden_gem = (new_tier = 'Hidden Gem'),
    updated_at = now()
  where id = p_venue_id
  returning * into updated_venue;

  insert into public.venue_change_log (
    venue_id,
    changed_by,
    field_name,
    old_value,
    new_value,
    risk_level,
    applied_immediately,
    created_reverification,
    reverification_reason
  )
  values (
    p_venue_id,
    auth.uid(),
    'tier',
    old_venue.tier,
    new_tier,
    'high',
    true,
    false,
    trim(reason)
  );

  return updated_venue;
end;
$$;

create or replace function public.admin_mark_venue_verified(
  p_venue_id uuid,
  reason text default 'admin_verified'
)
returns public.venues
language plpgsql
security definer
set search_path = public
as $$
declare
  old_venue public.venues;
  updated_venue public.venues;
  review_reason text := coalesce(nullif(trim(reason), ''), 'admin_verified');
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can mark venues verified';
  end if;

  select *
  into old_venue
  from public.venues
  where id = p_venue_id
  for update;

  if old_venue.id is null then
    raise exception 'Venue not found';
  end if;

  update public.venues
  set
    verification_status = 'verified',
    reverification_reason = null,
    last_verified_at = now(),
    next_verification_due_at = now() + interval '6 months',
    updated_at = now()
  where id = p_venue_id
  returning * into updated_venue;

  update public.venue_reverification_tasks
  set
    status = 'resolved',
    resolved_at = now(),
    notes = coalesce(notes, review_reason)
  where venue_reverification_tasks.venue_id = p_venue_id
    and status in ('open', 'in_progress');

  insert into public.venue_change_log (
    venue_id,
    changed_by,
    field_name,
    old_value,
    new_value,
    risk_level,
    applied_immediately,
    created_reverification,
    reverification_reason
  )
  values (
    p_venue_id,
    auth.uid(),
    'verification_status',
    old_venue.verification_status,
    'verified',
    'high',
    true,
    false,
    review_reason
  );

  return updated_venue;
end;
$$;

revoke all on function public.admin_update_venue_tier(uuid, text, text) from public;
revoke all on function public.admin_mark_venue_verified(uuid, text) from public;

grant execute on function public.admin_update_venue_tier(uuid, text, text) to authenticated;
grant execute on function public.admin_mark_venue_verified(uuid, text) to authenticated;
