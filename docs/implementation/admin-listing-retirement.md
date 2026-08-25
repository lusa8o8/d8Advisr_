# Admin Listing Retirement

Status: Slice 1 is implemented and committed locally. Main-project migration
delivery is waiting only for the encrypted pre-migration snapshot; Slice 2 has
not started.

Decision date: 25 August 2026

## Outcome

Give administrators a safe way to remove obsolete seeded, imported, unclaimed,
or D8-admin-created venues and events from D8Advisr without silently erasing
consumer history, audit evidence, or linked listings.

The administrator-facing action is **Retire listing**, not a raw SQL delete.
Physical purge remains a separate maintenance operation and is not exposed in
the MVP UI.

## Discovery findings

### Current client behavior

- The admin client reads venues and events and exposes edit, review, listing
  status, verification, publication, and event cancellation actions.
- It has no venue or event retirement/delete operation.
- Admin directory reads currently return every row, with no retired-state
  filter because neither table has a retirement contract.
- Consumer venue discovery already depends on both `listing_status = 'live'`
  and `is_active = true`. Consumer event discovery depends on live status, with
  the deliberate short-lived cancelled-event behavior handled separately.

### Current database behavior

- Authenticated admins still have broad `FOR ALL` RLS policies on `venues` and
  `events`; partner-specific delete policies also still exist. UI absence, not
  an intentional retirement contract, is the main reason admins cannot perform
  the requested operation safely.
- A database trigger already rejects deletion of any event whose
  `first_published_at` is set. That invariant must remain.
- The current status constraints do not include an archive/retired state:
  venues use `draft`, `submitted`, `under_review`, `live`, `needs_update`, or
  `hidden`; events use `draft`, `live`, `paused`, `past`, or `cancelled`.
- Seeded Lusaka rows were inserted before `source`, `created_by`, and
  organization ownership columns existed. These legacy rows can therefore have
  `source IS NULL`; eligibility cannot rely on a fictitious `source = 'seed'`
  value.
- Current admin creation writes use `source = 'd8_admin'`. A platform
  organization may be present for D8 attribution, while an unclaimed admin
  listing may have no operating/organizing organization.

### Why raw deletion is unsafe

The foreign-key graph mixes cascade, restrict, and set-null behavior:

- deleting a venue currently cascades to its `events` rows;
- venue plan stops and venue-linked stash funds can block a venue delete;
- venue reviews, saves, demand signals, reverification tasks, inspections,
  change history, admin audit rows, and revisions can be cascaded away;
- event interests, consumer/partner notifications, revisions, demand signals,
  event-venue relationships, and admin audit rows can be cascaded away;
- event publication acknowledgements restrict event deletion; and
- event-venue attribution history restricts venue deletion.

A raw delete can therefore either fail unpredictably or succeed while erasing
exactly the evidence needed to explain what consumers and administrators saw.
Storage objects are also not transactionally deleted with these rows, so a raw
delete is not a complete media-cleanup operation.

## Proposed lifecycle contract

### Terminology

- **Retire:** reversible administrative removal from normal directories and all
  public discovery. History and relationships remain intact.
- **Restore:** return a retired venue to `draft`, a never-published event to
  `draft`, or an ever-published event to a non-public `paused` state.
  Restoration never silently republishes anything.
- **Cancel:** an organizer/admin statement that a published event will not
  happen. Cancellation notifications and the existing temporary consumer
  visibility remain authoritative.
- **Purge:** irreversible physical deletion after an explicit dependency audit.
  It is an internal maintenance operation, not an MVP UI action.

### Eligibility

The retirement RPC must authorize an admin and then evaluate ownership facts.
An eligible listing is either:

1. `source = 'd8_admin'` and has no partner owner other than the D8 platform
   organization; or
2. a legacy/imported/community row with `partner_id IS NULL` and no active
   non-platform operator/organizer organization.

`source IS NULL` is allowed only through rule 2. This deliberately covers old
seed rows without treating every null source as trusted.

This admin-retirement path must reject partner-owned or claimed listings. Their
lifecycle belongs to the later ownership/claims work and must not be inferred
from a display label.

### State rules

| Target | Current state | MVP treatment |
| --- | --- | --- |
| Venue | non-live eligible listing | Retire immediately after confirmation |
| Venue | live eligible listing, no future live events | Retire immediately after confirmation |
| Venue | any state with future live events | Block; events must first be moved or cancelled explicitly |
| Event | never-published draft | Retire immediately after confirmation |
| Event | upcoming live event | Use cancellation first; do not disguise cancellation as deletion |
| Event | cancelled, past, or otherwise non-live | Retire after confirmation |
| Event | published but paused | Retire only when it is no longer intended to return live; preserve publication history |
| Either | partner-owned/claimed | Reject this admin-only action |

Retirement never cascades into another listing. In particular, retiring a venue
does not delete or retire its events. The future-live-event block makes the
required follow-up explicit rather than guessing whether the event should be
moved or cancelled.

## Implementation plan

### Slice 1 - additive database lifecycle

Create one forward migration that:

1. adds `retired_at timestamptz`, `retired_by uuid`, a required bounded
   `retirement_reason`, and `retired_from_status` to both listings;
2. adds indexes supporting normal `retired_at IS NULL` reads and an admin
   retired directory;
3. adds admin-only, `SECURITY DEFINER` RPCs to retire a venue and an event;
4. locks the selected row, requires `expected_updated_at` and a request key,
   performs the ownership/provenance and dependency checks above, and behaves
   idempotently;
5. writes immutable retirement evidence before changing visibility;
6. adds restore RPCs which clear retirement metadata and restore only to the
   non-public states defined above; and
7. removes direct venue/event `DELETE` capability from authenticated client
   roles, including partner delete policies, while retaining the published
   event deletion trigger as defense in depth.

The venue RPC sets `is_active = false` and uses the existing non-public status
while `retired_at` carries the unambiguous lifecycle meaning. The event RPC
uses a non-live existing status while `retired_at` distinguishes retirement
from cancellation. Adding `retired_at` avoids overloading `hidden`, `paused`,
or `cancelled` and avoids a broad status-enum migration.

Do not remove database rows or storage objects in this slice.

#### Slice 1 implementation evidence

Implemented in migration `20260825130000_admin_listing_retirement.sql` and
commit `9b1a56c`:

- retirement metadata and current/retired indexes on venues and events;
- immutable `listing_retirement_audit` records without destructive listing
  foreign-key cascades;
- admin-only, idempotent, optimistic-concurrency retire/restore RPCs;
- legacy null-source eligibility based on absence of partner ownership;
- upcoming-event cancellation, 24-hour cancellation visibility, and linked
  future-event venue guardrails;
- trigger protection against direct retirement-field changes and all updates
  to already-retired rows;
- removal of browser-role venue/event delete grants and delete policies; and
- replacement of broad admin `FOR ALL` policies with explicit select, insert,
  and update policies.

Verification completed locally:

- `pnpm run check:admin-listing-retirement`;
- Phase 4.6D4 foundation, transactional-sync, and workflow static checks;
- main-project migration parity and dry-run (only migration `20260825130000`
  is pending); and
- main-project anonymous read/isolation smoke: 19 venues, 8 events, canonical
  Lusaka reads intact, and private tables denied.

The main project currently reports no managed backups. Before applying the
migration, run `scripts/production-snapshot-prompt.ps1`; it prompts securely,
writes only an encrypted ignored artifact under `local-backups`, verifies its
round trip, and clears the temporary environment variables.

### Slice 2 - read contracts and admin UI

1. Add retirement fields to the admin venue/event models and fetches.
2. Exclude retired rows explicitly from consumer, partner, placement,
   submission, and default admin operational queries even where current status
   filters already hide them.
3. Add a `Retired` admin filter/directory so removal remains auditable and
   reversible.
4. Add a danger-zone action to venue/event detail views rather than a one-click
   list-row icon.
5. Show a confirmation modal containing the listing name, current public state,
   linked-future-event or interested-consumer impact, and a required reason.
6. For an upcoming live event, route the administrator to the existing
   cancellation flow instead of offering retirement.
7. After success, clear stale selection state and refetch all affected queues.
8. Offer `Restore as draft` for venues/never-published events and
   `Restore as paused` for previously published events; never offer
   `Restore live`.

User-facing failure messages must distinguish unauthorized ownership,
concurrent edits, future live events, cancellation required, and already
retired state.

### Slice 3 - controlled purge tooling (deferred)

Only add irreversible purge tooling if accumulated retired data or media cost
creates a real operational need. It must be service-role/maintenance-only,
produce a dependency report first, preserve required audit records outside the
listing FK cascade, and separate database deletion from storage-object cleanup.
It is not a prerequisite for the admin feature.

## Verification framework

### Automated checks

- Static migration contract: retirement columns, indexes, grants/revokes,
  RPC authorization, concurrency guard, audit write, and future-event block.
- Authenticated role smoke: admin succeeds; consumer and partner RPC calls fail;
  direct client `DELETE` fails for every role.
- Legacy provenance: an unowned `source IS NULL` fixture can retire, but a null
  source with a non-platform organization cannot.
- Visibility: retired venue/event is absent from all public/default operational
  reads while audit, revisions, interests, notifications, and relationships
  remain.
- Event integrity: a published live event cannot be retired without
  cancellation; cancellation behavior and notification delivery remain intact.
- Venue integrity: a venue with a future live event cannot retire; no linked
  event is cascaded or mutated.
- Restore: an eligible retired venue or never-published event restores as draft;
  a previously published event restores as paused. Each remains absent from
  the public feed and can follow its normal review/publication flow.
- Idempotency and conflict: repeated request is safe; stale
  `expected_updated_at` fails without partial writes.
- Workspace typecheck, affected builds, migration lint, and existing Phase 4
  smoke suites remain green.

### High-level browser journeys

1. **Retire and restore admin/seed content:** retire one eligible venue and one
   eligible non-live event from their admin detail pages, confirm they disappear
   from normal admin/public directories, find them under `Retired`, then restore
   them to their permitted non-public states. Confirm neither becomes public
   automatically.
2. **Consumer-impact guardrails:** attempt to retire an upcoming live event and
   confirm the UI requires cancellation; attempt to retire its venue and confirm
   the linked-future-event block. Cancel or move the event through the normal
   flow, then confirm retirement becomes available without losing history.

## Delivery sequence

1. Review and accept this lifecycle contract.
2. Implement Slice 1 and commit the database boundary independently.
3. Run automated migration/role tests before client work.
4. Implement Slice 2 and commit the admin/read-contract boundary.
5. Run the two browser journeys.
6. Update this document with delivery evidence and only then consider the
   detour closed.

Current owner direction is to deliver pre-launch work against the main project
rather than maintain a staging promotion step. Before Slice 1 reaches that
project, run a read-only provenance/dependency inventory, migration parity
check, and production snapshot/preflight. The migration must remain additive
and must not physically delete listing or consumer rows. Reintroduce a
staging-first promotion gate after launch or whenever real-user risk increases.

## Out of scope

- partner self-deletion;
- deleting or suspending partner accounts or organizations;
- claim handover or ownership transfer;
- bulk retirement;
- automated retention periods;
- physical media deletion;
- permanent UI purge; and
- redesigning cancellation, notifications, or consumer ranking.
