-- Notification dispatch is an internal helper called by protected revision
-- functions. Browser roles must not be able to manufacture notifications.
revoke all on function public.dispatch_event_change_notifications(
  uuid, uuid, text[], jsonb, jsonb
) from public, anon, authenticated;
