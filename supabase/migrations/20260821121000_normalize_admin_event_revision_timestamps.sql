-- Normalize equivalent timestamp spellings before the D3 revision classifier
-- compares JSON snapshots (for example browser ISO `Z` versus PostgreSQL
-- `+00:00`). This prevents unchanged schedules from becoming material edits.

alter function public.admin_apply_event_revision_v11(uuid, jsonb, timestamptz, boolean, text)
  rename to admin_apply_event_revision_v11_core;

revoke all on function public.admin_apply_event_revision_v11_core(uuid, jsonb, timestamptz, boolean, text)
  from public, anon, authenticated;

create or replace function public.admin_apply_event_revision_v11(
  p_event_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz,
  p_confirmed boolean default false,
  p_admin_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  normalized_payload jsonb := p_payload;
begin
  if auth.uid() is null or not public.is_admin_user() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if normalized_payload ? 'starts_at' and normalized_payload ->> 'starts_at' is not null then
    normalized_payload := jsonb_set(
      normalized_payload, '{starts_at}', to_jsonb((normalized_payload ->> 'starts_at')::timestamptz)
    );
  end if;
  if normalized_payload ? 'ends_at' and normalized_payload ->> 'ends_at' is not null then
    normalized_payload := jsonb_set(
      normalized_payload, '{ends_at}', to_jsonb((normalized_payload ->> 'ends_at')::timestamptz)
    );
  end if;

  return public.admin_apply_event_revision_v11_core(
    p_event_id, normalized_payload, p_expected_updated_at, p_confirmed, p_admin_reason
  );
exception when invalid_datetime_format or datetime_field_overflow then
  raise exception 'Invalid event date or time' using errcode = '22023';
end;
$function$;

revoke all on function public.admin_apply_event_revision_v11(uuid, jsonb, timestamptz, boolean, text)
  from public, anon;
grant execute on function public.admin_apply_event_revision_v11(uuid, jsonb, timestamptz, boolean, text)
  to authenticated;
