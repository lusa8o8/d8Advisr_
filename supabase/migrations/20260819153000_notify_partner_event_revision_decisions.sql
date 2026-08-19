-- Migration to notify partners on event revision review decision (approval or rejection)

create or replace function public.admin_review_event_revision(
  p_revision_id uuid,
  p_decision text,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  target_revision public.event_revisions;
  target_event public.events;
  prop jsonb;
  notification_title text;
  notification_body text;
  display_name text;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can review event revisions' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be either approved or rejected' using errcode = '22023';
  end if;

  select * into target_revision from public.event_revisions where id = p_revision_id for update;

  if target_revision.id is null then
    raise exception 'Event revision not found' using errcode = 'P0002';
  end if;

  if target_revision.status <> 'pending' then
    raise exception 'Only pending event revisions can be reviewed' using errcode = '22023';
  end if;

  select * into target_event from public.events where id = target_revision.event_id for update;

  if target_event.id is null then
    raise exception 'Target event not found' using errcode = 'P0002';
  end if;

  display_name := coalesce(target_event.title, 'Your event');

  if p_decision = 'approved' then
    prop := target_revision.proposed_values;
    
    update public.events
    set
      title = case when prop ? 'title' then prop ->> 'title' else title end,
      description = case when prop ? 'description' then nullif(btrim(prop ->> 'description'), '') else description end,
      category = case when prop ? 'category' then nullif(btrim(prop ->> 'category'), '') else category end,
      starts_at = case when prop ? 'starts_at' then (prop ->> 'starts_at')::timestamptz else starts_at end,
      ends_at = case when prop ? 'ends_at' then nullif(prop ->> 'ends_at', '')::timestamptz else ends_at end,
      frequency = case when prop ? 'frequency' then prop ->> 'frequency' else frequency end,
      weekday = case when prop ? 'weekday' then nullif(btrim(prop ->> 'weekday'), '') else weekday end,
      event_location_kind = case when prop ? 'event_location_kind' then prop ->> 'event_location_kind' else event_location_kind end,
      venue_id = case when prop ? 'venue_id' then nullif(prop ->> 'venue_id', '')::uuid else venue_id end,
      external_location_name = case when prop ? 'external_location_name' then nullif(btrim(prop ->> 'external_location_name'), '') else external_location_name end,
      external_location_address = case when prop ? 'external_location_address' then nullif(btrim(prop ->> 'external_location_address'), '') else external_location_address end,
      capacity = case when prop ? 'capacity' then nullif(prop ->> 'capacity', '')::integer else capacity end,
      spots_total = case when prop ? 'capacity' then nullif(prop ->> 'capacity', '')::integer else spots_total end,
      emoji = case when prop ? 'emoji' then prop ->> 'emoji' else emoji end,
      updated_at = now()
    where id = target_revision.event_id;

    update public.event_revisions
    set
      status = 'approved',
      reviewed_by = actor,
      reviewed_at = now(),
      review_note = nullif(btrim(p_review_note), ''),
      updated_at = now()
    where id = p_revision_id;

    insert into public.listing_admin_audit_log (
      event_id, action, attribution, publication_status, actor_id, metadata
    ) values (
      target_revision.event_id, 'updated_live', 'partner', 'live', actor,
      jsonb_build_object(
        'revision_id', p_revision_id,
        'decision', 'approved',
        'proposed_values', target_revision.proposed_values,
        'note', p_review_note
      )
    );

    notification_title := 'Event revision approved';
    notification_body := display_name || ' was approved and your reviewed changes are now live.';
  else
    update public.event_revisions
    set
      status = 'rejected',
      reviewed_by = actor,
      reviewed_at = now(),
      review_note = nullif(btrim(p_review_note), ''),
      updated_at = now()
    where id = p_revision_id;

    insert into public.listing_admin_audit_log (
      event_id, action, attribution, publication_status, actor_id, metadata
    ) values (
      target_revision.event_id, 'updated_live', 'partner', 'live', actor,
      jsonb_build_object(
        'revision_id', p_revision_id,
        'decision', 'rejected',
        'proposed_values', target_revision.proposed_values,
        'note', p_review_note
      )
    );

    notification_title := 'Event revision rejected';
    notification_body := display_name || ' remains live with its previous details.'
      || case when p_review_note is not null and btrim(p_review_note) <> '' then ' D8 note: ' || btrim(p_review_note) else '' end;
  end if;

  if target_revision.submitted_by is not null and not exists (
    select 1 from public.partner_notifications pn
    where pn.user_id = target_revision.submitted_by
      and pn.metadata->>'revision_id' = target_revision.id::text
      and pn.metadata->>'decision' = p_decision
  ) then
    insert into public.partner_notifications (
      user_id, partner_application_id, type, title, body, metadata
    ) values (
      target_revision.submitted_by,
      null,
      case when p_decision = 'approved' then 'approval' else 'review' end,
      notification_title,
      notification_body,
      jsonb_build_object(
        'event_id', target_event.id,
        'event_title', display_name,
        'revision_id', target_revision.id,
        'decision', p_decision,
        'note', p_review_note
      )
    );
  end if;

  return jsonb_build_object('status', p_decision, 'revision_id', p_revision_id);
end;
$function$;