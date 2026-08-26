-- Allow an administrator to retire a recently cancelled D8-managed event only
-- through an explicit, audited override. The ordinary 24-hour visibility rule
-- remains the default.

create or replace function public.admin_retire_event(
  p_event_id uuid,
  p_expected_updated_at timestamptz,
  p_reason text,
  p_request_key uuid,
  p_override_cancellation_visibility boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  platform_organization constant uuid := '00000000-0000-4000-8000-00000000d800'::uuid;
  target public.events;
  updated_target public.events;
  existing_audit public.listing_retirement_audit;
  previous_state jsonb;
  resulting_state jsonb;
  retirement_status text;
  visibility_window_active boolean := false;
  visibility_override_applied boolean := false;
begin
  if actor is null or not public.is_admin_user() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_event_id is null then raise exception 'event_id_required' using errcode = '22023'; end if;
  if p_expected_updated_at is null then raise exception 'expected_updated_at_required' using errcode = '22023'; end if;
  if p_request_key is null then raise exception 'request_key_required' using errcode = '22023'; end if;

  select * into existing_audit
  from public.listing_retirement_audit
  where actor_user_id = actor and request_key = p_request_key and target_type = 'event';

  if found then
    if existing_audit.action <> 'retired' or existing_audit.listing_id <> p_event_id then
      raise exception 'retirement_request_key_reused' using errcode = '22023';
    end if;
    return existing_audit.resulting_state || jsonb_build_object('idempotent', true);
  end if;

  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'retirement_reason_must_be_3_to_500_characters' using errcode = '22023';
  end if;

  select * into target from public.events where id = p_event_id for update;
  if not found then raise exception 'event_not_found' using errcode = 'P0002'; end if;
  if target.retired_at is not null then raise exception 'event_already_retired' using errcode = '22023'; end if;
  if target.updated_at is distinct from p_expected_updated_at then
    raise exception 'event_retirement_conflict' using errcode = '40001';
  end if;
  if target.partner_id is not null
    or target.source = 'partner'
    or (
      target.organizer_organization_id is not null
      and target.organizer_organization_id <> platform_organization
    )
  then
    raise exception 'partner_owned_event_cannot_be_admin_retired' using errcode = '42501';
  end if;
  if target.event_status = 'live' and target.starts_at > now() then
    raise exception 'upcoming_live_event_must_be_cancelled_first' using errcode = '22023';
  end if;

  visibility_window_active := target.event_status = 'cancelled'
    and target.cancelled_at is not null
    and target.cancelled_at > now() - interval '24 hours';
  visibility_override_applied := visibility_window_active
    and coalesce(p_override_cancellation_visibility, false);

  if visibility_window_active and not visibility_override_applied then
    raise exception 'event_cancellation_visibility_window_active' using errcode = '22023';
  end if;

  retirement_status := case when target.first_published_at is null then 'draft' else 'paused' end;
  previous_state := jsonb_build_object(
    'id', target.id, 'title', target.title, 'event_status', target.event_status,
    'starts_at', target.starts_at, 'first_published_at', target.first_published_at,
    'cancelled_at', target.cancelled_at, 'source', target.source,
    'partner_id', target.partner_id,
    'organizer_organization_id', target.organizer_organization_id,
    'updated_at', target.updated_at,
    'cancellation_visibility_window_active', visibility_window_active
  );

  perform set_config('d8.listing_retirement_target', 'events:' || target.id::text, true);
  update public.events
  set retired_at = now(), retired_by = actor,
      retirement_reason = btrim(p_reason), retired_from_status = target.event_status,
      event_status = retirement_status, updated_at = now()
  where id = target.id
  returning * into updated_target;

  resulting_state := jsonb_build_object(
    'listing_id', updated_target.id, 'target_type', 'event',
    'status', updated_target.event_status, 'retired_at', updated_target.retired_at,
    'retired_from_status', updated_target.retired_from_status,
    'updated_at', updated_target.updated_at, 'idempotent', false,
    'cancellation_visibility_overridden', visibility_override_applied
  );

  insert into public.listing_retirement_audit (
    target_type, listing_id, action, actor_user_id, request_key, reason,
    previous_state, resulting_state
  ) values (
    'event', target.id, 'retired', actor, p_request_key, btrim(p_reason),
    previous_state, resulting_state
  );

  return resulting_state;
end;
$function$;

-- Force browser clients onto the explicit contract. The original function is
-- retained for migration history and server-side compatibility, but cannot be
-- invoked by a browser role.
revoke execute on function public.admin_retire_event(uuid, timestamptz, text, uuid) from authenticated;
revoke all on function public.admin_retire_event(uuid, timestamptz, text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_retire_event(uuid, timestamptz, text, uuid, boolean) to authenticated;
