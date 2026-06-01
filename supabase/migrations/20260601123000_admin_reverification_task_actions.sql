create or replace function public.admin_update_reverification_task_status(
  p_task_id uuid,
  new_status text,
  note text default null
)
returns public.venue_reverification_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  current_task public.venue_reverification_tasks;
  updated_task public.venue_reverification_tasks;
  review_note text := nullif(trim(coalesce(note, '')), '');
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can update venue reverification tasks';
  end if;

  if new_status not in ('open', 'in_progress', 'resolved', 'dismissed', 'needs_update') then
    raise exception 'Invalid reverification task status: %', new_status;
  end if;

  select *
  into current_task
  from public.venue_reverification_tasks
  where id = p_task_id
  for update;

  if current_task.id is null then
    raise exception 'Reverification task not found';
  end if;

  if new_status = 'needs_update' then
    update public.venues
    set
      listing_status = 'needs_update',
      is_active = false,
      verification_status = 'reverify_required',
      reverification_reason = current_task.reason,
      updated_at = now()
    where id = current_task.venue_id;

    update public.venue_reverification_tasks
    set
      status = 'resolved',
      resolved_at = now(),
      notes = coalesce(review_note, notes, 'needs_update')
    where id = p_task_id
    returning * into updated_task;

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
      current_task.venue_id,
      auth.uid(),
      'listing_status',
      'review_task',
      'needs_update',
      'high',
      true,
      false,
      coalesce(review_note, current_task.reason)
    );

    return updated_task;
  end if;

  update public.venue_reverification_tasks
  set
    status = new_status,
    resolved_at = case
      when new_status in ('resolved', 'dismissed') then now()
      else null
    end,
    notes = coalesce(review_note, notes)
  where id = p_task_id
  returning * into updated_task;

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
    current_task.venue_id,
    auth.uid(),
    'reverification_task_status',
    current_task.status,
    new_status,
    'high',
    true,
    false,
    coalesce(review_note, current_task.reason)
  );

  return updated_task;
end;
$$;

revoke all on function public.admin_update_reverification_task_status(uuid, text, text) from public;
grant execute on function public.admin_update_reverification_task_status(uuid, text, text) to authenticated;
