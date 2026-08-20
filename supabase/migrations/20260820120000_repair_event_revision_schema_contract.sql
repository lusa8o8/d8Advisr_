-- Repair schema columns referenced by the deployed Phase 4.6B revision
-- functions. This is compatibility repair; the v1.1 policy cutover may stop
-- producing blocked/review decisions but historical rows remain readable.

alter table public.event_revisions
  add column if not exists blocked_reason text;

alter table public.partner_notifications
  add column if not exists event_id uuid references public.events(id) on delete cascade;

alter table public.partner_notifications
  drop constraint if exists partner_notifications_type_check;

alter table public.partner_notifications
  add constraint partner_notifications_type_check
  check (type in ('system', 'approval', 'action', 'review', 'revision_decision'));

create index if not exists partner_notifications_event_created_idx
  on public.partner_notifications(event_id, created_at desc)
  where event_id is not null;
