-- Venue operators already receive event tools. Preserve existing `both`
-- applications for compatibility, but stop creating or escalating into that
-- redundant value through any current or future write path.

create or replace function public.prevent_new_both_partner_type()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.partner_type = 'both'
    and (tg_op = 'INSERT' or old.partner_type is distinct from 'both')
  then
    raise exception 'Select venue operator or event organizer'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_new_both_partner_type
  on public.partner_applications;

create trigger prevent_new_both_partner_type
before insert or update of partner_type on public.partner_applications
for each row execute function public.prevent_new_both_partner_type();

revoke all on function public.prevent_new_both_partner_type() from public;
