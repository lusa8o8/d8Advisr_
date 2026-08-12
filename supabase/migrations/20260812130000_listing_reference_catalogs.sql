-- Phase 4.5: additive, stable listing geography and taxonomy keys.

create table public.region_areas (
  id text primary key,
  region_id text not null references public.regions(id) on update cascade on delete restrict,
  slug text not null,
  name text not null,
  aliases text[] not null default '{}',
  source text not null default 'd8_reviewed'
    check (source in ('d8_reviewed', 'provider', 'import')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (region_id, slug)
);

create table public.listing_categories (
  id text primary key,
  label text not null unique,
  applies_to text[] not null
    check (applies_to <@ array['venue', 'event']::text[] and cardinality(applies_to) > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listing_category_aliases (
  listing_kind text not null check (listing_kind in ('venue', 'event')),
  alias text not null,
  category_id text not null references public.listing_categories(id) on update cascade on delete cascade,
  primary key (listing_kind, alias),
  check (alias = lower(btrim(alias)) and alias <> '')
);

create table public.listing_vibes (
  id text primary key,
  label text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listing_vibe_aliases (
  alias text primary key,
  vibe_id text not null references public.listing_vibes(id) on update cascade on delete cascade,
  check (alias = lower(btrim(alias)) and alias <> '')
);

insert into public.listing_categories (id, label, applies_to, sort_order) values
  ('restaurant', 'Restaurant', array['venue'], 10),
  ('restaurant-bar', 'Restaurant & Bar', array['venue'], 20),
  ('cafe-brunch', 'Café & Brunch', array['venue'], 30),
  ('event-space', 'Event Space', array['venue'], 40),
  ('bar-lounge', 'Bar & Lounge', array['venue'], 50),
  ('live-music', 'Live Music', array['venue', 'event'], 60),
  ('sports-fitness', 'Sports & Fitness', array['venue', 'event'], 70),
  ('activity-experience', 'Activity & Experience', array['venue', 'event'], 80),
  ('arts-culture', 'Arts & Culture', array['venue', 'event'], 90),
  ('cinema', 'Cinema', array['venue', 'event'], 100),
  ('market-food', 'Market & Street Food', array['event'], 110),
  ('nightlife', 'Nightlife', array['venue', 'event'], 120),
  ('social-mixer', 'Social & Mixer', array['event'], 130)
on conflict (id) do update set label = excluded.label,
  applies_to = excluded.applies_to, sort_order = excluded.sort_order;

insert into public.listing_category_aliases (listing_kind, alias, category_id) values
  ('venue', 'restaurant', 'restaurant'),
  ('venue', 'fine dining', 'restaurant'),
  ('venue', 'garden restaurant', 'restaurant'),
  ('venue', 'restaurant & bar', 'restaurant-bar'),
  ('venue', 'local bar & grill', 'restaurant-bar'),
  ('venue', 'café & brunch', 'cafe-brunch'),
  ('venue', 'cafe & brunch', 'cafe-brunch'),
  ('venue', 'brunch & day club', 'cafe-brunch'),
  ('venue', 'café & events space', 'event-space'),
  ('venue', 'cafe & events space', 'event-space'),
  ('venue', 'cocktail bar & lounge', 'bar-lounge'),
  ('venue', 'rooftop bar', 'bar-lounge'),
  ('venue', 'live music venue', 'live-music'),
  ('venue', 'sports facility', 'sports-fitness'),
  ('venue', 'activity', 'activity-experience'),
  ('event', 'activity', 'activity-experience'),
  ('event', 'cinema', 'cinema'),
  ('event', 'live music', 'live-music'),
  ('event', 'market & street food', 'market-food'),
  ('event', 'nightlife', 'nightlife'),
  ('event', 'social & mixer', 'social-mixer')
on conflict (listing_kind, alias) do update set category_id = excluded.category_id;

insert into public.listing_vibes (id, label, sort_order) values
  ('afrobeats','Afrobeats',10), ('anniversary','Anniversary',20),
  ('artsy','Artsy',30), ('asian','Asian',40), ('authentic','Authentic',50),
  ('brunch','Brunch',60), ('budget-friendly','Budget Friendly',70),
  ('casual','Casual',80), ('cocktails','Cocktails',90), ('coffee','Coffee',100),
  ('cozy','Cozy',110), ('craft-beer','Craft Beer',120), ('cultural','Cultural',130),
  ('dance','Dance',140), ('date-night','Date Night',150), ('daytime','Daytime',160),
  ('different','Different',170), ('farm-to-table','Farm-to-Table',180),
  ('film','Film',190), ('fine-dining','Fine Dining',200), ('foodie','Foodie',210),
  ('garden','Garden',220), ('grills','Grills',230),
  ('group-friendly','Group Friendly',240), ('intimate','Intimate',250),
  ('late-night','Late Night',260), ('live-music','Live Music',270),
  ('lively','Lively',280), ('local','Local',290), ('local-cuisine','Local Cuisine',300),
  ('morning','Morning',310), ('nightlife','Nightlife',320), ('outdoor','Outdoor',330),
  ('pool','Pool',340), ('quiet','Quiet',350), ('relaxing','Relaxing',360),
  ('romantic','Romantic',370), ('rooftop','Rooftop',380), ('scenic','Scenic',390),
  ('social','Social',400), ('sophisticated','Sophisticated',410), ('sports','Sports',420),
  ('sunset','Sunset',430), ('unique','Unique',440), ('vibrant','Vibrant',450),
  ('views','Views',460), ('wine','Wine',470), ('adventure','Adventure',480)
on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order;

insert into public.listing_vibe_aliases (alias, vibe_id)
select alias, vibe_id from (values
  ('afrobeats','afrobeats'), ('anniversary','anniversary'),
  ('art','artsy'), ('artsy','artsy'), ('creative','artsy'),
  ('asian','asian'), ('authentic','authentic'), ('brunch','brunch'),
  ('affordable','budget-friendly'), ('budget','budget-friendly'),
  ('budget friendly','budget-friendly'), ('casual','casual'), ('cocktails','cocktails'),
  ('coffee','coffee'), ('cozy','cozy'), ('craft beer','craft-beer'),
  ('cultural','cultural'), ('culture','cultural'), ('dance','dance'),
  ('date night','date-night'), ('daytime','daytime'), ('different','different'),
  ('farm-to-table','farm-to-table'), ('film','film'), ('fine dining','fine-dining'),
  ('foodie','foodie'), ('garden','garden'), ('grills','grills'),
  ('group','group-friendly'), ('group friendly','group-friendly'),
  ('intimate','intimate'), ('late night','late-night'), ('live music','live-music'),
  ('lively','lively'), ('local','local'), ('local cuisine','local-cuisine'),
  ('morning','morning'), ('nightlife','nightlife'), ('outdoor','outdoor'),
  ('pool','pool'), ('quiet','quiet'), ('chill','relaxing'),
  ('relaxed','relaxing'), ('relaxing','relaxing'), ('romantic','romantic'),
  ('rooftop','rooftop'), ('scenic','scenic'), ('social','social'),
  ('sophisticated','sophisticated'), ('sports','sports'), ('sunset','sunset'),
  ('unique','unique'), ('vibrant','vibrant'), ('views','views'),
  ('wine','wine'), ('adventure','adventure')
) mapped(alias, vibe_id)
on conflict (alias) do update set vibe_id = excluded.vibe_id;

insert into public.region_areas (id, region_id, slug, name, aliases, sort_order) values
  ('lusaka-chilenje','lusaka','chilenje','Chilenje','{}',10),
  ('lusaka-haile-selassie','lusaka','haile-selassie','Haile Selassie','{}',20),
  ('lusaka-ibex-hill','lusaka','ibex-hill','Ibex Hill','{}',30),
  ('lusaka-jesmondine','lusaka','jesmondine','Jesmondine','{}',40),
  ('lusaka-kabulonga','lusaka','kabulonga','Kabulonga','{}',50),
  ('lusaka-leopards-hill','lusaka','leopards-hill','Leopards Hill','{}',60),
  ('lusaka-longacres','lusaka','longacres','Longacres','{}',70),
  ('lusaka-mass-media','lusaka','mass-media','Mass Media','{}',80),
  ('lusaka-matero','lusaka','matero','Matero','{}',90),
  ('lusaka-northmead','lusaka','northmead','Northmead','{}',100),
  ('lusaka-olympia','lusaka','olympia','Olympia','{}',110),
  ('lusaka-ridgeway','lusaka','ridgeway','Ridgeway','{}',120),
  ('lusaka-thornpark-great-east-road','lusaka','thornpark-great-east-road',
    'Thornpark / Great East Road Area',array['Thornpark','Great East Road Area'],130),
  ('lusaka-woodlands','lusaka','woodlands','Woodlands','{}',140)
on conflict (id) do update set name = excluded.name, aliases = excluded.aliases,
  sort_order = excluded.sort_order;

alter table public.venues
  add column if not exists region_id text references public.regions(id) on update cascade on delete restrict,
  add column if not exists area_id text references public.region_areas(id) on update cascade on delete restrict,
  add column if not exists area_source text
    check (area_source is null or area_source in ('catalog','manual','legacy','provider')),
  add column if not exists category_id text references public.listing_categories(id) on update cascade on delete restrict,
  add column if not exists price_level smallint check (price_level between 1 and 4);

alter table public.events
  add column if not exists region_id text references public.regions(id) on update cascade on delete restrict,
  add column if not exists category_id text references public.listing_categories(id) on update cascade on delete restrict;

create table public.venue_vibes (
  venue_id uuid not null references public.venues(id) on delete cascade,
  vibe_id text not null references public.listing_vibes(id) on update cascade on delete restrict,
  primary key (venue_id, vibe_id)
);

create table public.event_vibes (
  event_id uuid not null references public.events(id) on delete cascade,
  vibe_id text not null references public.listing_vibes(id) on update cascade on delete restrict,
  primary key (event_id, vibe_id)
);

update public.venues v set region_id = r.id
from public.regions r
where lower(btrim(v.city)) in (lower(r.id), lower(r.name));

update public.events e set region_id = r.id
from public.regions r
where lower(btrim(e.city)) in (lower(r.id), lower(r.name));

update public.venues v set area_id = a.id, area_source = 'catalog'
from public.region_areas a
where v.region_id = a.region_id and (
  lower(btrim(v.area)) = lower(a.name)
  or exists (select 1 from unnest(a.aliases) candidate
    where lower(btrim(candidate)) = lower(btrim(v.area)))
);

update public.venues set area_source = 'legacy'
where area_id is null and nullif(btrim(area), '') is not null;

update public.venues v set category_id = a.category_id
from public.listing_category_aliases a
where a.listing_kind = 'venue' and a.alias = lower(btrim(v.category));

update public.events e set category_id = a.category_id
from public.listing_category_aliases a
where a.listing_kind = 'event' and a.alias = lower(btrim(e.category));

update public.venues
set price_level = case price_tier
  when '$' then 1
  when '$$' then 2
  when '$$$' then 3
  when '$$$$' then 4
end
where price_tier in ('$', '$$', '$$$', '$$$$');

insert into public.venue_vibes (venue_id, vibe_id)
select distinct v.id, a.vibe_id
from public.venues v
cross join lateral unnest(coalesce(v.vibes, '{}')) raw(value)
join public.listing_vibe_aliases a on a.alias = lower(btrim(raw.value))
on conflict do nothing;

insert into public.event_vibes (event_id, vibe_id)
select distinct e.id, a.vibe_id
from public.events e
cross join lateral unnest(coalesce(e.vibes, '{}')) raw(value)
join public.listing_vibe_aliases a on a.alias = lower(btrim(raw.value))
on conflict do nothing;

create or replace function public.apply_venue_reference_fields()
returns trigger language plpgsql set search_path = public as $$
declare
  selected_region public.regions;
  selected_area public.region_areas;
  selected_category public.listing_categories;
begin
  if new.region_id is not null then
    select * into strict selected_region from public.regions where id = new.region_id;
    new.city := selected_region.name;
  end if;
  if new.category_id is not null then
    select * into strict selected_category from public.listing_categories where id = new.category_id;
    if not ('venue' = any(selected_category.applies_to)) then
      raise exception 'category_not_valid_for_venue' using errcode = '22023';
    end if;
    new.category := selected_category.label;
  end if;
  if new.area_id is not null then
    select * into strict selected_area from public.region_areas where id = new.area_id;
    if new.region_id is null or selected_area.region_id <> new.region_id then
      raise exception 'area_not_in_selected_region' using errcode = '22023';
    end if;
    new.area := selected_area.name;
    new.area_source := 'catalog';
  elsif nullif(btrim(new.area), '') is not null and new.area_source is null then
    new.area_source := 'manual';
  end if;
  if new.price_level is not null then
    new.price_tier := repeat('$', new.price_level);
  end if;
  return new;
end;
$$;

create or replace function public.apply_event_reference_fields()
returns trigger language plpgsql set search_path = public as $$
declare
  selected_region public.regions;
  selected_category public.listing_categories;
begin
  if new.region_id is not null then
    select * into strict selected_region from public.regions where id = new.region_id;
    new.city := selected_region.name;
    new.currency := selected_region.currency_code;
  end if;
  if new.category_id is not null then
    select * into strict selected_category from public.listing_categories where id = new.category_id;
    if not ('event' = any(selected_category.applies_to)) then
      raise exception 'category_not_valid_for_event' using errcode = '22023';
    end if;
    new.category := selected_category.label;
  end if;
  return new;
end;
$$;

drop trigger if exists apply_venue_reference_fields on public.venues;
create trigger apply_venue_reference_fields
before insert or update of region_id, area_id, area, area_source, category_id, price_level
on public.venues for each row execute function public.apply_venue_reference_fields();

drop trigger if exists apply_event_reference_fields on public.events;
create trigger apply_event_reference_fields
before insert or update of region_id, category_id
on public.events for each row execute function public.apply_event_reference_fields();

alter table public.region_areas enable row level security;
alter table public.listing_categories enable row level security;
alter table public.listing_category_aliases enable row level security;
alter table public.listing_vibes enable row level security;
alter table public.listing_vibe_aliases enable row level security;
alter table public.venue_vibes enable row level security;
alter table public.event_vibes enable row level security;

do $migration$
begin
  execute format('drop policy if exists %I on public.regions', 'Admins can manage regions');
end
$migration$;

drop policy if exists phase45_admin_regions on public.regions;
create policy phase45_admin_regions on public.regions for all to authenticated
using (public.is_admin_user()) with check (public.is_admin_user());

create policy public_category_aliases
on public.listing_category_aliases for select to anon, authenticated using (true);
create policy admin_category_aliases
on public.listing_category_aliases for all to authenticated
using (public.is_admin_user()) with check (public.is_admin_user());

create policy public_active_listing_vibes
on public.listing_vibes for select to anon, authenticated
using (is_active or public.is_admin_user());
create policy admin_listing_vibes
on public.listing_vibes for all to authenticated
using (public.is_admin_user()) with check (public.is_admin_user());

create policy public_vibe_aliases
on public.listing_vibe_aliases for select to anon, authenticated using (true);
create policy admin_vibe_aliases
on public.listing_vibe_aliases for all to authenticated
using (public.is_admin_user()) with check (public.is_admin_user());

create policy venue_vibes_follow_visibility
on public.venue_vibes for select to anon, authenticated
using (exists (select 1 from public.venues v where v.id = venue_id));
create policy event_vibes_follow_visibility
on public.event_vibes for select to anon, authenticated
using (exists (select 1 from public.events e where e.id = event_id));
create policy admin_venue_vibes
on public.venue_vibes for all to authenticated
using (public.is_admin_user()) with check (public.is_admin_user());
create policy admin_event_vibes
on public.event_vibes for all to authenticated
using (public.is_admin_user()) with check (public.is_admin_user());

grant select on public.regions, public.region_areas, public.listing_categories,
  public.listing_category_aliases, public.listing_vibes, public.listing_vibe_aliases,
  public.venue_vibes, public.event_vibes to anon, authenticated;
grant insert, update, delete on public.regions, public.region_areas,
  public.listing_categories, public.listing_category_aliases, public.listing_vibes,
  public.listing_vibe_aliases, public.venue_vibes, public.event_vibes to authenticated;

create policy public_active_region_areas
on public.region_areas for select to anon, authenticated
using (is_active or public.is_admin_user());
create policy admin_region_areas
on public.region_areas for all to authenticated
using (public.is_admin_user()) with check (public.is_admin_user());

create policy public_active_listing_categories
on public.listing_categories for select to anon, authenticated
using (is_active or public.is_admin_user());
create policy admin_listing_categories
on public.listing_categories for all to authenticated
using (public.is_admin_user()) with check (public.is_admin_user());

create or replace function public.admin_listing_reference_exceptions()
returns table (
  listing_kind text,
  listing_id uuid,
  field_name text,
  raw_value text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin_user() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  return query
    select 'venue'::text, v.id, 'region'::text, v.city
      from public.venues v where v.region_id is null
    union all select 'venue', v.id, 'category', v.category
      from public.venues v where v.category_id is null
    union all select 'venue', v.id, 'price_level', v.price_tier
      from public.venues v
      where nullif(btrim(v.price_tier), '') is not null and v.price_level is null
    union all select 'venue', v.id, 'vibe', raw.value
      from public.venues v
      cross join lateral unnest(coalesce(v.vibes, '{}')) raw(value)
      where not exists (select 1 from public.listing_vibe_aliases a
        where a.alias = lower(btrim(raw.value)))
    union all select 'event', e.id, 'region', e.city
      from public.events e where e.region_id is null
    union all select 'event', e.id, 'category', e.category
      from public.events e
      where nullif(btrim(e.category), '') is not null and e.category_id is null
    union all select 'event', e.id, 'vibe', raw.value
      from public.events e
      cross join lateral unnest(coalesce(e.vibes, '{}')) raw(value)
      where not exists (select 1 from public.listing_vibe_aliases a
        where a.alias = lower(btrim(raw.value)));
end;
$$;

revoke all on function public.admin_listing_reference_exceptions() from public;
grant execute on function public.admin_listing_reference_exceptions() to authenticated;
