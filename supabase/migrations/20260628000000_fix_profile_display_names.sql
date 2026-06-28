-- Update the trigger to derive display_name from email prefix if full_name is missing
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Backfill existing users who have a null display_name
update public.profiles p
set display_name = split_part(u.email, '@', 1)
from auth.users u
where p.id = u.id
and p.display_name is null
and u.email is not null;
