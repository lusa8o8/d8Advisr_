-- Phase 4.6D4 slice three: partner workflow reads and durable notices.
-- Relationship transitions remain authoritative; notifications are emitted
-- from the immutable audit row in the same transaction as each transition.

alter table public.partner_notifications
  add column if not exists event_venue_relationship_id uuid
    references public.event_venue_relationships(id) on delete cascade,
  add column if not exists deduplication_key text;

create unique index if not exists partner_notifications_deduplication_idx
  on public.partner_notifications(user_id, deduplication_key);

create index if not exists partner_notifications_event_venue_relationship_idx
  on public.partner_notifications(event_venue_relationship_id, created_at desc)
  where event_venue_relationship_id is not null;

create or replace function public.event_venue_party_recipients(
  p_relationship_id uuid,
  p_party text
)
returns table(recipient_user_id uuid)
language sql
stable
security definer
set search_path = public
as $function$
  with relationship as (
    select r.*
    from public.event_venue_relationships r
    where r.id = p_relationship_id
  ), organization_recipients as (
    select membership.user_id
    from relationship r
    join public.partner_organization_memberships membership
      on membership.organization_id = case
        when p_party = 'venue' then r.venue_organization_id
        when p_party = 'organizer' then r.organizer_organization_id
        else null
      end
    join public.partner_organizations organization
      on organization.id = membership.organization_id
    where membership.status = 'active'
      and organization.status = 'active'
      and (
        (p_party = 'venue' and organization.organization_type in ('venue_operator', 'both'))
        or (p_party = 'organizer' and organization.organization_type in ('event_organizer', 'both'))
      )
  ), legacy_recipients as (
    select case
      when p_party = 'venue' then venue.partner_id
      when p_party = 'organizer' then event_row.partner_id
      else null
    end as user_id
    from relationship r
    join public.events event_row on event_row.id = r.event_id
    join public.venues venue on venue.id = r.venue_id
  )
  select user_id from organization_recipients
  union
  select user_id from legacy_recipients where user_id is not null;
$function$;

revoke all on function public.event_venue_party_recipients(uuid, text)
  from public, anon, authenticated;

create or replace function public.enqueue_event_venue_party_notification(
  p_audit_id uuid,
  p_party text,
  p_type text,
  p_title text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  audit_row public.event_venue_relationship_audit;
begin
  if p_party not in ('venue', 'organizer') then
    raise exception 'invalid_event_venue_notification_party' using errcode = '22023';
  end if;

  select * into audit_row
  from public.event_venue_relationship_audit
  where id = p_audit_id;

  if not found then
    raise exception 'event_venue_relationship_audit_not_found' using errcode = 'P0002';
  end if;

  insert into public.partner_notifications (
    user_id,
    event_venue_relationship_id,
    type,
    title,
    body,
    metadata,
    deduplication_key
  )
  select
    recipient.recipient_user_id,
    audit_row.relationship_id,
    p_type,
    p_title,
    p_body,
    jsonb_build_object(
      'route', '/dashboard',
      'event_id', audit_row.event_id,
      'venue_id', audit_row.venue_id,
      'relationship_id', audit_row.relationship_id,
      'relationship_action', audit_row.action,
      'relationship_version', audit_row.new_state -> 'version'
    ),
    'event-venue:' || audit_row.id::text || ':' || p_party
  from public.event_venue_party_recipients(audit_row.relationship_id, p_party) recipient
  on conflict (user_id, deduplication_key) do nothing;
end;
$function$;

revoke all on function public.enqueue_event_venue_party_notification(
  uuid, text, text, text, text
) from public, anon, authenticated;

create or replace function public.dispatch_event_venue_relationship_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  event_name text;
  venue_name text;
begin
  select event_row.title, venue.name
  into event_name, venue_name
  from public.events event_row
  join public.venues venue on venue.id = new.venue_id
  where event_row.id = new.event_id;

  event_name := coalesce(event_name, 'An event');
  venue_name := coalesce(venue_name, 'your venue');

  case new.action
    when 'created' then
      perform public.enqueue_event_venue_party_notification(
        new.id,
        'venue',
        'action',
        'New venue attribution: ' || event_name,
        case when new.new_state ->> 'placement_status' = 'approved'
          then event_name || ' identifies ' || venue_name || ' as its venue. Placement is already approved because both listings share an owner.'
          else event_name || ' identifies ' || venue_name || ' as its venue. Review whether it may also appear under Upcoming here.'
        end
      );
    when 'withdrawn' then
      perform public.enqueue_event_venue_party_notification(
        new.id, 'venue', 'system',
        'Venue attribution removed: ' || event_name,
        event_name || ' no longer identifies ' || venue_name || ' as its venue.'
      );
    when 'placement_approved' then
      perform public.enqueue_event_venue_party_notification(
        new.id, 'organizer', 'approval',
        'Venue-page placement approved: ' || event_name,
        venue_name || ' approved this event for its Upcoming here section.'
      );
    when 'placement_declined' then
      perform public.enqueue_event_venue_party_notification(
        new.id, 'organizer', 'review',
        'Venue-page placement declined: ' || event_name,
        venue_name || ' declined this event for its Upcoming here section. The event listing remains available.'
      );
    when 'placement_revoked' then
      perform public.enqueue_event_venue_party_notification(
        new.id, 'organizer', 'review',
        'Venue-page placement removed: ' || event_name,
        venue_name || ' removed this event from its Upcoming here section. The event listing remains available.'
      );
    when 'placement_resubmitted' then
      perform public.enqueue_event_venue_party_notification(
        new.id, 'venue', 'action',
        'Venue-page request resubmitted: ' || event_name,
        event_name || ' has asked again to appear under Upcoming here for ' || venue_name || '.'
      );
    when 'attribution_disputed' then
      perform public.enqueue_event_venue_party_notification(
        new.id, 'organizer', 'action',
        'Venue attribution disputed: ' || event_name,
        venue_name || ' reported that this event may not be taking place there. Correct the venue or add a response.'
      );
    when 'dispute_response_added' then
      perform public.enqueue_event_venue_party_notification(
        new.id, 'venue', 'review',
        'Organizer responded: ' || event_name,
        'The organizer responded to the venue attribution dispute for ' || venue_name || '.'
      );
    when 'dispute_resolved_confirmed' then
      perform public.enqueue_event_venue_party_notification(
        new.id, 'organizer', 'approval',
        'Venue attribution confirmed: ' || event_name,
        'D8 confirmed ' || venue_name || ' as the event venue.'
      );
      perform public.enqueue_event_venue_party_notification(
        new.id, 'venue', 'approval',
        'Venue attribution confirmed: ' || event_name,
        'D8 confirmed the event attribution to ' || venue_name || '.'
      );
    when 'dispute_resolved_invalid' then
      perform public.enqueue_event_venue_party_notification(
        new.id, 'organizer', 'review',
        'Venue attribution removed: ' || event_name,
        'D8 found the attribution to ' || venue_name || ' invalid and removed it.'
      );
      perform public.enqueue_event_venue_party_notification(
        new.id, 'venue', 'approval',
        'Venue attribution removed: ' || event_name,
        'D8 found this event attribution invalid and removed it from ' || venue_name || '.'
      );
    else
      null;
  end case;

  return new;
end;
$function$;

revoke all on function public.dispatch_event_venue_relationship_notification()
  from public, anon, authenticated;

drop trigger if exists dispatch_event_venue_relationship_notification
  on public.event_venue_relationship_audit;
create trigger dispatch_event_venue_relationship_notification
  after insert on public.event_venue_relationship_audit
  for each row execute function public.dispatch_event_venue_relationship_notification();

create or replace function public.get_partner_event_venue_workflows()
returns table (
  relationship_id uuid,
  event_id uuid,
  venue_id uuid,
  event_title text,
  event_category text,
  event_status text,
  event_starts_at timestamptz,
  venue_name text,
  organizer_name text,
  placement_status text,
  attribution_status text,
  request_source text,
  decision_reason text,
  dispute_reason text,
  response_reason text,
  resolution_reason text,
  relationship_version bigint,
  requested_at timestamptz,
  updated_at timestamptz,
  can_manage_event boolean,
  can_manage_venue boolean
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    relationship.id,
    relationship.event_id,
    relationship.venue_id,
    event_row.title,
    event_row.category,
    event_row.event_status,
    event_row.starts_at,
    venue.name,
    coalesce(organizer.name, organizer_profile.display_name, 'Event organiser'),
    relationship.placement_status,
    relationship.attribution_status,
    relationship.request_source,
    relationship.decision_reason,
    relationship.dispute_reason,
    relationship.response_reason,
    relationship.resolution_reason,
    relationship.version,
    relationship.requested_at,
    relationship.updated_at,
    public.can_manage_event_attribution(relationship.event_id, auth.uid()),
    public.can_manage_venue_placement(relationship.venue_id, auth.uid())
  from public.event_venue_relationships relationship
  join public.events event_row on event_row.id = relationship.event_id
  join public.venues venue on venue.id = relationship.venue_id
  left join public.partner_organizations organizer
    on organizer.id = relationship.organizer_organization_id
  left join public.profiles organizer_profile
    on organizer_profile.id = event_row.partner_id
  where auth.uid() is not null
    and relationship.is_active
    and (
      public.can_manage_event_attribution(relationship.event_id, auth.uid())
      or public.can_manage_venue_placement(relationship.venue_id, auth.uid())
    )
  order by relationship.updated_at desc;
$function$;

revoke all on function public.get_partner_event_venue_workflows()
  from public, anon;
grant execute on function public.get_partner_event_venue_workflows()
  to authenticated;
