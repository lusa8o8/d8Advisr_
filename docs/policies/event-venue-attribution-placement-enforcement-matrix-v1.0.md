# Event Venue Attribution and Placement Enforcement Matrix

Policy ID: `event-venue-attribution-placement-v1.0`

Matrix version: `1.0`

Approved: 21 August 2026

## Separate state

Attribution state:

```text
uncontested -> disputed -> resolved
```

Marketing-placement state:

```text
requested -> approved / declined -> revoked
```

Closed relationships may also be `withdrawn` when the organizer removes or
changes the venue. Attribution and marketing state must never be collapsed into
one ambiguous status.

## Deterministic actions

| Action | Authorized actor | Attribution result | Placement result | Notifications |
| --- | --- | --- | --- | --- |
| Persist D8 venue on event | Authorized organizer or admin | Uncontested notice created | Requested | Venue managers |
| Persist own-organization venue | Authorized organization member | Uncontested notice created | Server auto-approved | Venue activity inbox |
| Approve marketing placement | Venue manager or admin | Unchanged | Approved | Organizer |
| Decline marketing placement | Venue manager or admin | Unchanged | Declined | Organizer |
| Revoke approved placement | Venue manager or admin | Unchanged | Revoked | Organizer |
| Organizer explicitly resubmits | Event manager | Unchanged | Requested | Venue managers |
| Organizer changes D8 venue | Event manager | Old relationship withdrawn; new uncontested notice | Old withdrawn; new requested or auto-approved | Old and new venue managers |
| Organizer removes D8 venue | Event manager | Relationship withdrawn | Withdrawn | Venue managers when previously active |
| Ordinary event edit | Event manager | Unchanged | Preserve decision | Venue managers only when material awareness is useful |
| Report incorrect location | Venue manager or admin | Disputed | Suppressed from venue page | Organizer and admins; affected consumers if public location changes |
| Correct/remove disputed venue | Event manager | Withdrawn or pending resolution | Withdrawn | Venue managers and admins |
| Resolve dispute as valid | Admin | Resolved as confirmed | Restore prior placement unless separately declined/revoked | Organizer and venue managers; affected consumers |
| Resolve dispute as incorrect | Admin | Resolved as invalid/withdrawn | Withdrawn | Organizer and venue managers; affected consumers |
| Cancel event | Event manager or admin | Retain history | Not shown as upcoming; cancelled visibility rules apply | Existing cancellation recipients |
| Unauthorized status mutation | Any unauthorized actor | Block | Block | Audit denied attempt when operationally justified |

## Invariants

- One active event/venue attribution relationship exists per event.
- Repeated saves are idempotent and do not duplicate venue notices.
- Organizer clients cannot write `approved`, `declined`, `revoked`, `disputed`,
  or `resolved` states.
- Venue managers cannot edit the event or its ownership.
- Approval uses active organization membership, with a temporary audited
  legacy-owner compatibility path until Phase 6 completes.
- Public venue-page queries show only live, approved placement.
- Public event details may identify an uncontested venue regardless of
  placement approval and must not describe that as sponsorship or endorsement.
- A disputed attribution is not presented as a confirmed venue association.
- Ordinary event revisions cannot silently reopen declined/revoked placement or
  reset approved placement.
- Changing `venue_id` always closes the old relationship transactionally.

## Required record

Each transition stores actor, organization, event, venue, policy version,
previous/new state, optional reason, and server timestamp. No derived analytics
counters are required for MVP.
