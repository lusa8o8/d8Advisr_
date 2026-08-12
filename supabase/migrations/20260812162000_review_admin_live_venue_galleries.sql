create or replace function public.admin_review_live_venue_revision(
  p_revision_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  platform_organization constant uuid := '00000000-0000-4000-8000-00000000d800'::uuid;
  revision public.venue_live_revisions;
  venue public.venues;
  updated_venue public.venues;
  decision text := lower(btrim(coalesce(p_decision, '')));
  review_note_value text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can review live venue revisions' using errcode = '42501';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'Live venue revision decision must be approved or rejected' using errcode = '22023';
  end if;

  select * into revision from public.venue_live_revisions
  where id = p_revision_id for update;
  if revision.id is null then raise exception 'Live venue revision not found' using errcode = 'P0002'; end if;
  if revision.status <> 'pending' then raise exception 'Live venue revision is already resolved' using errcode = '22023'; end if;

  select * into venue from public.venues where id = revision.venue_id for update;
  if venue.source is distinct from 'd8_admin' or venue.partner_id is not null
    or (venue.operator_organization_id is not null and venue.operator_organization_id <> platform_organization)
    or venue.listing_status <> 'live' or not venue.is_active then
    raise exception 'Revision target is no longer an eligible live D8 venue' using errcode = '42501';
  end if;

  if decision = 'approved' then
    if exists (
      select 1 from jsonb_object_keys(revision.previous_values) baseline(key)
      where to_jsonb(venue) -> baseline.key is distinct from revision.previous_values -> baseline.key
    ) then
      raise exception 'Live venue fields changed after revision submission; reject and resubmit' using errcode = 'P0001';
    end if;

    update public.venues set
      name = case when revision.proposed_values ? 'name' then revision.proposed_values ->> 'name' else name end,
      city = case when revision.proposed_values ? 'city' then revision.proposed_values ->> 'city' else city end,
      category = case when revision.proposed_values ? 'category' then revision.proposed_values ->> 'category' else category end,
      area = case when revision.proposed_values ? 'area' then revision.proposed_values ->> 'area' else area end,
      address = case when revision.proposed_values ? 'address' then revision.proposed_values ->> 'address' else address end,
      price_tier = case when revision.proposed_values ? 'price_tier' then revision.proposed_values ->> 'price_tier' else price_tier end,
      avg_cost_pp = case when revision.proposed_values ? 'avg_cost_pp' then (revision.proposed_values ->> 'avg_cost_pp')::integer else avg_cost_pp end,
      cover_image = case when revision.proposed_values ? 'cover_image' then revision.proposed_values ->> 'cover_image' else cover_image end,
      images = case when revision.proposed_values ? 'images'
        then array(select jsonb_array_elements_text(revision.proposed_values -> 'images')) else images end,
      vibes = case when revision.proposed_values ? 'vibes'
        then array(select jsonb_array_elements_text(revision.proposed_values -> 'vibes')) else vibes end,
      verification_status = 'verified', reverification_reason = null,
      last_verified_at = now(), next_verification_due_at = now() + interval '6 months',
      updated_at = now()
    where id = venue.id returning * into updated_venue;

    insert into public.venue_change_log (
      venue_id, changed_by, field_name, old_value, new_value, risk_level,
      applied_immediately, created_reverification, reverification_reason
    )
    select venue.id, actor, change.key,
      case when revision.previous_values -> change.key = 'null'::jsonb then null else revision.previous_values ->> change.key end,
      case when revision.proposed_values -> change.key = 'null'::jsonb then null else revision.proposed_values ->> change.key end,
      'high', true, true, 'admin_live_revision_approved'
    from jsonb_object_keys(revision.proposed_values) change(key);

    update public.venue_live_revisions set
      status = 'approved', reviewed_by = actor, review_note = review_note_value,
      reviewed_at = now(), updated_at = now()
    where id = revision.id;

    update public.venue_reverification_tasks set
      status = 'resolved', resolved_at = now(), notes = coalesce(review_note_value, notes)
    where live_revision_id = revision.id;
  else
    updated_venue := venue;
    update public.venue_live_revisions set
      status = 'rejected', reviewed_by = actor, review_note = review_note_value,
      reviewed_at = now(), updated_at = now()
    where id = revision.id;
    update public.venue_reverification_tasks set
      status = 'dismissed', resolved_at = now(), notes = coalesce(review_note_value, notes)
    where live_revision_id = revision.id;
    insert into public.venue_change_log (
      venue_id, changed_by, field_name, old_value, new_value, risk_level,
      applied_immediately, created_reverification, reverification_reason
    ) values (
      venue.id, actor, 'live_revision_status', 'pending', 'rejected',
      'high', false, false, coalesce(review_note_value, 'admin_live_revision_rejected')
    );
  end if;

  return jsonb_build_object(
    'revision_id', revision.id, 'venue_id', venue.id, 'status', decision,
    'updated_at', updated_venue.updated_at
  );
end;
$$;

revoke all on function public.admin_review_live_venue_revision(uuid, text, text) from public, anon;
grant execute on function public.admin_review_live_venue_revision(uuid, text, text) to authenticated;
