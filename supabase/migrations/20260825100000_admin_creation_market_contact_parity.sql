begin;

-- Admin venue creation now accepts the same public contact fields as the
-- partner venue flow. Request-key retries return the original row unchanged.
create or replace function public.admin_create_venue(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor uuid := auth.uid();
  request_key_value uuid;
  existing_venue_id uuid;
  created_venue_id uuid;
  selected_region_id text;
  physical_city text;
  contact_phone_value text;
  website_url_value text;
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can create listings' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Venue payload must be a JSON object' using errcode = '22023';
  end if;

  request_key_value := nullif(btrim(p_payload->>'request_key'),'')::uuid;
  if request_key_value is null then
    raise exception 'Venue request_key is required' using errcode = '22023';
  end if;
  if lower(coalesce(nullif(btrim(p_payload->>'publication_status'),''),'draft')) <> 'draft' then
    raise exception 'Admin-created venues must be saved as drafts and approved separately' using errcode = '22023';
  end if;

  selected_region_id := public.resolve_listing_region_id(p_payload->>'region_id', p_payload->>'city');
  physical_city := coalesce(
    nullif(btrim(p_payload->>'city'),''),
    (select region.name from public.regions region where region.id = selected_region_id)
  );
  contact_phone_value := nullif(btrim(p_payload->>'contact_phone'), '');
  website_url_value := nullif(btrim(p_payload->>'website_url'), '');

  if contact_phone_value is not null and char_length(contact_phone_value) > 80 then
    raise exception 'contact_phone_too_long' using errcode = '22023';
  end if;
  if website_url_value is not null and (
    char_length(website_url_value) > 500
    or website_url_value !~* '^https?://[^[:space:]]+$'
  ) then
    raise exception 'invalid_venue_website_url' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(actor::text||':admin_create_venue:'||request_key_value::text, 0)
  );
  select audit.venue_id into existing_venue_id
  from public.listing_admin_audit_log audit
  where audit.actor_id = actor
    and audit.action = 'created'
    and audit.request_key = request_key_value
    and audit.venue_id is not null;
  if existing_venue_id is not null then return existing_venue_id; end if;

  created_venue_id := public.admin_create_venue_phase4_legacy(
    (p_payload - 'publication_status')
      || jsonb_build_object('publication_status','draft','city',selected_region_id)
  );

  update public.venues set
    region_id = selected_region_id,
    city = physical_city,
    contact_phone = contact_phone_value,
    website_url = website_url_value
  where id = created_venue_id;

  update public.listing_admin_audit_log set
    request_key = request_key_value,
    metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
      'region_id', selected_region_id,
      'city', physical_city,
      'contact_phone', contact_phone_value,
      'website_url', website_url_value
    )
  where venue_id = created_venue_id
    and actor_id = actor
    and action = 'created';
  return created_venue_id;
end;
$function$;

revoke all on function public.admin_create_venue(jsonb) from public, anon;
grant execute on function public.admin_create_venue(jsonb) to authenticated;

commit;
