# D8Advisr Event Venue Attribution and Venue-Page Placement Policy

Policy ID: `event-venue-attribution-placement-v1.0`

Version: `1.0`

Approved: 21 August 2026

Status: approved for Phase 4.6D4 implementation; not yet fully enforced

Owner: D8Advisr

## Purpose and scope

This policy governs events that identify an existing D8 venue as their
location. It serves four separate needs:

- consumers need accurate event-location information;
- organizers need a low-friction way to identify where an event happens;
- venue managers need timely awareness of events claiming their premises and
  control over marketing shown on their venue page; and
- D8 needs attributable evidence and a fair path for resolving disputes.

It supplements the Event Publishing and Change Policy. It does not transfer
event ownership, create ticketing or attendance rights, or authorize one party
to edit another party's listing.

## Two independent decisions

### Venue attribution

Venue attribution is the organizer's factual claim that an event happens at a
specific D8 venue. A persisted attribution may appear on the event page without
venue-page placement approval. The organizer remains responsible for its
accuracy.

Displaying the venue as the event location does not by itself mean that the
venue organizes, sponsors, endorses, sells tickets for, or accepts liability
for the event.

### Venue-page marketing placement

Venue-page placement is revocable permission for the event to appear in the
venue's own public event surfaces, including "Upcoming here". Approval is a
marketing and collaboration decision. It does not make the venue the event
organizer and does not verify every event detail.

The two decisions must use separate state. Declining marketing placement does
not dispute the event location. Reporting an incorrect location does not give
the venue permission to edit or cancel the organizer's event.

## Automatic awareness and request creation

When an organizer successfully saves an event with a D8 venue selected, D8
automatically creates or updates one active attribution notice for that event
and venue. The notice is created from the persisted server state, not a
temporary dropdown click, so abandoned form choices do not notify venues.

Active venue managers receive a durable in-app notification. The notice shows
the event identity, organizer, publication status, schedule, and the linked
venue. Draft status remains visible to the venue manager; a draft never appears
on public venue-page surfaces.

Changing the venue closes the old attribution/placement relationship and
creates a new notice for the new venue. Removing the venue closes the active
relationship. The operation is idempotent so repeated saves do not create
duplicate active notices.

## Venue manager decisions

An active venue manager may:

- **Approve placement:** permit this event to appear on the venue page;
- **Decline placement:** keep the event off the venue page without disputing
  its location;
- **Revoke placement:** remove previously approved marketing permission; or
- **Report incorrect location:** state that the event is not authorized or is
  not expected at the venue.

Approval is standing, revocable permission for the same event ID and venue ID.
It is not approval of a frozen event snapshot.

D8 administrators may make or override placement decisions, remove unsafe or
misleading placement, and resolve location disputes. Every decision records
the actor, server timestamp, previous and new state, and an optional reason.

## Effect of event edits

Ordinary edits preserve an existing placement decision when the event ID and
venue ID do not change. This includes changes to title, description, category,
images, date, time, price, attendance, and other event details.

Material changes governed by the Event Publishing and Change Policy may notify
venue managers for awareness, but do not create routine reapproval work. A
venue manager may review and revoke placement after receiving that notice.

The following rules are deterministic:

- changing to another D8 venue closes the old relationship and starts a new
  automatic request;
- changing to an external or undisclosed location removes venue-page
  placement;
- a declined or revoked placement remains closed through ordinary edits;
- resubmission after decline or revocation requires an explicit organizer
  action;
- pausing or drafting an event removes it from public venue surfaces without
  erasing the decision history;
- cancellation follows the existing cancelled-event visibility rules; and
- an event and venue managed by the same active organization may receive
  server-side automatic placement approval.

D8-managed events still create venue awareness. D8 may approve their placement
as the platform reviewer, while the venue retains the ability to revoke
marketing placement or report an incorrect location.

## Incorrect-location disputes

An incorrect-location report is a high-signal operational dispute, not a
marketing rejection. On submission D8 must:

- record the venue manager, event, venue, reason, and server timestamp;
- notify the organizer and D8 administrators;
- prevent the disputed venue association from being presented as confirmed
  while the dispute is active;
- preserve the event, decision history, and evidence; and
- provide the organizer a correction or response path.

D8 may temporarily display a neutral "Location under review" state, suppress
the venue link, or take other proportionate action while reviewing the claim.
If active interested consumers relied on a public location that is suppressed
or changed, they receive a durable location notification.

D8 resolves the dispute from operational evidence, existing partner history,
communications, and physical verification where appropriate. This MVP workflow
does not require uploads of national identity or business-registration
documents. Repeated deceptive attribution may result in warnings, placement
restrictions, event removal, or partner suspension.

## Responsibilities and boundaries

Organizers must select venues accurately and promptly correct changed or
cancelled arrangements. Venue managers must use decline for marketing choice
and reserve incorrect-location reports for genuine accuracy or authorization
concerns. D8 reviews disputes fairly and may act to protect consumers while
facts are unresolved.

Venue managers can decide placement and report attribution for venues they
manage. They cannot edit the organizer's event, commercial terms, schedule, or
organizer membership. Organizers cannot approve, decline, revoke, or resolve
their own third-party venue placement.

## Operational records and data discipline

The workflow records only operationally required data:

- event and venue IDs;
- organizer and venue organizations;
- attribution and placement states;
- requesting and deciding actors;
- reasons when supplied;
- previous and new state;
- notification linkage; and
- server timestamps.

D8 does not add speculative traffic counters, competition scores, venue
preference models, or response rankings in this phase. Approval, decline,
revocation, dispute, and response records can later answer whether venues value
third-party event traffic, prefer tighter curation, or perceive organizer
events as competing with their own supply.

Records are access-controlled and retained as required for listing integrity,
dispute resolution, safety, legal obligations, and the published privacy
policy.

## Versioning

Placement decisions record the policy version in effect at the time. Material
changes to party rights, public attribution, dispute effects, or collected data
require a new policy version. Historical decisions are not silently rewritten.
