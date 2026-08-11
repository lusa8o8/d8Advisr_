-- Fresh Supabase projects no longer auto-grant API roles access to newly
-- created public tables. Keep privileges explicit and let the existing RLS
-- policies enforce row ownership and admin-only writes.

revoke all on table public.regions from anon, authenticated;
grant select on table public.regions to anon, authenticated;
grant insert, update, delete on table public.regions to authenticated;

revoke all on table public.plans from anon, authenticated;
grant select, insert, update, delete on table public.plans to authenticated;

revoke all on table public.plan_members from anon, authenticated;
grant select on table public.plan_members to authenticated;

revoke all on table public.plan_stops from anon, authenticated;
grant select, insert, update, delete on table public.plan_stops to authenticated;

revoke all on table public.stash_funds from anon, authenticated;
grant select, insert, update, delete on table public.stash_funds to authenticated;

revoke all on table public.stash_members from anon, authenticated;
grant select on table public.stash_members to authenticated;

revoke all on table public.stash_transactions from anon, authenticated;
grant select, insert on table public.stash_transactions to authenticated;

revoke all on table public.saved_venues from anon, authenticated;
grant select, insert, delete on table public.saved_venues to authenticated;
