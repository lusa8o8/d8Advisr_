-- Resolve the revision before its protected task so the guard can observe the decision.
create or replace function public.admin_review_partner_live_venue_revision(
  p_revision_id uuid, p_decision text, p_note text default null
)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare
  actor uuid := auth.uid();
  revision public.venue_live_revisions;
  venue public.venues;
  decision text := lower(btrim(coalesce(p_decision,'')));
begin
  if not public.is_admin_user() then raise exception 'admin_required' using errcode = '42501'; end if;
  if decision not in ('approved','rejected') then raise exception 'invalid_decision' using errcode = '22023'; end if;
  select * into revision from public.venue_live_revisions where id=p_revision_id for update;
  if revision.id is null or revision.status <> 'pending' or revision.revision_source <> 'partner' then
    raise exception 'pending_partner_revision_required' using errcode = '22023';
  end if;
  select * into venue from public.venues where id=revision.venue_id for update;
  if venue.listing_status <> 'live' or not venue.is_active
    or (venue.partner_id is null and venue.operator_organization_id is null) then
    raise exception 'partner_revision_target_ineligible' using errcode = '42501';
  end if;
  if decision='approved' then
    if exists (select 1 from jsonb_object_keys(revision.previous_values) baseline(key)
      where to_jsonb(venue)->baseline.key is distinct from revision.previous_values->baseline.key) then
      raise exception 'Live venue fields changed after revision submission' using errcode = 'P0001';
    end if;
    update public.venues set
      name=case when revision.proposed_values?'name' then revision.proposed_values->>'name' else name end,
      category=case when revision.proposed_values?'category' then revision.proposed_values->>'category' else category end,
      address=case when revision.proposed_values?'address' then revision.proposed_values->>'address' else address end,
      area=case when revision.proposed_values?'area' then revision.proposed_values->>'area' else area end,
      cover_image=case when revision.proposed_values?'cover_image' then revision.proposed_values->>'cover_image' else cover_image end,
      images=case when revision.proposed_values?'images'
        then array(select jsonb_array_elements_text(revision.proposed_values->'images')) else images end,
      verification_status='verified',reverification_reason=null,last_verified_at=now(),
      next_verification_due_at=now()+interval '6 months',updated_at=now()
    where id=venue.id;
  end if;
  update public.venue_live_revisions set status=decision,reviewed_by=actor,
    review_note=nullif(btrim(p_note),''),reviewed_at=now(),updated_at=now()
  where id=revision.id;
  update public.venue_reverification_tasks set
    status=case when decision='approved' then 'resolved' else 'dismissed' end,
    resolved_at=now(),notes=coalesce(nullif(btrim(p_note),''),notes)
  where live_revision_id=revision.id;
  return jsonb_build_object('revision_id',revision.id,'venue_id',venue.id,'status',decision);
end;
$function$;

revoke all on function public.admin_review_partner_live_venue_revision(uuid,text,text) from public;
grant execute on function public.admin_review_partner_live_venue_revision(uuid,text,text) to authenticated;
