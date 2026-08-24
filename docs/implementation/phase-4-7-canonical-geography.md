# Phase 4.7 - Canonical Geography and Discovery Integrity

Status: discovery and implementation plan complete; implementation not started

Date: 24 August 2026

Priority: immediate production follow-up, before Phase 4.6D4 slice four and
Phase 5 claims

Decision record: `docs/adr/0002-canonical-market-geography.md`

## Outcome

Restore the current Lusaka consumer feed and establish one country-aware,
region-keyed geography contract that can add inactive Livingstone and Kitwe
now and scale to additional African countries without city-name collisions.

## Fresh discovery

### Database

- `regions` currently represents city-level D8 markets and stores raw
  `country_code`, currency, timezone, and `is_live`; there is no countries
  catalog or region slug.
- `region_areas` already enforces `(region_id, slug)` uniqueness and is the
  correct neighbourhood layer.
- venue/event `region_id` foreign keys were added and backfilled in Phase 4.5.
  Public main and staging listing rows inspected on 24 August have non-null
  `region_id` values.
- main public listings use lower-case `city = 'lusaka'`; staging public
  listings use display `city = 'Lusaka'`. Both use `region_id = 'lusaka'`.
- Phase 4.5 triggers derive `region_id` from either region ID or display name,
  but the compatibility function uses a global `limit 1`. That becomes
  nondeterministic when two countries contain the same city name.
- `profiles` has only a legacy `city` field with a capitalized Lagos default.
  Consumer onboarding/settings store a region ID in that field, while older
  profiles may contain display names.
- partner applications already have `region_id`; partner organizations and
  multiple legacy RPC snapshots still retain display `city` for compatibility.
- admin access assignments already distinguish platform, country, and region
  scopes, but `country_code` is not yet backed by a countries foreign key and
  enforcement is deliberately deferred.

### Clients

- `useVenues` and `useEvents` filter `.eq('city', city)`.
- Home discovery and map pass `activeRegion.name`, introduced by `a18067f` to
  repair the staging display-name shape. That exact workaround now hides main
  venues.
- the partner event D8-venue picker also filters live venues by display city.
- `useRegion` treats `profiles.city` as a region ID and defaults local state to
  Lagos before profile resolution.
- admin forms select region display names and listing RPC payloads primarily
  submit `city`; triggers then derive canonical reference fields.
- partner onboarding already selects a region ID, but partner event/editor
  call sites inconsistently pass `profile.city` as either an ID or a label.

### Release/testing gap

The production read-only smoke verified raw counts and privacy, but did not
execute the exact feed predicate. It therefore passed while the UI returned an
empty venue feed. A production-safe canonical-filter assertion is required.

The six main events are dated April-July 2026. Their absence from an upcoming
feed is expected and is not repaired by geography work. One legacy monthly
event has no normalized future occurrence; Phase 4.6F remains responsible for
occurrence modeling.

## Bounded implementation plan

### Slice 4.7A - urgent canonical discovery reads

No database migration is required for this slice because both environments
already expose `region_id`.

1. Change consumer venue/event hooks to accept a region ID and filter
   `region_id`, with naming/types that make display-city misuse difficult.
2. Pass `activeRegion.id` from Home Discovery and Map.
3. Change the partner D8-venue picker to accept/filter the partner's canonical
   region ID rather than parsing display city text.
4. Add executable client-contract checks covering feed, map, and partner venue
   selection; forbid new discovery `.eq('city', ...)` predicates.
5. Extend `test:production:readonly` with the exact live Lusaka venue predicate
   and the upcoming-event predicate. A zero upcoming-event result is valid
   only when raw future-event inventory is zero and must be reported clearly.
6. Run typechecks and both builds, verify against staging locally, then verify
   the main consumer locally before a small production deployment.

This slice restores the main venue feed without waiting for the schema work.

### Slice 4.7B - country-aware region catalog

1. Relink the CLI to staging before creating or applying a migration. Main is
   never the first target.
2. Add `countries`, seed Nigeria and Zambia, and validate ISO country plus UN
   M49 continent codes.
3. Add/backfill `regions.slug`, add the country foreign key, and enforce
   `(country_code, slug)` uniqueness and normalized slugs.
4. Seed Livingstone and Kitwe under Zambia with `is_live = false`, ZMW, and
   `Africa/Lusaka`; do not invent areas or content.
5. Add the countries reference grants/RLS required for public live-region
   context and administrator management without exposing inactive regions to
   ordinary consumer selection.
6. Additively validate existing country-admin assignments against the catalog;
   do not activate geographic admin enforcement.

### Slice 4.7C - canonical profile and listing writes

1. Add nullable `profiles.region_id`, backfill unambiguous Lagos/Lusaka values,
   update generated/shared types and column grants, and preserve unknown values
   for explicit user correction.
2. Update onboarding/settings/useRegion to read and write `profile.region_id`;
   dual-read legacy `city` during the release boundary.
3. Update admin and partner listing creation/edit/revision contracts to submit
   `region_id`; derive display city, timezone, and event currency server-side.
4. Replace global name inference with an exact region-ID path and an explicit
   unique-only legacy fallback. Ambiguous or unknown display names fail.
5. Inventory all listing rows in staging, backfill any safe gaps, then make
   venue/event `region_id` non-null. Do not coerce unknown rows.
6. Retain `city` as a derived compatibility projection; column removal belongs
   to a later measured cleanup.

## Automated gates

The phase should expose small composable commands:

```powershell
pnpm run check:phase47
pnpm run check:phase47:staging
pnpm run build:staging
pnpm run test:production:readonly
```

Automated coverage must prove:

- feed, map, event, and venue-picker queries use `region_id`;
- staging and main capitalization differences cannot change results;
- two test regions may share one display name/slug only in different countries
  and remain distinguishable;
- unknown/ambiguous legacy city-only writes fail rather than choosing a row;
- inactive Livingstone/Kitwe are absent from consumer region selection;
- admin reference access remains available;
- profile backfill preserves user UUIDs and unknown legacy values;
- listing region changes derive display city and event currency correctly;
- anonymous/private RLS boundaries do not widen; and
- migration replay, optimistic revisions, D4 venue relationships, and existing
  Phase 4.6 gates remain green.

Staging smoke fixtures must be isolated, idempotent, and cleaned up. They may
create two same-name regions in different country fixtures but must never run
against main.

## High-level browser acceptance

Keep manual acceptance to three journeys:

1. **Consumer discovery:** a Lusaka consumer sees the expected Lusaka venues
   on Home and Map; switching to another live region cannot leak Lusaka rows.
2. **Inactive expansion markets:** Livingstone and Kitwe do not appear in
   consumer onboarding/settings while inactive, but their country/region
   records remain administratively valid.
3. **Listing write parity:** an admin and an eligible partner create/edit a
   staging listing in a selected region; it persists the correct `region_id`,
   displays the region name, and appears only in that region's consumer view.

Upcoming event visibility is checked only with a genuinely future staging
event. Do not alter old production event dates merely to make the feed nonempty.

## Rollout order

1. Implement, verify, commit, and deploy Slice 4.7A.
2. Relink CLI to staging; implement and test 4.7B migration there.
3. Implement/test 4.7C against staging with client compatibility.
4. Capture a new main preflight inventory and use a production dry run.
5. Promote tested forward migrations, run production read-only checks, then
   deploy clients.
6. Record authenticated consumer/admin/partner browser evidence.
7. Resume the remaining Phase 4.6D4 browser retest and slice-four discovery.

## Stop conditions

- any legitimate profile cannot be mapped without guessing;
- a listing write can still choose a region from an ambiguous display name;
- staging fixtures reveal null `region_id` rows that the plan cannot preserve;
- a migration would rename existing region primary keys; or
- production would become the first environment for a new migration.

## Excluded

- PostGIS/geocoding/radius search;
- nationwide or continent-wide default discovery;
- full region-management UI;
- activating Livingstone or Kitwe;
- populating their areas, venues, or events;
- budget/relevance localization beyond canonical region persistence;
- event occurrence generation; and
- D4 dispute slice-four or Phase 5 claim implementation.
