alter table public.venues
  drop constraint if exists venues_website_url_scheme,
  add constraint venues_website_url_scheme
    check (
      website_url is null
      or website_url ~* '^https?://[^[:space:]]+$'
    );
