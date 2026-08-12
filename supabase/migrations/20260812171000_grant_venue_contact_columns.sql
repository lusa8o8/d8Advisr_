grant select (contact_phone, website_url)
on public.venues to anon, authenticated;

grant insert (contact_phone, website_url)
on public.venues to authenticated;

grant update (contact_phone, website_url)
on public.venues to authenticated;
