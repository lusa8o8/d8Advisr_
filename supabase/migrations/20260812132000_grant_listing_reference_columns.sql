-- Columns added after earlier explicit table grants need explicit API-role access.
-- RLS and mutation triggers remain the authorization and derivation boundaries.
grant select (region_id, area_id, area_source, category_id, price_level)
on public.venues to anon, authenticated;
grant insert (region_id, area_id, area_source, category_id, price_level)
on public.venues to authenticated;
grant update (region_id, area_id, area_source, category_id, price_level)
on public.venues to authenticated;

grant select (region_id, category_id)
on public.events to anon, authenticated;
grant insert (region_id, category_id)
on public.events to authenticated;
grant update (region_id, category_id)
on public.events to authenticated;
