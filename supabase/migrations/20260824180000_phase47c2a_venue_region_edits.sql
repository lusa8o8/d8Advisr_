begin;

-- Partner venue writes are account-market scoped. Admin security-definer
-- functions retain authority to move a listing through an audited revision.
create or replace function public.enforce_partner_venue_region_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  approved_region_id text;
begin
  if actor is null or public.is_admin_user() then return new; end if;

  if tg_op = 'INSERT' then
    select application.region_id into approved_region_id
    from public.partner_applications application
    where application.user_id = actor
      and application.status = 'live'
      and application.partner_type in ('venue', 'both')
    limit 1;

    if approved_region_id is null then
      raise exception 'partner_venue_region_scope_required' using errcode = '42501';
    end if;
    if nullif(btrim(new.region_id), '') is null then
      raise exception 'region_id_required' using errcode = '22023';
    end if;
    if new.region_id is distinct from approved_region_id then
      raise exception 'partner_venue_region_mismatch' using errcode = '42501';
    end if;
  elsif new.region_id is distinct from old.region_id then
    raise exception 'partner_venue_region_change_not_allowed' using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function public.enforce_partner_venue_region_scope() from public;
drop trigger if exists "00_enforce_partner_venue_region_scope" on public.venues;
create trigger "00_enforce_partner_venue_region_scope"
before insert or update of region_id on public.venues
for each row execute function public.enforce_partner_venue_region_scope();

-- Preserve the mature Phase 4 draft editor as a private validation core.
alter function public.admin_update_draft_venue(uuid, jsonb, timestamptz)
  rename to admin_update_draft_venue_phase47c1_core;
revoke all on function public.admin_update_draft_venue_phase47c1_core(uuid, jsonb, timestamptz)
  from public, anon, authenticated;

create or replace function public.admin_update_draft_venue(
  p_venue_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz
)
returns public.venues
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  old_venue public.venues;
  updated_venue public.venues;
  selected_region_id text;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can edit D8 venue drafts' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or not (p_payload ? 'region_id') then
    raise exception 'Venue edit requires an explicit region_id' using errcode = '22023';
  end if;

  select * into old_venue from public.venues where id = p_venue_id;
  if old_venue.id is null then raise exception 'Venue not found' using errcode = 'P0002'; end if;
  selected_region_id := public.resolve_listing_region_id(p_payload->>'region_id', null);

  updated_venue := public.admin_update_draft_venue_phase47c1_core(
    p_venue_id, p_payload - 'region_id', p_expected_updated_at
  );

  if updated_venue.region_id is distinct from selected_region_id then
    update public.venues
    set region_id = selected_region_id,
        area_id = null,
        area_source = case when nullif(btrim(area), '') is null then null else 'manual' end,
        updated_at = now()
    where id = p_venue_id
    returning * into updated_venue;

    insert into public.venue_change_log (
      venue_id, changed_by, field_name, old_value, new_value, risk_level,
      applied_immediately, created_reverification, reverification_reason
    ) values (
      p_venue_id, actor, 'region_id', old_venue.region_id, selected_region_id,
      'high', true, false, 'admin_draft_correction'
    );
  end if;
  return updated_venue;
end;
$function$;

revoke all on function public.admin_update_draft_venue(uuid, jsonb, timestamptz)
  from public, anon;
grant execute on function public.admin_update_draft_venue(uuid, jsonb, timestamptz)
  to authenticated;

-- Admin live edits keep immediate low-risk fields in the existing core while
-- attaching a canonical market change to the same pending revision.
alter function public.admin_submit_live_venue_revision(uuid, jsonb, timestamptz)
  rename to admin_submit_live_venue_revision_phase47c1_core;
revoke all on function public.admin_submit_live_venue_revision_phase47c1_core(uuid, jsonb, timestamptz)
  from public, anon, authenticated;

create or replace function public.admin_submit_live_venue_revision(
  p_venue_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  old_venue public.venues;
  selected_region_id text;
  region_changed boolean;
  result jsonb := '{}'::jsonb;
  revision_id_value uuid;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can edit live D8 venues' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or not (p_payload ? 'region_id') then
    raise exception 'Live venue edit requires an explicit region_id' using errcode = '22023';
  end if;

  select * into old_venue from public.venues where id = p_venue_id;
  if old_venue.id is null then raise exception 'Venue not found' using errcode = 'P0002'; end if;
  selected_region_id := public.resolve_listing_region_id(p_payload->>'region_id', null);
  region_changed := old_venue.region_id is distinct from selected_region_id;

  begin
    result := public.admin_submit_live_venue_revision_phase47c1_core(
      p_venue_id, p_payload - 'region_id', p_expected_updated_at
    );
  exception when sqlstate '22023' then
    if not region_changed or sqlerrm <> 'Live venue edit does not change any fields' then raise; end if;
    result := jsonb_build_object(
      'venue_id', p_venue_id, 'revision_id', null,
      'immediate_fields', '[]'::jsonb, 'pending_fields', '[]'::jsonb,
      'updated_at', old_venue.updated_at
    );
  end;

  revision_id_value := nullif(result->>'revision_id', '')::uuid;
  if region_changed then
    if revision_id_value is null then
      if exists (
        select 1 from public.venue_live_revisions revision
        where revision.venue_id = p_venue_id and revision.status = 'pending'
      ) then
        raise exception 'Venue already has a pending live revision' using errcode = '23505';
      end if;
      insert into public.venue_live_revisions (
        venue_id, previous_values, proposed_values, submitted_by
      ) values (
        p_venue_id,
        jsonb_build_object('region_id', old_venue.region_id),
        jsonb_build_object('region_id', selected_region_id),
        auth.uid()
      ) returning id into revision_id_value;
      insert into public.venue_reverification_tasks (
        venue_id, reason, status, triggered_by, notes, live_revision_id
      ) values (
        p_venue_id, 'admin_live_revision', 'open', auth.uid(),
        'Canonical market change awaiting explicit review', revision_id_value
      );
    else
      update public.venue_live_revisions
      set previous_values = previous_values || jsonb_build_object('region_id', old_venue.region_id),
          proposed_values = proposed_values || jsonb_build_object('region_id', selected_region_id),
          updated_at = now()
      where id = revision_id_value;
    end if;
  end if;

  return result || jsonb_build_object(
    'revision_id', revision_id_value,
    'pending_fields', coalesce((
      select jsonb_agg(field order by field)
      from public.venue_live_revisions revision,
        lateral jsonb_object_keys(revision.proposed_values) field
      where revision.id = revision_id_value
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.admin_submit_live_venue_revision(uuid, jsonb, timestamptz)
  from public, anon;
grant execute on function public.admin_submit_live_venue_revision(uuid, jsonb, timestamptz)
  to authenticated;

-- The approval boundary applies and audits the canonical market alongside the
-- existing reviewed venue fields.
create or replace function public.admin_review_live_venue_revision(
  p_revision_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  platform_organization constant uuid := '00000000-0000-4000-8000-00000000d800'::uuid;
  revision public.venue_live_revisions;
  venue public.venues;
  updated_venue public.venues;
  decision text := lower(btrim(coalesce(p_decision, '')));
  review_note_value text := nullif(btrim(coalesce(p_note, '')), '');
  next_region_id text;
begin
  if not public.is_admin_user() then raise exception 'Only admins can review live venue revisions' using errcode = '42501'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'Live venue revision decision must be approved or rejected' using errcode = '22023'; end if;

  select * into revision from public.venue_live_revisions where id = p_revision_id for update;
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
      where to_jsonb(venue)->baseline.key is distinct from revision.previous_values->baseline.key
    ) then raise exception 'Live venue fields changed after revision submission; reject and resubmit' using errcode = 'P0001'; end if;

    next_region_id := case when revision.proposed_values ? 'region_id'
      then public.resolve_listing_region_id(revision.proposed_values->>'region_id', null)
      else venue.region_id end;

    update public.venues set
      name = case when revision.proposed_values ? 'name' then revision.proposed_values->>'name' else name end,
      region_id = next_region_id,
      city = case when revision.proposed_values ? 'city' then revision.proposed_values->>'city' else city end,
      category = case when revision.proposed_values ? 'category' then revision.proposed_values->>'category' else category end,
      area_id = case when revision.proposed_values ? 'region_id' or revision.proposed_values ? 'area' then null else area_id end,
      area = case when revision.proposed_values ? 'area' then revision.proposed_values->>'area' else area end,
      area_source = case when revision.proposed_values ? 'region_id' or revision.proposed_values ? 'area'
        then case when nullif(btrim(coalesce(revision.proposed_values->>'area', area)), '') is null then null else 'manual' end
        else area_source end,
      address = case when revision.proposed_values ? 'address' then revision.proposed_values->>'address' else address end,
      price_tier = case when revision.proposed_values ? 'price_tier' then revision.proposed_values->>'price_tier' else price_tier end,
      avg_cost_pp = case when revision.proposed_values ? 'avg_cost_pp' then (revision.proposed_values->>'avg_cost_pp')::integer else avg_cost_pp end,
      cover_image = case when revision.proposed_values ? 'cover_image' then revision.proposed_values->>'cover_image' else cover_image end,
      images = case when revision.proposed_values ? 'images' then array(select jsonb_array_elements_text(revision.proposed_values->'images')) else images end,
      vibes = case when revision.proposed_values ? 'vibes' then array(select jsonb_array_elements_text(revision.proposed_values->'vibes')) else vibes end,
      verification_status = 'verified', reverification_reason = null,
      last_verified_at = now(), next_verification_due_at = now() + interval '6 months', updated_at = now()
    where id = venue.id returning * into updated_venue;

    insert into public.venue_change_log (
      venue_id, changed_by, field_name, old_value, new_value, risk_level,
      applied_immediately, created_reverification, reverification_reason
    ) select venue.id, actor, change.key,
      case when revision.previous_values->change.key = 'null'::jsonb then null else revision.previous_values->>change.key end,
      case when revision.proposed_values->change.key = 'null'::jsonb then null else revision.proposed_values->>change.key end,
      'high', true, true, 'admin_live_revision_approved'
    from jsonb_object_keys(revision.proposed_values) change(key);

    update public.venue_live_revisions set status='approved', reviewed_by=actor,
      review_note=review_note_value, reviewed_at=now(), updated_at=now() where id=revision.id;
    update public.venue_reverification_tasks set status='resolved', resolved_at=now(),
      notes=coalesce(review_note_value,notes) where live_revision_id=revision.id;
  else
    updated_venue := venue;
    update public.venue_live_revisions set status='rejected', reviewed_by=actor,
      review_note=review_note_value, reviewed_at=now(), updated_at=now() where id=revision.id;
    update public.venue_reverification_tasks set status='dismissed', resolved_at=now(),
      notes=coalesce(review_note_value,notes) where live_revision_id=revision.id;
    insert into public.venue_change_log (
      venue_id, changed_by, field_name, old_value, new_value, risk_level,
      applied_immediately, created_reverification, reverification_reason
    ) values (venue.id, actor, 'live_revision_status', 'pending', 'rejected',
      'high', false, false, coalesce(review_note_value, 'admin_live_revision_rejected'));
  end if;

  return jsonb_build_object('revision_id',revision.id,'venue_id',venue.id,
    'status',decision,'updated_at',updated_venue.updated_at);
end;
$function$;

revoke all on function public.admin_review_live_venue_revision(uuid, text, text) from public, anon;
grant execute on function public.admin_review_live_venue_revision(uuid, text, text) to authenticated;

-- Partner live edits carry explicit market scope but cannot propose a market
-- move. The mature partner revision function remains the field-diff core.
alter function public.partner_submit_live_venue_revision(uuid, jsonb, timestamptz)
  rename to partner_submit_live_venue_revision_phase47c1_core;
revoke all on function public.partner_submit_live_venue_revision_phase47c1_core(uuid, jsonb, timestamptz)
  from public, anon, authenticated;

create or replace function public.partner_submit_live_venue_revision(
  p_venue_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  venue public.venues;
  selected_region_id text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or not (p_payload ? 'region_id') then
    raise exception 'partner_live_venue_region_id_required' using errcode = '22023';
  end if;
  select * into venue from public.venues where id = p_venue_id;
  if venue.id is null then raise exception 'Venue not found' using errcode = 'P0002'; end if;
  selected_region_id := public.resolve_listing_region_id(p_payload->>'region_id', null);
  if selected_region_id is distinct from venue.region_id then
    raise exception 'partner_venue_region_change_not_allowed' using errcode = '42501';
  end if;
  return public.partner_submit_live_venue_revision_phase47c1_core(
    p_venue_id, p_payload - 'region_id', p_expected_updated_at
  );
end;
$function$;

revoke all on function public.partner_submit_live_venue_revision(uuid, jsonb, timestamptz)
  from public, anon;
grant execute on function public.partner_submit_live_venue_revision(uuid, jsonb, timestamptz)
  to authenticated;

commit;
