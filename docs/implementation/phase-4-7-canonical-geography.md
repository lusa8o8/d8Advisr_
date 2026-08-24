# Phase 4.7 - Canonical Geography and Discovery Integrity

Status: Slices 4.7A and 4.7B complete on main. Slice 4.7C is in progress.

Date: 24 August 2026

Priority: immediate production follow-up, before Phase 4.6D4 slice four and
Phase 5 claims

Decision record: `docs/adr/0002-canonical-market-geography.md`

Cross-country validation:
`docs/research/cross-country-discovery-market-validation-2026-08-24.md`

## Outcome

Restore the current Lusaka consumer feed and establish one country-aware,
market-keyed geography contract that can add inactive Livingstone, Kitwe,
Ndola, and Siavonga now and scale to additional African countries without
city-name collisions or country-specific government hierarchy code.

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

### Cross-country model validation

Research against Nigeria and South Africa found that government geography
cannot be D8's product hierarchy:

- Nigeria uses states, an exceptional Federal Capital Territory, and LGAs;
- South Africa uses provinces plus metropolitan, district, and local
  municipalities;
- one administrative area can contain several valid D8 markets, such as
  Kitwe/Ndola in Copperbelt or Johannesburg/Tshwane/Ekurhuleni in Gauteng; and
- practical destination relationships cross ordinary city discovery
  boundaries, such as Lusaka-Siavonga or Cape Town-Winelands.

Accordingly, `regions` is a legacy table name for D8 discovery markets.
Administrative context is generic optional metadata. Listing physical locality
is independent from market membership. No country-specific hierarchy adapter
belongs in Phase 4.7.

## Bounded implementation plan

### Slice 4.7A - urgent canonical discovery reads

No database migration is required for this slice because both environments
already expose `region_id`.

Implementation completed on 24 August 2026:

- consumer Home, upcoming events, and Map now filter by `region_id` and receive
  `activeRegion.id`;
- the partner D8-venue picker filters by the approved application's
  `region_id`, and safely returns no options for an unmigrated application
  rather than guessing from display text;
- partner event reference and currency lookup use `profile.region_id`;
- `test:phase47a:clients` prevents display-city filtering from returning to
  these paths; and
- `test:production:readonly` now exercises the canonical Lusaka feed
  predicates. It confirms 16 live Lusaka venues and reports zero upcoming
  events because main currently contains no future live inventory.

The static/session/typecheck gate and both staging-mode client builds pass.
No schema, RLS, identity, or production data changes were made.
Implementation commit: `eeb32f2`.

Browser evidence recorded on 24 August 2026:

- consumer Lusaka venues render on Home and Map; and
- the partner event editor's D8-venue picker renders the expected Lusaka
  venues. That journey used the staging build, so staging-created venues were
  expected and confirm environment isolation rather than a data leak.

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

Delivery exception accepted on 24 August 2026: because D8Advisr is pre-launch,
the owner explicitly authorized testing and applying this additive slice on the
main project. Staging-first delivery is deferred until post-launch. This does
not authorize destructive migration, consumer/Auth identity mutation, active
market changes, or importing speculative content.

1. Confirm the CLI is linked to main, capture a preflight inventory/available
   backup evidence, and keep the migration additive and forward-repairable.
2. Add `countries`, seed Nigeria and Zambia, and validate ISO country plus UN
   M49 continent codes.
3. Add/backfill `regions.slug`, add the country foreign key, and enforce
   `(country_code, slug)` uniqueness and normalized slugs. Treat `regions.id`
   as opaque; new IDs are country-qualified or otherwise globally unique.
4. Add only nullable generic administrative context fields needed for planned
   markets. Do not add fixed province/state/district/LGA columns or preload a
   national hierarchy.
5. Seed Livingstone, Kitwe, Ndola, and Siavonga under Zambia with
   `is_live = false`, ZMW, and `Africa/Lusaka`; do not invent areas or content.
6. Add the countries reference grants/RLS required for public live-region
   context and administrator management without exposing inactive regions to
   ordinary consumer selection.
7. Additively validate existing country-admin assignments against the catalog;
   do not activate geographic admin enforcement.

Delivered to main on 24 August 2026 through migration
`20260824120000_phase47b_country_market_catalog.sql`:

- Nigeria and Zambia exist in the operational country catalog;
- Lagos/Lusaka have normalized country-scoped slugs and generic ISO
  subdivision context;
- Livingstone, Kitwe, Ndola, and Siavonga exist as inactive, country-qualified
  markets with no invented areas or content;
- country and country-admin foreign keys validated transactionally;
- anonymous clients still see only Lagos and Lusaka; and
- venue/event/private-table baselines and database lint remain unchanged.

Implementation evidence: `47e7a2d` and
`docs/implementation/phase-4-7b-production-delivery.md`.

### Slice 4.7C - canonical profile and listing writes

Delivery decision recorded 24 August 2026: the owner explicitly authorized
4.7C delivery against the main project while the product is pre-launch. The
migration must remain transactional and forward-repairable, must preserve all
consumer identities, and must abort rather than guess at unknown geography.

To keep the write-contract change reviewable, 4.7C is split into two bounded
deliveries:

- **4.7C1 (current):** canonical consumer profile persistence, deterministic
  legacy resolution, required venue/event market keys, server-owned event
  currency, and canonical admin/partner creation writes.
- **4.7C2 (follow-up):** add explicit `region_id` to every admin/partner
  location edit and live-revision audit payload. Until then, existing listing
  location editors retain their compatibility contract and must not be used
  to reinterpret physical locality as a market key.

1. Add nullable `profiles.region_id`, backfill unambiguous Lagos/Lusaka values,
   update generated/shared types and column grants, and preserve unknown values
   for explicit user correction.
2. Update onboarding/settings/useRegion to read and write `profile.region_id`;
   dual-read legacy `city` during the release boundary. Change consumer copy
   from a residence claim to choosing the city or destination to explore first.
3. Update admin and partner listing creation/edit/revision contracts to submit
   `region_id`; derive market-owned timezone and event currency server-side,
   while preserving physical locality/address independently.
4. Replace global name inference with an exact region-ID path and an explicit
   unique-only legacy fallback. Ambiguous or unknown display names fail.
5. Inventory all listing rows in staging, backfill any safe gaps, then make
   venue/event `region_id` non-null. Do not coerce unknown rows.
6. Retain `city` as a physical-locality compatibility field rather than a
   derived market label; column removal belongs to a later measured cleanup.

## Automated gates

Slice 4.7A exposes the first small composable gate; later slices will add the
combined phase and staging database gates:

```powershell
pnpm run check:phase47a
pnpm run build:staging
pnpm run test:production:readonly
```

Automated coverage must prove:

- feed, map, event, and venue-picker queries use `region_id`;
- staging and main capitalization differences cannot change results;
- two test markets may share one slug only in different countries and remain
  distinguishable;
- one administrative context may contain multiple independently selectable
  markets without widening their feeds;
- market selection never overwrites a listing's truthful physical locality;
- unknown/ambiguous legacy city-only writes fail rather than choosing a row;
- inactive Livingstone/Kitwe/Ndola/Siavonga are absent from consumer market
  selection;
- admin reference access remains available;
- profile backfill preserves user UUIDs and unknown legacy values;
- listing market changes preserve physical locality and derive event currency
  correctly;
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
2. **Inactive expansion markets:** Livingstone, Kitwe, Ndola, and Siavonga do
   not appear in consumer onboarding/settings while inactive, but their
   country/market records remain administratively valid.
3. **Listing write parity:** an admin and an eligible partner create/edit a
   staging listing in a selected region; it persists the correct `region_id`,
   displays the region name, and appears only in that region's consumer view.

Upcoming event visibility is checked only with a genuinely future staging
event. Do not alter old production event dates merely to make the feed nonempty.

## Rollout order

1. Deploy the browser-accepted Slice 4.7A client repair.
2. Completed: under the recorded pre-launch exception, the additive 4.7B
   migration was applied directly to main after static/lint/preflight gates.
3. Implement/test 4.7C against staging with client compatibility.
4. Capture a new main preflight inventory and use a production dry run.
5. Promote tested forward migrations, run production read-only checks, then
   deploy clients.
6. Record authenticated consumer/admin/partner browser evidence.
7. Resume the remaining Phase 4.6D4 browser retest and slice-four discovery.

## Stop conditions

- any legitimate profile cannot be mapped without guessing;
- any implementation equates a D8 market with a country's administrative-area
  type or overwrites physical locality from the market label;
- a listing write can still choose a region from an ambiguous display name;
- staging fixtures reveal null `region_id` rows that the plan cannot preserve;
- a migration would rename existing region primary keys; or
- any direct-main change exceeds the explicitly authorized additive 4.7B
  catalog/metadata/seed scope.

## Excluded

- PostGIS/geocoding/radius search;
- nationwide or continent-wide default discovery;
- full region-management UI;
- activating Livingstone, Kitwe, Ndola, or Siavonga;
- a complete African or national administrative-area catalog;
- market-to-market nearby/weekend-trip relationships;
- populating their areas, venues, or events;
- budget/relevance localization beyond canonical region persistence;
- event occurrence generation; and
- D4 dispute slice-four or Phase 5 claim implementation.
