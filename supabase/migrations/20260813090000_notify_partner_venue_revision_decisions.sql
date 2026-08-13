-- Durable partner inbox events for live venue revision decisions.
-- The database row is authoritative; realtime/email/push are delivery layers.

do $block$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'partner_notifications'
    ) then
    alter publication supabase_realtime add table public.partner_notifications;
  end if;
end;
$block$;
create or replace function public.admin_review_partner_live_venue_revision(
  p_revision_id uuid, p_decision text, p_note text default null
)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare
  actor uuid := auth.uid();
  revision public.venue_live_revisions;
  venue public.venues;
  decision text := lower(btrim(coalesce(p_decision,'')));
  decision_note text := nullif(btrim(p_note),'');
  notification_title text;
  notification_body text;
  display_name text;
begin
  if not public.is_admin_user() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if decision not in ('approved','rejected') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  select * into revision from public.venue_live_revisions
  where id = p_revision_id for update;
  if revision.id is null or revision.status <> 'pending'
    or revision.revision_source <> 'partner' then
    raise exception 'pending_partner_revision_required' using errcode = '22023';
  end if;

  select * into venue from public.venues where id = revision.venue_id for update;
  if venue.listing_status <> 'live' or not venue.is_active
    or (venue.partner_id is null and venue.operator_organization_id is null) then
    raise exception 'partner_revision_target_ineligible' using errcode = '42501';
  end if;

  if decision = 'approved' then
    if exists (
      select 1 from jsonb_object_keys(revision.previous_values) baseline(key)
      where to_jsonb(venue)->baseline.key
        is distinct from revision.previous_values->baseline.key
    ) then
      raise exception 'Live venue fields changed after revision submission' using errcode = 'P0001';
    end if;

    update public.venues set
      name = case when revision.proposed_values ? 'name'
        then revision.proposed_values->>'name' else name end,
      category = case when revision.proposed_values ? 'category'
        then revision.proposed_values->>'category' else category end,
      address = case when revision.proposed_values ? 'address'
        then revision.proposed_values->>'address' else address end,
      area = case when revision.proposed_values ? 'area'
        then revision.proposed_values->>'area' else area end,
      cover_image = case when revision.proposed_values ? 'cover_image'
        then revision.proposed_values->>'cover_image' else cover_image end,
      images = case when revision.proposed_values ? 'images'
        then array(select jsonb_array_elements_text(revision.proposed_values->'images'))
        else images end,
      price_tier = case when revision.proposed_values ? 'price_tier'
        then nullif(revision.proposed_values->>'price_tier','') else price_tier end,
      avg_cost_pp = case when revision.proposed_values ? 'avg_cost_pp'
        then (revision.proposed_values->>'avg_cost_pp')::integer else avg_cost_pp end,
      vibes = case when revision.proposed_values ? 'vibes'
        then array(select jsonb_array_elements_text(revision.proposed_values->'vibes'))
        else vibes end,
      contact_phone = case when revision.proposed_values ? 'contact_phone'
        then nullif(btrim(revision.proposed_values->>'contact_phone'),'') else contact_phone end,
      website_url = case when revision.proposed_values ? 'website_url'
        then nullif(btrim(revision.proposed_values->>'website_url'),'') else website_url end,
      verification_status = 'verified',
      reverification_reason = null,
      last_verified_at = now(),
      next_verification_due_at = now() + interval '6 months',
      updated_at = now()
    where id = venue.id;

    insert into public.venue_change_log (
      venue_id, changed_by, field_name, old_value, new_value, risk_level,
      applied_immediately, created_reverification, reverification_reason
    )
    select venue.id, actor, change.key,
      case when revision.previous_values->change.key = 'null'::jsonb
        then null else revision.previous_values->>change.key end,
      case when revision.proposed_values->change.key = 'null'::jsonb
        then null else revision.proposed_values->>change.key end,
      'high', true, true, 'partner_live_revision_approved'
    from jsonb_object_keys(revision.proposed_values) change(key);
  else
    insert into public.venue_change_log (
      venue_id, changed_by, field_name, old_value, new_value, risk_level,
      applied_immediately, created_reverification, reverification_reason
    ) values (
      venue.id, actor, 'partner_live_revision_status', 'pending', 'rejected',
      'high', false, false,
      coalesce(nullif(btrim(p_note),''), 'partner_live_revision_rejected')
    );
  end if;

  update public.venue_live_revisions set
    status = decision,
    reviewed_by = actor,
    review_note = nullif(btrim(p_note),''),
    reviewed_at = now(),
    updated_at = now()
  where id = revision.id;

  update public.venue_reverification_tasks
  set
    status = case when decision = 'approved' then 'resolved' else 'dismissed' end,
    resolved_at = now(),
    notes = coalesce(decision_note,notes)
  where live_revision_id = revision.id;

  display_name := coalesce(nullif(revision.proposed_values->>'name',''), venue.name);
  if decision = 'approved' then
    notification_title := 'Venue changes approved';
    notification_body := display_name || ' was approved and the reviewed changes are now live.';
  else
    notification_title := 'Venue changes need another edit';
    notification_body := display_name || ' remains live with its previous details.'
      || case when decision_note is not null then ' D8 note: ' || decision_note else '' end;
  end if;

  if revision.submitted_by is not null and not exists (
    select 1 from public.partner_notifications pn
    where pn.user_id = revision.submitted_by
      and pn.metadata->>'revision_id' = revision.id::text
      and pn.metadata->>'decision' = decision
  ) then
    insert into public.partner_notifications (
      user_id, partner_application_id, type, title, body, metadata
    ) values (
      revision.submitted_by,
      null,
      case when decision = 'approved' then 'approval' else 'review' end,
      notification_title,
      notification_body,
      jsonb_build_object(
        'venue_id', venue.id,
        'venue_name', display_name,
        'revision_id', revision.id,
        'decision', decision,
        'review_note', decision_note
      )
    );
  end if;

  return jsonb_build_object(
    'revision_id',revision.id,
    'venue_id',venue.id,
    'status',decision
  );
end;
$function$;

revoke all on function public.admin_review_partner_live_venue_revision(uuid,text,text) from public;
grant execute on function public.admin_review_partner_live_venue_revision(uuid,text,text) to authenticated;
