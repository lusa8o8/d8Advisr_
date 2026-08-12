-- A pending live revision must be resolved through its approve/reject RPC.
-- Generic reverification actions must not close the linked task indirectly.

create or replace function public.protect_pending_live_revision_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.live_revision_id is not null
    and exists (
      select 1 from public.venue_live_revisions revision
      where revision.id = old.live_revision_id and revision.status = 'pending'
    )
  then
    raise exception 'Pending live revision must be approved or rejected through revision review'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_pending_live_revision_task
  on public.venue_reverification_tasks;
create trigger protect_pending_live_revision_task
  before update or delete on public.venue_reverification_tasks
  for each row execute function public.protect_pending_live_revision_task();

revoke all on function public.protect_pending_live_revision_task() from public;
