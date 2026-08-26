# Phase 4.8 — Consumer Launch Readiness

Status: Phase 4.8A database foundation, admin intake, and Slice 3 consumer
citation/action presentation are delivered. Automated and responsive browser
acceptance passed. The published browser-test import still uses placeholder
source/action URLs and is not launch inventory.

Decision date: 25 August 2026

## Outcome

Bring the consumer application to a coherent MVP launch standard while keeping
the now-sufficient partner/admin boundary stable. The work should improve real
consumer journeys, not add speculative marketplace, analytics, or ownership
infrastructure.

## Working method

Each slice follows fresh discovery, a bounded mini plan, implementation,
automated checks, and one or two high-level browser journeys. Commit after each
stable key change. Do not rely on earlier screenshots, hardcoded-copy reports,
or conversation memory without confirming current code and runtime behavior.

## Discovery inventory

Inspect and classify the current consumer experience across:

- sign-in, session restoration, sign-out, and authenticated route loading;
- onboarding order, destination selection, currency, timezone, and budget;
- Home, Map, search/filter, empty/loading/error states, and market switching;
- venue and event detail data, media, price, availability, contact, and
  cancelled-event states;
- saved/interested state, plans, notifications, and navigation from notices;
- Surprise Me and itinerary generation, especially hardcoded location,
  transport, price, and venue content;
- responsive navigation, accessibility, visual hierarchy, consistency, and
  perceived loading performance; and
- production data dependencies versus demo or hardcoded presentation state.

For every finding, label it as broken, misleading/hardcoded, incomplete,
polish, or deliberately deferred. Record the affected journey and evidence;
do not add analytics counters simply to measure a hypothetical future issue.

## Prioritization rules

The first implementation plan should prioritize, in order:

1. crashes, authentication/session failures, and inaccessible routes;
2. incorrect or misleading location, currency, price, availability, or event
   state;
3. dead-end primary journeys and hardcoded experiences presented as real;
4. responsive/accessibility blockers and destructive state loss; and
5. visual polish that materially improves comprehension or trust.

## Explicitly deferred

- Phase 5 listing claims;
- Phase 6 membership-based RLS cutover;
- Phase 7 broad repository cleanup;
- ticket sales, registration, refunds, and normalized occurrences;
- speculative personalization/relevance algorithms;
- premature behavioral analytics counters; and
- a framework migration or complete visual rewrite without discovery evidence.

## Phase 4.8A prerequisite — event provenance and action links

The proposed launch inventory exposed a trust gap: events cannot currently
retain research evidence or provide a distinct ticket/registration destination.
Do not seed researched events until the bounded contract in
`docs/implementation/phase-4-8a-event-provenance-and-action-links.md` is
implemented and verified.

This prerequisite is intentionally narrow. It adds admin-first provenance and
external-action data, a reviewed draft import path, and consumer detail-page
disclosure. It does not add D8 ticket sales, scraping, affiliate tracking,
partner self-service link edits, speculative analytics, or unrelated category
expansion.

## Initial acceptance shape

Keep browser acceptance journey-level rather than listing every field:

1. A new consumer signs in, completes onboarding for a selected live market,
   and sees location/currency-consistent discovery without losing state.
2. A returning consumer explores Home and Map, opens a real venue and event,
   saves/interests content, receives a relevant notification, and returns to
   the correct detail screen.
3. Mobile and desktop primary navigation remain usable through loading, empty,
   error, refresh, and back/forward states.

Automated tests should own narrower contracts for session lifecycle, canonical
market isolation, formatting, query predicates, persisted state, and mapping of
database rows into consumer-facing models.
