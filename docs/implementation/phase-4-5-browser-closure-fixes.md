# Phase 4.5 Browser Closure Fixes

Status: planned for local implementation; database promotion requires explicit approval

Date: 2026-08-13

## Evidence

Browser testing confirmed partner venue approval, rejection privacy, manual area
fallback, gallery soft unlinking, event publication, venue-page placement, and
consumer discovery. It also exposed these defects:

- partner live-revision decisions do not create partner notifications or expose
  the admin rejection reason;
- open-attendance events render as a fabricated 1-person capacity;
- partner event mapping discards fields required to edit an existing event;
- partner event saves discard vibes and reset attendance counts;
- partner venue media cannot be reordered or assigned a new cover;
- refreshing partner editor routes requires a focused recovery regression test.

## Bounded outcome

- Store one durable in-app notification per partner revision decision, including
  a safe rejection/approval note.
- Refresh the signed-in partner inbox when its rows change.
- Rehydrate truthful event edit state, use shared event vibes, preserve existing
  attendance, and render open attendance without capacity scarcity copy.
- Let partners choose the venue cover by reordering the existing gallery.
- Extend static and browser acceptance checks.

## Out of scope

- Email, SMS, browser push, APNs, or FCM delivery.
- Notification preference management, digests, campaigns, and marketing alerts.
- A unified cross-client notification schema or delivery outbox.
- Full partner organization/member audit screens.
- Event approval lifecycle redesign or timezone/localization redesign.
- Production or staging migration promotion without explicit approval.

## Notification evolution

The database notification row is the durable source of truth. Realtime is only a
hint for connected clients to reload authorized rows. Later, a transactional
outbox can fan critical notification events to idempotent email/push workers,
with per-user channel preferences, retry state, provider delivery IDs, and
observability. Push payloads should carry identifiers and navigation targets;
the clients should fetch authoritative content after opening.

## Verification

- Static checks cover revision notification insertion, deduplication, event
  hydration, vibes, preserved attendance, unlimited-capacity presentation, and
  cover selection.
- Partner and consumer typechecks and staging builds pass.
- Staging migration smoke verifies partner-only visibility and decision reason.
- Browser checks cover reject/approve notifications, event edit/reload, open
  attendance, vibes, and venue cover replacement.

## Commit boundaries

1. `feat(partner): notify venue revision decisions`
2. `fix(events): restore partner event editing`
3. `feat(partner): select venue cover image`
4. `docs(testing): record phase 4.5 browser closure`