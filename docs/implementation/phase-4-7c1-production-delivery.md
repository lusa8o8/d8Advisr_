# Phase 4.7C1 - Canonical Write Foundation

Authenticated browser acceptance passed on 24 August 2026. Consumer discovery,
admin listing writes, partner application scope, map switching, currency, and
market isolation behaved as expected against the main project.

Status: complete on main

Date: 24 August 2026

Environment: main Supabase project, under the owner's explicit pre-launch
production-first exception

## Outcome

Make a D8 discovery market a first-class write key without changing consumer
identity, guessing unknown locations, or overwriting a listing's truthful
physical locality.

## Discovery findings

- consumer profiles still store a market ID in the legacy `city` field;
- the listing compatibility trigger uses an unordered global `limit 1` and
  rewrites `city` from a region display name;
- admin creation RPCs accept only display `city` even though listings already
  have `region_id`;
- partner applications already contain the canonical `region_id`, but new
  partner venues/events do not persist it explicitly; and
- event currency is still supplied by clients in several creation paths.

## Mini-plan

1. Add nullable `profiles.region_id`, backfill only unique legacy matches,
   remove the silent Lagos default for new profiles, and retain `city` for a
   one-release dual-read/dual-write boundary.
2. Add one deterministic resolver: explicit IDs must exist; legacy display
   names must match exactly one market; unknown or ambiguous values fail.
3. Replace listing triggers so `region_id` validation and market-owned event
   currency do not overwrite physical `city`.
4. Abort if any existing venue/event cannot be safely resolved, then require
   `region_id` on both tables.
5. Make admin and partner creation submit a canonical market ID. Preserve
   current physical locality text independently.
6. Add static contract checks, typecheck/build, database lint/preflight, apply
   the migration to main, and run the read-only production smoke.

## Explicit boundary

4.7C1 does not redesign listing location-edit/revision audit payloads. Those
become 4.7C2 so region changes can be represented explicitly in history rather
than inferred from a changed `city` string.

## Production delivery evidence

Migration `20260824150000_phase47c1_canonical_write_foundation.sql` was applied
to main on 24 August 2026. It completed transactionally, which proves every
existing venue and event had a deterministic market key; otherwise its stop
checks would have rolled the migration back.

Post-apply checks:

- local and remote migration history match through `20260824150000`;
- linked database lint reports no schema errors;
- public inventory remains 16 venues and 6 events;
- the canonical Lusaka venue predicate still returns all 16 venues;
- Lagos/Lusaka remain the only anonymously visible markets and four inactive
  Zambia markets remain hidden;
- anonymous access to plans, partner applications, and consumer notifications
  remains HTTP 401;
- `pnpm run check:phase47c1` passes; and
- both consumer and partner staging-mode builds pass.

Managed backup inventory remained empty and PITR remained disabled. That risk
was explicitly accepted for this pre-launch production-first delivery and is
not a post-launch precedent.

## High-level browser acceptance

1. **Consumer discovery city:** sign in as an existing consumer, open
   Settings -> Location -> City, and select a different *live D8 discovery
   market* (currently Lagos or Lusaka). Here "city/destination" means this
   discovery choice, not a residential-address change. Refresh, open Home and
   Map, and confirm they remain scoped to the selected market without listings
   from the other market.
2. **Admin creation parity:** in Admin -> Create, create one **draft venue**
   and one **draft event** in Lusaka. The Region selector represents a live D8
   market, not a country. Confirm each draft retains Lusaka; for the event,
   confirm currency displays/returns as ZMW without an editable currency
   choice. Neither draft needs to be published for this contract check.
3. **Partner application and creation:** use a user who has not yet submitted
   a partner application to confirm Step 2 offers the live market selector and
   persists the chosen market. An already approved partner will not see this
   selector: its application `region_id` is the fixed scope used automatically
   by venue/event creation and the D8-venue picker. With an approved partner,
   create one eligible draft and confirm it stays in the application market.

## Current selector behavior

- Main currently exposes two live markets: **Lagos (Nigeria)** and **Lusaka
  (Zambia)**. Production data confirms their labels are `Lagos` and `Lusaka`;
  a listing Region selector that literally displays `Nigeria` is stale or a
  different screen and is not the current catalog response.
- `countries` is a grouping and operational boundary. A country is not a
  selectable feed/listing region. Admin creation currently shows only live
  markets because it shares the `useRegion()` query (`is_live = true`).
- Livingstone, Kitwe, Ndola, and Siavonga are valid but inactive market rows;
  they intentionally do not appear in consumer, admin-creation, or partner
  application selectors yet.
- The admin creation form still initializes its selection to Lusaka. The
  options themselves are database-driven; only that initial default is
  hard-coded and should be removed when the form becomes country/market aware.
- A partner chooses a market on Step 2 of the initial application. The server
  stores both canonical `region_id` and a compatibility display city. Admin
  approval accepts or rejects the application but does not assign a different
  market.
- Once an application is approved, the onboarding form redirects to the
  dashboard. Venue/event creation reads the stored application `region_id`,
  which is why existing Lusaka partners appear automatically scoped to Lusaka.
  There is currently no approved-partner market-change UI or admin reassignment
  control; that should be a deliberate audited workflow rather than a casual
  dropdown.

## Browser follow-up repairs

Consumer/admin/partner acceptance on 24 August exposed three implementation
gaps. Migration `20260824170000_market_presentation_metadata.sql` and commit
`9c123a9` repair them:

- an empty market map now uses database-owned market center/zoom metadata;
  Lagos no longer falls back to the hard-coded Lusaka map center;
- configured countries own their international calling code (`+234` Nigeria,
  `+260` Zambia), and partner application region selection safely pre-fills
  the prefix without overwriting a number the applicant has typed; and
- Admin reloads partner applications, venue listing reviews, and placement
  requests whenever Submissions is opened instead of showing its mount-time
  snapshot indefinitely.

The admin venue workflow remains intentionally:

`create draft -> Submissions listing review -> Approve listing -> live`

Verification metadata and publication status are distinct. A draft does not
need to be marked verified merely to enter Submissions; the earlier appearance
of that dependency was caused by the stale queue.

The first production migration attempt stopped and rolled back transactionally
because the live-center constraint preceded its backfill. The statement order
was corrected before delivery. The applied migration now matches local history,
linked database lint is clean, and the production smoke passes with the user's
new browser-test inventory (17 public venues, 7 events, and one upcoming Lusaka
event).

### Focused retest

1. Select Lagos in consumer Settings and open Map: it should center on Lagos
   even with zero Lagos listings, and show no Lusaka markers.
2. In a new/updateable partner application, select Lagos and then Lusaka while
   the phone field is untouched: the prefix should change from `+234` to
   `+260`. Once a full number is typed, changing the market must not overwrite
   it.
3. Submit a partner application or create an admin venue draft, then open (or
   leave and reopen) Admin -> Submissions: the new item should appear without
   another verification/status action or a full page reload.

## Stop conditions

- any existing listing has no deterministic market;
- the migration would alter or delete a consumer UUID;
- a market selection overwrites listing physical locality;
- an inactive market becomes consumer-visible; or
- RLS/private-table access widens.
