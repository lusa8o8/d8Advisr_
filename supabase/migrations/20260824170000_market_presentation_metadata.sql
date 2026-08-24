begin;

alter table public.countries
  add column calling_code text;

alter table public.countries
  add constraint countries_calling_code_format
  check (calling_code is null or calling_code ~ '^\+[1-9][0-9]{0,3}$');

update public.countries set calling_code = case code
  when 'NG' then '+234'
  when 'ZM' then '+260'
  else calling_code
end
where code in ('NG', 'ZM');

alter table public.countries alter column calling_code set not null;

alter table public.regions
  add column center_lat double precision,
  add column center_lng double precision,
  add column default_zoom smallint not null default 12;

update public.regions set
  center_lat = case id when 'lagos' then 6.5244 when 'lusaka' then -15.3875 end,
  center_lng = case id when 'lagos' then 3.3792 when 'lusaka' then 28.3228 end,
  default_zoom = 12
where id in ('lagos', 'lusaka');

alter table public.regions
  add constraint regions_center_pair check (
    (center_lat is null and center_lng is null)
    or (center_lat between -90 and 90 and center_lng between -180 and 180)
  ),
  add constraint regions_live_center_required check (
    not is_live or (center_lat is not null and center_lng is not null)
  ),
  add constraint regions_default_zoom_range check (default_zoom between 1 and 22);

do $validation$
begin
  if exists (
    select 1 from public.countries where calling_code is null
  ) then
    raise exception 'Market metadata refused: an active country has no calling code';
  end if;
  if exists (
    select 1 from public.regions
    where is_live and (center_lat is null or center_lng is null)
  ) then
    raise exception 'Market metadata refused: a live market has no map center';
  end if;
end
$validation$;

comment on column public.countries.calling_code is
  'Default international calling prefix used to assist forms; users may still enter a different valid number.';
comment on column public.regions.center_lat is
  'Presentation fallback center for an empty market map; not a listing coordinate or PostGIS boundary.';
comment on column public.regions.center_lng is
  'Presentation fallback center for an empty market map; not a listing coordinate or PostGIS boundary.';

commit;
