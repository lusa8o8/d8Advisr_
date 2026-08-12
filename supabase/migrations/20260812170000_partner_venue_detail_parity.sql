alter table public.venues
  add column if not exists contact_phone text,
  add column if not exists website_url text;

alter table public.venues
  drop constraint if exists venues_contact_phone_length,
  add constraint venues_contact_phone_length
    check (contact_phone is null or char_length(contact_phone) <= 80),
  drop constraint if exists venues_website_url_length,
  add constraint venues_website_url_length
    check (website_url is null or char_length(website_url) <= 500);

create or replace function public.partner_submit_live_venue_revision(
  p_venue_id uuid, p_payload jsonb, p_expected_updated_at timestamptz
)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare
  actor uuid := auth.uid();
  old_venue public.venues;
  updated_venue public.venues;
  revision_id_value uuid;
  next_description text;
  next_hours jsonb;
  previous_values_value jsonb := '{}'::jsonb;
  proposed_values_value jsonb := '{}'::jsonb;
  key text;
  candidate jsonb;
begin
  if actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or p_expected_updated_at is null then
    raise exception 'invalid_partner_live_revision_payload' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(p_payload) field
    where field not in (
      'name','category','address','area','description','open_hours','cover_image','images',
      'price_tier','avg_cost_pp','vibes','contact_phone','website_url'
    )) then
    raise exception 'unsupported_partner_live_revision_field' using errcode = '22023';
  end if;

  select * into old_venue from public.venues where id = p_venue_id for update;
  if old_venue.id is null then raise exception 'Venue not found' using errcode = 'P0002'; end if;
  if old_venue.listing_status <> 'live' or not old_venue.is_active or not (
    old_venue.partner_id = actor
    or (old_venue.operator_organization_id is not null
      and public.is_active_organization_member(old_venue.operator_organization_id, actor)
      and public.organization_can(old_venue.operator_organization_id, 'venues'))
  ) then raise exception 'partner_live_venue_access_required' using errcode = '42501'; end if;
  if old_venue.updated_at is distinct from p_expected_updated_at then
    raise exception 'Venue changed after it was loaded; refresh before saving' using errcode = 'P0001';
  end if;

  if p_payload ? 'images' and jsonb_typeof(p_payload->'images') <> 'array' then
    raise exception 'images_must_be_array' using errcode = '22023';
  end if;
  if p_payload ? 'open_hours' and jsonb_typeof(p_payload->'open_hours') not in ('object','null') then
    raise exception 'open_hours_must_be_object' using errcode = '22023';
  end if;
  if p_payload ? 'vibes' and jsonb_typeof(p_payload->'vibes') <> 'array' then
    raise exception 'vibes_must_be_array' using errcode = '22023';
  end if;
  if p_payload ? 'avg_cost_pp' and jsonb_typeof(p_payload->'avg_cost_pp') not in ('number','null') then
    raise exception 'average_cost_must_be_number' using errcode = '22023';
  end if;
  if p_payload ? 'price_tier'
    and coalesce(p_payload->>'price_tier','') not in ('','$','$$','$$$','$$$$') then
    raise exception 'invalid_price_tier' using errcode = '22023';
  end if;
  if p_payload ? 'contact_phone' and char_length(coalesce(p_payload->>'contact_phone','')) > 80 then
    raise exception 'contact_phone_too_long' using errcode = '22023';
  end if;
  if p_payload ? 'website_url' and char_length(coalesce(p_payload->>'website_url','')) > 500 then
    raise exception 'website_url_too_long' using errcode = '22023';
  end if;
  if p_payload ? 'vibes' and (
    jsonb_array_length(p_payload->'vibes') > 20
    or exists (
      select 1 from jsonb_array_elements_text(p_payload->'vibes') value
      where char_length(value) > 80
    )
  ) then raise exception 'invalid_venue_vibes' using errcode = '22023'; end if;

  foreach key in array array[
    'name','category','address','area','cover_image','images','price_tier',
    'avg_cost_pp','vibes','contact_phone','website_url'
  ] loop
    if p_payload ? key then
      candidate := p_payload -> key;
      if to_jsonb(old_venue) -> key is distinct from candidate then
        previous_values_value := previous_values_value || jsonb_build_object(key, to_jsonb(old_venue)->key);
        proposed_values_value := proposed_values_value || jsonb_build_object(key, candidate);
      end if;
    end if;
  end loop;

  if proposed_values_value <> '{}'::jsonb and exists (
    select 1 from public.venue_live_revisions r
    where r.venue_id = p_venue_id and r.status = 'pending'
  ) then raise exception 'Venue already has a pending live revision' using errcode = '23505'; end if;

  next_description := case when p_payload ? 'description'
    then nullif(btrim(p_payload->>'description'),'') else old_venue.description end;
  next_hours := case when p_payload ? 'open_hours'
    then p_payload->'open_hours' else old_venue.open_hours end;

  if old_venue.description is distinct from next_description
    or old_venue.open_hours is distinct from next_hours then
    update public.venues set
      description = next_description,
      open_hours = next_hours,
      updated_at = now()
    where id = p_venue_id returning * into updated_venue;

    if old_venue.description is distinct from next_description then
      insert into public.venue_change_log (
        venue_id,changed_by,field_name,old_value,new_value,risk_level,
        applied_immediately,created_reverification,reverification_reason
      ) values (
        p_venue_id,actor,'description',old_venue.description,next_description,
        'low',true,false,'partner_live_edit'
      );
    end if;
    if old_venue.open_hours is distinct from next_hours then
      insert into public.venue_change_log (
        venue_id,changed_by,field_name,old_value,new_value,risk_level,
        applied_immediately,created_reverification,reverification_reason
      ) values (
        p_venue_id,actor,'open_hours',old_venue.open_hours::text,next_hours::text,
        'low',true,false,'partner_live_edit'
      );
    end if;
  else
    updated_venue := old_venue;
  end if;

  if proposed_values_value <> '{}'::jsonb then
    insert into public.venue_live_revisions (
      venue_id,previous_values,proposed_values,submitted_by,revision_source
    ) values (
      p_venue_id,previous_values_value,proposed_values_value,actor,'partner'
    ) returning id into revision_id_value;
    insert into public.venue_reverification_tasks (
      venue_id,reason,status,triggered_by,notes,live_revision_id
    ) values (
      p_venue_id,'partner_live_revision','open',actor,
      'Partner high-risk changes awaiting admin review',revision_id_value
    );
  end if;

  if revision_id_value is null
    and updated_venue.updated_at is not distinct from old_venue.updated_at then
    raise exception 'Live venue edit does not change any fields' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'venue_id',p_venue_id,
    'revision_id',revision_id_value,
    'pending_fields',coalesce(
      (select jsonb_agg(k order by k) from jsonb_object_keys(proposed_values_value) k),
      '[]'::jsonb
    ),
    'updated_at',updated_venue.updated_at
  );
end;
$function$;

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

    update public.venue_reverification_tasks
    set status = 'resolved', resolved_at = now(),
      notes = coalesce(nullif(btrim(p_note),''),notes)
    where live_revision_id = revision.id;
  else
    insert into public.venue_change_log (
      venue_id, changed_by, field_name, old_value, new_value, risk_level,
      applied_immediately, created_reverification, reverification_reason
    ) values (
      venue.id, actor, 'partner_live_revision_status', 'pending', 'rejected',
      'high', false, false,
      coalesce(nullif(btrim(p_note),''), 'partner_live_revision_rejected')
    );

    update public.venue_reverification_tasks
    set status = 'dismissed', resolved_at = now(),
      notes = coalesce(nullif(btrim(p_note),''),notes)
    where live_revision_id = revision.id;
  end if;

  update public.venue_live_revisions set
    status = decision,
    reviewed_by = actor,
    review_note = nullif(btrim(p_note),''),
    reviewed_at = now(),
    updated_at = now()
  where id = revision.id;

  return jsonb_build_object(
    'revision_id',revision.id,
    'venue_id',venue.id,
    'status',decision
  );
end;
$function$;

revoke all on function public.partner_submit_live_venue_revision(uuid,jsonb,timestamptz) from public;
revoke all on function public.admin_review_partner_live_venue_revision(uuid,text,text) from public;
grant execute on function public.partner_submit_live_venue_revision(uuid,jsonb,timestamptz) to authenticated;
grant execute on function public.admin_review_partner_live_venue_revision(uuid,text,text) to authenticated;
