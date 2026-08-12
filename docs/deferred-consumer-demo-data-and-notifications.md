# Deferred: Consumer Demo Data and Notification Persistence

Status: confirmed during Phase 4 local browser testing

Observed: 2026-08-12

## Confirmed behavior

### Saved plans

- The five rows on My Plans come from a local PLANS constant.
- The page does not query the authenticated user's public.plans rows.
- Counts, filtering, costs, statuses, locations, and links are demo values.
- Several downstream plan detail/edit/overview screens also use fixed IDs or
  local stop data and require fresh review before persistence work.

### Consumer notifications

- NotificationsCenter renders fixed JSX rather than persisted notifications.
- Mark all read has no handler.
- Not for me only changes component state and returns after refresh.
- Links target demo venue/plan IDs in several cases.
- The existing partner_notifications table serves the partner workflow; it is
  not a suitable consumer inbox contract without a deliberate redesign.

## Product risk

Demo content shown inside an authenticated account looks like real private
data. It undermines trust, makes empty-state testing impossible, and can route
users to nonexistent or unrelated records.

## Recommended boundary

Do not silently seed demo plans or notifications into real accounts. Until the
persisted flows exist, authenticated production-like builds should show honest
empty states or clearly labeled development-only fixtures.

Implement in separate bounded phases:

1. Persisted plan list/detail/edit flow using plans, plan_members, and
   plan_stops with owner/member RLS and real empty/loading/error states.
2. Consumer notification domain with typed events, recipient ownership,
   read/dismiss state, deep-link validation, retention, and idempotent
   generation.
3. Replace or isolate remaining demo IDs in plan generation, reviews, budget,
   notification links, and detail pages.

## Acceptance criteria

- A new consumer sees zero plans and an honest empty state.
- Consumers see only plans they own or are authorized to join.
- Creating/editing/deleting a plan survives refresh and another session.
- Notifications belong to the authenticated recipient and survive refresh.
- Mark-read, mark-all-read, dismiss, and deep links persist and are authorized.
- No production-like page presents unlabeled hardcoded personal activity.
- Automated RLS tests cover cross-consumer plan and notification isolation.
