-- STAGING ONLY: run in the D8Advisr Staging SQL Editor after all five Auth
-- users have been created and confirmed. This file is not part of migrations
-- or normal seed configuration.

begin;

do $$
declare
  missing_emails text;
begin
  select string_agg(expected.email, ', ')
  into missing_emails
  from (
    values
      ('stagingconsumer@d8advisr.com'),
      ('stagingconsumer1@d8advisr.com'),
      ('stagingpartner@d8advisr.com'),
      ('stagingpartner1@d8advisr.com'),
      ('stagingadmin@d8advisr.com')
  ) as expected(email)
  where not exists (
    select 1 from auth.users user_row where user_row.email = expected.email
  );

  if missing_emails is not null then
    raise exception 'Missing staging Auth users: %', missing_emails;
  end if;
end;
$$;

update public.profiles profile
set is_admin = (user_row.email = 'stagingadmin@d8advisr.com'),
    is_partner = (user_row.email in ('stagingpartner@d8advisr.com', 'stagingpartner1@d8advisr.com')),
    city = 'Lusaka',
    updated_at = now()
from auth.users user_row
where profile.id = user_row.id
  and user_row.email in (
    'stagingconsumer@d8advisr.com',
    'stagingconsumer1@d8advisr.com',
    'stagingpartner@d8advisr.com',
    'stagingpartner1@d8advisr.com',
    'stagingadmin@d8advisr.com'
  );

insert into public.partner_applications (
  id, user_id, name, partner_type, city, contact, status, created_at, updated_at
)
select
  case user_row.email
    when 'stagingpartner@d8advisr.com' then '00000000-0000-4000-8000-00000000a001'::uuid
    else '00000000-0000-4000-8000-00000000a002'::uuid
  end,
  user_row.id,
  case user_row.email
    when 'stagingpartner@d8advisr.com' then 'D8 Staging Partner'
    else 'D8 Staging Partner Two'
  end,
  'both',
  'Lusaka',
  user_row.email,
  'live',
  now(),
  now()
from auth.users user_row
where user_row.email in ('stagingpartner@d8advisr.com', 'stagingpartner1@d8advisr.com')
on conflict (user_id) do update set
  name = excluded.name,
  partner_type = excluded.partner_type,
  city = excluded.city,
  contact = excluded.contact,
  status = excluded.status,
  updated_at = now();

alter table public.venues disable trigger apply_venue_partner_safety;

insert into public.venues (
  id, name, slug, city, area, category, tier, price_tier, description, address,
  lat, lng, cover_image, images, vibes, rating, review_count, avg_cost_pp,
  open_hours, is_active, is_hidden_gem, partner_id, listing_status,
  verification_status, last_verified_at, next_verification_due_at,
  created_at, updated_at
)
select
  '00000000-0000-4000-8000-00000000b001'::uuid,
  'D8 Staging Partner Test Venue',
  'd8-staging-partner-test-venue',
  'Lusaka',
  'Kabulonga',
  'Test Venue',
  'Verified',
  '$$',
  'Dedicated staging fixture for partner portal tests.',
  'Staging only',
  -15.4015,
  28.3194,
  null,
  '{}'::text[],
  array['Staging'],
  null,
  0,
  25,
  '{}'::jsonb,
  true,
  false,
  user_row.id,
  'live',
  'verified',
  now(),
  now() + interval '1 year',
  now(),
  now()
from auth.users user_row
where user_row.email = 'stagingpartner@d8advisr.com'
on conflict (id) do update set
  partner_id = excluded.partner_id,
  listing_status = excluded.listing_status,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.venues (
  id, name, slug, city, area, category, tier, price_tier, description, address,
  lat, lng, cover_image, images, vibes, rating, review_count, avg_cost_pp,
  open_hours, is_active, is_hidden_gem, partner_id, listing_status,
  verification_status, created_at, updated_at
)
select
  '00000000-0000-4000-8000-00000000b002'::uuid,
  'D8 Staging Partner Two Draft Venue',
  'd8-staging-partner-two-draft-venue',
  'Lusaka',
  'Kabulonga',
  'Test Venue',
  'Verified',
  '$$',
  'Non-public staging fixture for cross-partner RLS tests.',
  'Staging only',
  -15.4015,
  28.3194,
  null,
  '{}'::text[],
  array['Staging'],
  null,
  0,
  25,
  '{}'::jsonb,
  false,
  false,
  user_row.id,
  'draft',
  'unverified',
  now(),
  now()
from auth.users user_row
where user_row.email = 'stagingpartner1@d8advisr.com'
on conflict (id) do update set
  partner_id = excluded.partner_id,
  listing_status = excluded.listing_status,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

alter table public.venues enable trigger apply_venue_partner_safety;

commit;
