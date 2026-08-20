-- The project uses explicit column-level event grants. Discovery must be able
-- to filter recent cancellations without widening any write permission.
grant select (cancelled_at) on table public.events to anon, authenticated;
