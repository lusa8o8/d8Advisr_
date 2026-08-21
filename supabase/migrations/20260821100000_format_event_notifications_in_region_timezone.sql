-- Material schedule notifications must use the event region's local time,
-- not the database session timezone (UTC).
create or replace function public.dispatch_event_change_notifications(
  p_event_id uuid,
  p_revision_id uuid,
  p_changed_fields text[],
  p_previous_values jsonb,
  p_proposed_values jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  target_event public.events;
  recipient record;
  dispatch_count integer := 0;
  notification_type text := 'system';
  notification_title text;
  notification_body text;
  old_free boolean;
  new_free boolean;
  old_price numeric;
  new_price numeric;
  old_start timestamptz;
  new_start timestamptz;
  location_label text;
  event_timezone text;
  event_time_label text;
begin
  select * into target_event from public.events where id = p_event_id;
  if target_event.id is null then return 0; end if;

  select region.timezone into event_timezone
  from public.regions region
  where region.id = target_event.region_id
     or lower(region.name) = lower(target_event.city)
  order by case when region.id = target_event.region_id then 0 else 1 end
  limit 1;

  event_timezone := coalesce(event_timezone, 'UTC');
  event_time_label := coalesce(nullif(target_event.city, ''), event_timezone);

  if 'price_pp' = any(p_changed_fields) or 'is_free' = any(p_changed_fields)
    or 'currency' = any(p_changed_fields) then
    notification_type := 'event_price_changed';
    notification_title := 'Entry update: ' || target_event.title;
    old_free := coalesce((p_previous_values ->> 'is_free')::boolean, false);
    new_free := coalesce((p_proposed_values ->> 'is_free')::boolean, target_event.is_free, false);
    old_price := coalesce((p_previous_values ->> 'price_pp')::numeric, 0);
    new_price := coalesce((p_proposed_values ->> 'price_pp')::numeric, target_event.price_pp, 0);
    if new_free then
      notification_body := target_event.title || ' is now free entry.';
    elsif old_free then
      notification_body := target_event.title || ' now has an entry price of ' || target_event.currency || new_price || '.';
    elsif new_price > old_price then
      notification_body := target_event.title || ' entry price increased from ' || target_event.currency || old_price || ' to ' || target_event.currency || new_price || '.';
    else
      notification_body := target_event.title || ' entry price changed from ' || target_event.currency || old_price || ' to ' || target_event.currency || new_price || '.';
    end if;
  elsif 'starts_at' = any(p_changed_fields) or 'ends_at' = any(p_changed_fields)
    or 'weekday' = any(p_changed_fields) or 'frequency' = any(p_changed_fields) then
    notification_type := 'event_rescheduled';
    notification_title := 'Schedule update: ' || target_event.title;
    old_start := nullif(p_previous_values ->> 'starts_at', '')::timestamptz;
    new_start := coalesce(nullif(p_proposed_values ->> 'starts_at', '')::timestamptz, target_event.starts_at);
    notification_body := target_event.title || ' moved from '
      || to_char(old_start at time zone event_timezone, 'Dy Mon DD, HH12:MI AM') || ' to '
      || to_char(new_start at time zone event_timezone, 'Dy Mon DD, HH12:MI AM')
      || ' (' || event_time_label || ' time).';
  elsif 'venue_id' = any(p_changed_fields)
    or 'event_location_kind' = any(p_changed_fields)
    or 'external_location_name' = any(p_changed_fields)
    or 'external_location_address' = any(p_changed_fields) then
    notification_type := 'event_relocated';
    notification_title := 'Location update: ' || target_event.title;
    location_label := coalesce(
      nullif(p_proposed_values ->> 'external_location_name', ''),
      nullif(p_proposed_values ->> 'external_location_address', ''),
      'a different venue or location'
    );
    notification_body := target_event.title || ' has moved to ' || location_label || '.';
  else
    notification_title := 'Event update: ' || target_event.title;
    notification_body := target_event.title || ' has updated details that may affect your plans.';
  end if;

  for recipient in
    select distinct user_id from public.event_interests
    where event_id = p_event_id and active = true
  loop
    insert into public.consumer_notifications (
      user_id, event_id, type, title, body, metadata
    ) values (
      recipient.user_id,
      p_event_id,
      notification_type,
      notification_title,
      notification_body,
      jsonb_build_object(
        'revision_id', p_revision_id,
        'changed_fields', p_changed_fields,
        'previous_values', p_previous_values,
        'proposed_values', p_proposed_values,
        'event_timezone', event_timezone
      )
    )
    on conflict do nothing;
    dispatch_count := dispatch_count + 1;
  end loop;

  return dispatch_count;
end;
$function$;
