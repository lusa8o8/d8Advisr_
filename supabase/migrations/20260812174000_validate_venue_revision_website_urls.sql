alter table public.venue_live_revisions
  drop constraint if exists venue_live_revisions_website_url_scheme,
  add constraint venue_live_revisions_website_url_scheme
    check (
      not (proposed_values ? 'website_url')
      or proposed_values->>'website_url' is null
      or proposed_values->>'website_url' ~* '^https?://[^[:space:]]+$'
    ) not valid;
