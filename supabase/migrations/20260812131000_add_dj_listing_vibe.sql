-- Forward correction from staging reconciliation: DJ is a real production vibe.
insert into public.listing_vibes (id, label, sort_order)
values ('dj', 'DJ', 135)
on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order;

insert into public.listing_vibe_aliases (alias, vibe_id)
values ('dj', 'dj')
on conflict (alias) do update set vibe_id = excluded.vibe_id;

insert into public.venue_vibes (venue_id, vibe_id)
select distinct v.id, 'dj'
from public.venues v
cross join lateral unnest(coalesce(v.vibes, '{}')) raw(value)
where lower(btrim(raw.value)) = 'dj'
on conflict do nothing;

insert into public.event_vibes (event_id, vibe_id)
select distinct e.id, 'dj'
from public.events e
cross join lateral unnest(coalesce(e.vibes, '{}')) raw(value)
where lower(btrim(raw.value)) = 'dj'
on conflict do nothing;
