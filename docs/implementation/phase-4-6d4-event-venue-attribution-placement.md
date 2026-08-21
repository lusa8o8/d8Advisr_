# Phase 4.6D4 - Event Venue Attribution, Awareness, and Placement

Status: slices one through three complete; consumer and admin surfaces pending

Decision date: 21 August 2026

Governing policy: [Event Venue Attribution and Venue-Page Placement Policy v1.0](../policies/event-venue-attribution-placement-policy-v1.0.md)

Enforcement matrix: [Event Venue Attribution and Placement Enforcement Matrix v1.0](../policies/event-venue-attribution-placement-enforcement-matrix-v1.0.md)

## Outcome

Selecting a D8 venue automatically informs its managers, public event-location
attribution remains distinct from optional venue-page marketing, inaccurate
claims have a dispute path, and Phase 5 memberships inherit the correct venue
authority without gaining control of organizer events.

This bounded trust-boundary repair is required before Phase 5 claims.

## Fresh discovery

The 21 August code review found that an older placement workflow already
exists, but its current enforcement is unsafe or stale:

- partner UI creates `requested` placement for another venue and
  auto-approves a venue matched by legacy `partner_id`;
- venue managers and admins have placement queues;
- consumer venue pages show only `venue_page_status = approved` events;
- consumer event details show the linked venue regardless of placement status,
  which is consistent with the clarified location-attribution policy;
- the organizer revision RPC accepts `venue_page_status`, so a modified client
  can attempt self-approval;
- draft direct writes can also attempt protected placement states;
- every partner event save recomputes placement, which can reset an approval or
  silently reopen a declined request;
- `set_event_venue_page_status` authorizes only admins or legacy
  `venues.partner_id`, not organization membership; and
- the placement RPC directly mutates a published protected field without the
  v1.1 revision marker, so current live approval can conflict with the event
  integrity trigger.

The current `venue_page_status` column also combines marketing state with
venue-awareness semantics and cannot represent a location dispute cleanly.

## Data contract

Add a dedicated relationship table rather than expanding the overloaded event
column. The minimum record contains:

- event and venue IDs;
- organizer and venue organization IDs;
- attribution state;
- placement state;
- request source and policy version;
- requested, decided, disputed, resolved, and withdrawn actors/timestamps;
- optional party-visible reasons; and
- optimistic-concurrency timestamps.

Enforce one active relationship per event and idempotent creation for the same
event/venue pair. Retain `events.venue_page_status` as a compatibility
projection during a defined dual-read window; do not rewrite applied history.

## Database boundaries

Create dedicated security-definer RPCs for:

1. synchronizing attribution after a persisted event venue selection;
2. approving, declining, revoking, or explicitly resubmitting placement;
3. reporting an incorrect location;
4. correcting or responding to a dispute; and
5. admin dispute resolution.

The database derives actor authority. Event managers may request, withdraw, or
resubmit; venue managers may decide placement and report attribution; admins
may moderate and resolve. Approval checks active organization membership and
temporarily dual-reads legacy ownership until Phase 6.

Remove placement state from organizer-controlled event revision payloads.
Changing `venue_id` synchronizes the relationship transactionally. Ordinary
edits preserve it. Dedicated placement RPCs must cooperate with the published
event trigger without masquerading as commercial event revisions.

## Product changes

### Organizer

- Selecting and saving a D8 venue automatically creates the awareness/request
  record.
- Copy explains that venue identification is public location information and
  venue-page promotion is separately controlled.
- Dashboard shows requested, approved, declined, revoked, or disputed state.
- Declined/revoked placement requires an explicit resubmit action.
- A disputed attribution offers correct/remove and response paths.

### Venue manager

- Durable notification arrives when a persisted event selects the venue.
- Queue actions are Approve placement, Decline placement, and Report incorrect
  location.
- Approved placement can be revoked without editing or cancelling the event.
- Material event updates may create informational awareness without reopening
  approval.

### Consumer

- Event details may show an uncontested venue before marketing approval.
- Copy does not imply venue sponsorship or event ownership.
- Venue pages show only approved live placements.
- Disputed attribution shows a neutral under-review location state and no
  confirmed venue link.
- Interested consumers are notified when a relied-upon public location is
  suppressed or corrected.

### Admin

- Placement and attribution disputes are separate operational queues.
- Admin can decide placement, resolve disputes, and inspect immutable history.
- Admin moderation does not transfer event editing rights to venue managers.

## Minimal notifications

Use durable in-app notifications as the source of truth:

- venue managers: new attribution, venue changed/removed, material awareness;
- organizer: placement decision/revocation and attribution dispute;
- admin: incorrect-location dispute; and
- interested consumers: only a public location suppression or correction that
  may affect plans.

External email/push delivery remains deferred to the shared asynchronous
outbox. Do not create speculative delivery or analytics infrastructure here.

## Mini plan

1. Add the relationship/audit schema, compatibility projection, authorization
   helpers, and transition RPCs.
2. Remove organizer write access to placement decisions and repair event-save
   preservation/reset behavior.
3. Update organizer and venue-manager workflows and durable notifications.
4. Update consumer venue/event rendering and admin dispute operations.
5. Add static, staging role-matrix, notification, and browser acceptance gates.

Commit after each key change.

## Delivery log

### Slice one - database relationship foundation (21 August 2026)

Complete on the dedicated staging project:

- added canonical `event_venue_relationships` and immutable transition audit;
- enforced one active relationship per event and optimistic version checks;
- added organization-first authorization with audited legacy-owner compatibility;
- added synchronization, placement decision/resubmission, dispute response, and
  admin resolution RPCs;
- retained `events.venue_page_status` as a guarded compatibility projection;
- backfilled existing D8 venue selections without emitting historical notices;
- repaired idempotent retry timestamp churn and PostgREST retry loops for
  deliberate stale-version conflicts; and
- passed linked database lint and the staging role/transition matrix.

Slice one intentionally left organizer payload cleanup and automatic
event-write synchronization to the next bounded cutover recorded below.

### Slice two - transactional event-write cutover (21 August 2026)

Complete on the dedicated staging project:

- made the compatibility projection server-derived on every event write;
- neutralized direct draft writes to `venue_page_status` while retaining the
  dedicated placement-RPC projection path;
- synchronized canonical attribution after authenticated event creation and
  persisted venue/location changes;
- preserved relationship decisions and versions across ordinary event edits;
- withdrew the old relationship and created a fresh request when `venue_id`
  changes;
- withdrew active D8 attribution when an event moves to an external or
  undisclosed location;
- wrapped the partner live-revision RPC so modified clients cannot submit
  `venue_page_status`; and
- removed placement derivation and payload fields from the partner client.

The staging mutation journey passed forged placement writes, ordinary-edit
preservation, D8-to-D8 handoff, D8-to-external withdrawal, and fixture cleanup.
Slice three adds organizer/venue-manager workflow surfaces and durable notices;
it does not reopen the event-write authority boundary.

### Slice three - partner workflows and durable notices (21 August 2026)

Complete on the dedicated staging project:

- added a security-definer partner workflow read that exposes only safe event,
  venue, relationship, reason, and authority fields to a relevant organizer or
  venue manager without broadening draft-event table RLS;
- replaced the partner dashboard's legacy `events.venue_page_status` queue and
  adapter calls with canonical relationship IDs and optimistic versions;
- added venue-manager approval, decline, revocation, and incorrect-location
  report actions;
- added organizer placement resubmission, venue correction, and dispute
  response actions while keeping event editing authority separate;
- made factual venue attribution and optional `Upcoming here` marketing state
  explicit in partner copy and state badges;
- emitted deduplicated durable partner notices from immutable audit inserts in
  the same transaction as the relationship transition;
- notified venue managers of persisted attribution/removal and organizers of
  placement decisions or disputes, with opposite-party notices for resubmission
  and dispute responses; and
- made relationship notifications navigate back to the dashboard workflow.

The staging role journey proved organizer/venue-manager safe reads, consumer
isolation, notification-insert denial, one notice per transition and recipient,
and cascading fixture cleanup. Slice four remains responsible for admin dispute
resolution UI and consumer disputed-location rendering/notifications.

## Verification

Automated and staging checks must prove:

- a persisted third-party venue selection creates exactly one requested notice;
- the organizer cannot self-approve through direct writes or modified RPC
  payloads;
- the active venue organization can decide placement and another venue cannot;
- ordinary edits preserve approved, declined, and revoked state;
- venue changes withdraw the old relationship and create the new request
  atomically;
- same-organization events can auto-approve server-side;
- Phase 5-style organization membership grants placement authority without
  granting event edits;
- a location dispute suppresses confirmed attribution and notifies the correct
  parties;
- placement decline does not suppress event-page venue attribution;
- approved live placement alone appears on the venue page; and
- existing event-policy v1.1 and role-isolation tests remain green.

High-level browser acceptance is three journeys:

1. organizer links a third-party D8 venue; venue receives awareness and
   approves marketing placement;
2. organizer edits the approved event; placement persists, then venue revokes
   it without affecting the public event listing; and
3. venue reports an incorrect location; organizer/admin/consumer surfaces show
   the correct dispute and resolution state.

## Deliberately excluded

- no traffic or competition scoring;
- no venue response leaderboard or forced response deadline;
- no ticketing, booking, settlement, or revenue-sharing behavior;
- no automatic semantic reapproval classifier;
- no sensitive identity/business-document upload; and
- no Phase 5 claim submission until this authority boundary passes acceptance.
