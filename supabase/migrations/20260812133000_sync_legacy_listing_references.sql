-- Keep legacy RPC/direct-write contracts compatible while canonical clients roll out.
create or replace function public.sync_venue_reference_fields()
returns trigger language plpgsql set search_path = public as $function$
declare
  matched_region text;
  matched_category text;
  matched_area text;
begin
  if new.region_id is null or (tg_op = 'UPDATE' and new.city is distinct from old.city) then
    select r.id into matched_region from public.regions r
    where lower(btrim(new.city)) in (lower(r.id), lower(r.name)) limit 1;
    new.region_id := matched_region;
  end if;
  if new.category_id is null or (tg_op = 'UPDATE' and new.category is distinct from old.category) then
    select a.category_id into matched_category from public.listing_category_aliases a
    where a.listing_kind = 'venue' and a.alias = lower(btrim(new.category)) limit 1;
    new.category_id := matched_category;
  end if;
  if new.area_id is null or (tg_op = 'UPDATE' and new.area is distinct from old.area) then
    select a.id into matched_area from public.region_areas a
    where a.region_id = new.region_id and (
      lower(btrim(new.area)) = lower(a.name)
      or exists (select 1 from unnest(a.aliases) candidate
        where lower(btrim(candidate)) = lower(btrim(new.area)))
    ) limit 1;
    new.area_id := matched_area;
    new.area_source := case
      when matched_area is not null then 'catalog'
      when nullif(btrim(new.area), '') is not null then 'manual'
      else null
    end;
  end if;
  if new.price_level is null or (tg_op = 'UPDATE' and new.price_tier is distinct from old.price_tier) then
    new.price_level := case new.price_tier
      when '$' then 1 when '$$' then 2 when '$$$' then 3 when '$$$$' then 4
      else null
    end;
  end if;
  return new;
end;
$function$;

create or replace function public.sync_event_reference_fields()
returns trigger language plpgsql set search_path = public as $function$
declare
  matched_region text;
  matched_category text;
begin
  if new.region_id is null or (tg_op = 'UPDATE' and new.city is distinct from old.city) then
    select r.id into matched_region from public.regions r
    where lower(btrim(new.city)) in (lower(r.id), lower(r.name)) limit 1;
    new.region_id := matched_region;
  end if;
  if new.category_id is null or (tg_op = 'UPDATE' and new.category is distinct from old.category) then
    select a.category_id into matched_category from public.listing_category_aliases a
    where a.listing_kind = 'event' and a.alias = lower(btrim(new.category)) limit 1;
    new.category_id := matched_category;
  end if;
  return new;
end;
$function$;

drop trigger if exists apply_venue_reference_fields on public.venues;
create trigger a_sync_venue_reference_fields
before insert or update of region_id, city, area_id, area, area_source,
  category_id, category, price_level, price_tier
on public.venues for each row execute function public.sync_venue_reference_fields();
create trigger b_apply_venue_reference_fields
before insert or update of region_id, city, area_id, area, area_source,
  category_id, category, price_level, price_tier
on public.venues for each row execute function public.apply_venue_reference_fields();

drop trigger if exists apply_event_reference_fields on public.events;
create trigger a_sync_event_reference_fields
before insert or update of region_id, city, category_id, category
on public.events for each row execute function public.sync_event_reference_fields();
create trigger b_apply_event_reference_fields
before insert or update of region_id, city, category_id, category
on public.events for each row execute function public.apply_event_reference_fields();

create or replace function public.sync_listing_vibe_relations()
returns trigger language plpgsql security definer set search_path = public as $function$
begin
  if tg_table_name = 'venues' then
    delete from public.venue_vibes where venue_id = new.id;
    insert into public.venue_vibes (venue_id, vibe_id)
    select distinct new.id, a.vibe_id
    from unnest(coalesce(new.vibes, '{}')) raw(value)
    join public.listing_vibe_aliases a on a.alias = lower(btrim(raw.value));
  else
    delete from public.event_vibes where event_id = new.id;
    insert into public.event_vibes (event_id, vibe_id)
    select distinct new.id, a.vibe_id
    from unnest(coalesce(new.vibes, '{}')) raw(value)
    join public.listing_vibe_aliases a on a.alias = lower(btrim(raw.value));
  end if;
  return new;
end;
$function$;

revoke all on function public.sync_listing_vibe_relations() from public;

drop trigger if exists sync_venue_vibe_relations on public.venues;
create trigger sync_venue_vibe_relations after insert or update of vibes
on public.venues for each row execute function public.sync_listing_vibe_relations();
drop trigger if exists sync_event_vibe_relations on public.events;
create trigger sync_event_vibe_relations after insert or update of vibes
on public.events for each row execute function public.sync_listing_vibe_relations();
