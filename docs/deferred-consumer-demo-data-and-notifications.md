# Deferred: Consumer Demo Data and Notification Persistence

Status: confirmed during Phase 4 local browser testing

Observed: 2026-08-12

Runtime reconfirmed: 2026-08-26

## Immediate containment delivered

The generator and persistence redesign remain deferred, but three misleading or
broken presentation paths were corrected without pretending the demo is real:

- Plan Overview now formats every displayed demo amount through the active
  region's shared `formatPrice` contract instead of hardcoding naira. The demo
  numbers and legacy multiplier are intentionally unchanged for now.
- The mobile Surprise Me floating action is scoped to the discovery feed; Map
  and My Plans no longer render it over their own primary surfaces.
- The mobile home Settings gear routes to `/settings` rather than opening the
  separate preference editor.
- The generated-plan and saved-plan journeys now converge on one reviewable
  saved-plan detail. Saving the demo overview still redirects to `/plan/1`, and
  opening a plan from My Plans opens that same detail, but the misleading
  `Let's Go!` action and simulated `/tracker` execution mode have been removed.
  The detail returns to My Plans and retains only planning-oriented controls.

These corrections do not make plan generation or saving persistent. The
architecture and acceptance criteria below remain the required later work.

## MVP plan lifecycle decision

The consumer journey is a planning loop, not a live execution product:

```text
Discover or Surprise Me
  -> build a plan
  -> review the generated itinerary
  -> save
  -> saved-plan detail
  -> My Plans
```

Reopening an existing plan returns to the same saved-plan detail. Consumers can
review the itinerary, edit it, share it once that action is implemented, and
optionally connect it to a Stash. D8Advisr does not claim to start navigation,
track progress between stops, share a live journey, provide live help, or mark
stops complete at MVP stage.

An event-day companion may be reconsidered only after real plan persistence,
time/location contracts, deep links or navigation handoff, privacy and safety
requirements, and measured consumer demand exist. It must not be inferred from
the current demo plan UI.

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

### Surprise Me and plan overview

- Surprise Me now opens the same compact plan builder used by venue- and
  event-anchored entry points. Generic entry asks only when, who, and budget;
  anchored entry additionally identifies the confirmed venue or event.
- The removed legacy full form is no longer reachable from `/plan/generate`.
  Completing the compact builder still opens the demo PlanOverview and does
  not yet select from the authenticated user's eligible venues or events.
- The three stops, Lagos title/area, stop times, tiers, labels, images, venue
  IDs, and transport legs are fixed constants.
- Costs use a legacy multiplier of 1500 and every amount is rendered with a
  hardcoded naira symbol rather than the selected region currency.
- The 45% Evening Fund state is fixed rather than loaded from a user fund.
- Anchored plan generation can replace only the middle demo stop while leaving
  the remaining Lagos itinerary and cost assumptions intact.
- Saving does not persist a generated plan and redirects to fixed /plan/1.

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
4. Build a plan-generation contract that filters eligible inventory by region,
   visibility, operating/event time, budget, and travel feasibility before
   scoring and assembling stops.

## Acceptance criteria

- A new consumer sees zero plans and an honest empty state.
- Consumers see only plans they own or are authorized to join.
- Creating/editing/deleting a plan survives refresh and another session.
- Notifications belong to the authenticated recipient and survive refresh.
- Mark-read, mark-all-read, dismiss, and deep links persist and are authorized.
- No production-like page presents unlabeled hardcoded personal activity.
- Automated RLS tests cover cross-consumer plan and notification isolation.
- Surprise Me uses real eligible inventory for the selected region and never
  mixes cities, currencies, timezones, or inaccessible listings.
- All stop, transport, total, and fund amounts share one explicit plan currency
  and documented price-unit convention.
- Generated stop IDs resolve to real listings, and save creates a real plan
  that survives refresh instead of redirecting to a fixed ID.
