alter table public.events
  add column if not exists images text[] not null default '{}';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-media',
  'partner-media',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read partner media" on storage.objects;
create policy "Public can read partner media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'partner-media');

drop policy if exists "Live partners can upload own media" on storage.objects;
create policy "Live partners can upload own media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'partner-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      ((storage.foldername(name))[2] = 'events' and public.live_partner_can(auth.uid(), 'events'))
      or ((storage.foldername(name))[2] = 'venues' and public.live_partner_can(auth.uid(), 'venues'))
    )
  );

drop policy if exists "Live partners can update own media" on storage.objects;
create policy "Live partners can update own media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'partner-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      ((storage.foldername(name))[2] = 'events' and public.live_partner_can(auth.uid(), 'events'))
      or ((storage.foldername(name))[2] = 'venues' and public.live_partner_can(auth.uid(), 'venues'))
    )
  )
  with check (
    bucket_id = 'partner-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      ((storage.foldername(name))[2] = 'events' and public.live_partner_can(auth.uid(), 'events'))
      or ((storage.foldername(name))[2] = 'venues' and public.live_partner_can(auth.uid(), 'venues'))
    )
  );

drop policy if exists "Live partners can delete own media" on storage.objects;
create policy "Live partners can delete own media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'partner-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      ((storage.foldername(name))[2] = 'events' and public.live_partner_can(auth.uid(), 'events'))
      or ((storage.foldername(name))[2] = 'venues' and public.live_partner_can(auth.uid(), 'venues'))
    )
  );
