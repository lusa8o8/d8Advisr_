create table public.listing_media (
  id uuid primary key default extensions.uuid_generate_v4(),
  bucket_id text not null default 'listing-media' check (bucket_id = 'listing-media'),
  object_path text not null unique,
  scope text not null check (scope in ('venues', 'events')),
  uploader_id uuid not null references public.profiles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((venue_id is null) or scope = 'venues'),
  check ((event_id is null) or scope = 'events')
);

alter table public.listing_media enable row level security;
create policy public_listing_media_metadata on public.listing_media
for select to anon, authenticated using (true);
create policy uploader_listing_media_metadata on public.listing_media
for all to authenticated
using (uploader_id = auth.uid() or public.is_admin_user())
with check (uploader_id = auth.uid() or public.is_admin_user());

grant select on public.listing_media to anon, authenticated;
grant insert, update, delete on public.listing_media to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-media', 'listing-media', true, 3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy public_read_listing_media on storage.objects for select
to anon, authenticated using (bucket_id = 'listing-media');

create policy authorized_upload_listing_media on storage.objects for insert
to authenticated with check (
  bucket_id = 'listing-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] in ('venues', 'events')
  and (
    public.is_admin_user()
    or public.live_partner_can(auth.uid(), (storage.foldername(name))[2])
  )
);

create policy owner_update_listing_media on storage.objects for update
to authenticated using (
  bucket_id = 'listing-media'
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'listing-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy owner_delete_listing_media on storage.objects for delete
to authenticated using (
  bucket_id = 'listing-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.register_listing_media(
  p_object_path text,
  p_scope text
)
returns public.listing_media
language plpgsql security definer set search_path = public, storage as $function$
declare
  actor uuid := auth.uid();
  media public.listing_media;
begin
  if actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_scope not in ('venues', 'events')
    or split_part(p_object_path, '/', 1) <> actor::text
    or split_part(p_object_path, '/', 2) <> p_scope then
    raise exception 'invalid_media_path' using errcode = '22023';
  end if;
  if not public.is_admin_user() and not public.live_partner_can(actor, p_scope) then
    raise exception 'media_capability_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'listing-media' and o.name = p_object_path and o.owner_id = actor::text
  ) then
    raise exception 'media_object_not_found' using errcode = '22023';
  end if;
  insert into public.listing_media (object_path, scope, uploader_id)
  values (p_object_path, p_scope, actor)
  returning * into media;
  return media;
end;
$function$;

revoke all on function public.register_listing_media(text, text) from public;
grant execute on function public.register_listing_media(text, text) to authenticated;
