-- Shared selectors submit catalog labels during compatibility; every label maps to itself.
insert into public.listing_category_aliases (listing_kind, alias, category_id)
select listing_kind, lower(btrim(category.label)), category.id
from public.listing_categories category
cross join lateral unnest(category.applies_to) listing_kind
on conflict (listing_kind, alias) do update set category_id=excluded.category_id;

update public.venues v set category_id=a.category_id
from public.listing_category_aliases a
where a.listing_kind='venue' and a.alias=lower(btrim(v.category))
  and v.category_id is distinct from a.category_id;

update public.events e set category_id=a.category_id
from public.listing_category_aliases a
where a.listing_kind='event' and a.alias=lower(btrim(e.category))
  and e.category_id is distinct from a.category_id;
