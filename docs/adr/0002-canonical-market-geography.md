# ADR 0002: Canonical Market Geography

Status: accepted for Phase 4.7 implementation

Date: 24 August 2026

## Context

D8Advisr is proving the marketplace in individual African cities, but the
geography contract must support continent-wide expansion without treating city
display names as identifiers. Zambia is expected to expand from Lusaka to
Livingstone and potentially Kitwe; other countries will add their own markets.
City names, spelling, capitalization, and aliases are not globally unique.

The current schema is partly normalized:

- `regions` holds Lagos and Lusaka with country, currency, and timezone data;
- `region_areas` is correctly scoped beneath a region;
- venues and events have a canonical `region_id`; and
- partner applications also have `region_id`.

However, the compatibility `city` columns still leak into active contracts.
Consumer discovery and map queries filter `city` using `activeRegion.name`,
the partner D8-venue picker filters `city`, admin listing forms submit region
display names, and consumer profiles store a region ID in a field named
`city`. The legacy reference trigger resolves a display name across every
country with `limit 1`, which would silently choose the wrong market when two
regions share a name.

This is already a production defect rather than only future design debt:

- staging public listings use `city = 'Lusaka'` and `region_id = 'lusaka'`;
- main public listings use `city = 'lusaka'` and `region_id = 'lusaka'`; and
- commit `a18067f` repaired staging by querying the display city name, causing
  main discovery to return no venues after promotion.

The main database still contains 16 active live Lusaka venues and 6 Lusaka
events. The events are not currently eligible for the feed because their start
dates are in the past; recurrence/occurrence normalization is a separate event
domain problem.

## Decision

### Geographic levels

D8Advisr uses this bounded hierarchy:

```text
continent grouping
  -> country
    -> region (a D8 discovery market, normally a city or metro)
      -> region area (reviewed neighbourhood/locality)
        -> venue or event
```

`region_id` remains the leaf-level discovery key. Ordinary feeds and maps are
region-scoped. Country and continent are grouping, administration, expansion,
and later browsing scopes; they do not make the ordinary feed country-wide or
continent-wide.

### Country catalog

Add a small `countries` catalog with:

- ISO 3166-1 alpha-2 `code` as the primary key;
- display `name`;
- UN M49 `continent_code` (`002` for Africa);
- an activation flag; and
- timestamps/audit ownership consistent with other reference catalogs.

Seed only countries already required by real configuration: Nigeria and
Zambia. Do not preload the entire continent without an operational need.

`regions.country_code` becomes a foreign key to `countries.code`. Existing
admin country assignments should reference the same catalog additively, but
country/region admin enforcement remains outside this phase.

### Region identity

`regions.id` remains a stable, opaque, globally unique text key. Existing IDs
`lagos` and `lusaka` do not change; changing them would create consumer and
foreign-key risk without adding product value.

Add a lower-case URL-safe `regions.slug` and enforce uniqueness on
`(country_code, slug)`. Human-facing routes and labels may use country plus
slug, while all database relationships continue to use `region_id`. Clients
must never derive an ID from a city name.

Seed Livingstone and Kitwe under Zambia as `is_live = false`. Inactive regions
are available to administrators/reference workflows but remain hidden from
consumer onboarding and discovery until deliberately activated. No areas are
invented for those markets in this phase.

### Canonical reads and writes

- Discovery, map, event, and D8-venue-selection queries filter `region_id`.
- Listing creation and location changes submit `region_id`.
- PostgreSQL resolves and persists the display `city` and event currency from
  the selected region; clients do not treat display text as authority.
- Legacy city-only payloads remain temporarily compatible only when the city
  maps to exactly one region. Zero or multiple matches fail explicitly; SQL
  must not use an unordered `limit 1` fallback.
- After staging data validation, live and draft venues/events require a valid
  `region_id`. The compatibility `city` columns remain derived display fields
  until all downstream consumers are migrated and measured.

### Consumer profile

Add nullable `profiles.region_id` referencing `regions(id)`, backfill it from
the existing `profiles.city` value where the match is unambiguous, and grant
the user read/write access required for onboarding and settings. New clients
read and write `region_id`; `city` remains a dual-read compatibility field for
one release boundary.

Profiles with an unknown legacy city are not guessed, deleted, or silently
assigned to Lagos. They remain nullable and are asked to choose a live region.
The broader budget/currency/relevance redesign stays in its existing deferred
workstream.

## Consequences

Positive:

- Lusaka, Livingstone, Kitwe, and future markets share one deterministic model;
- duplicate city names across countries cannot collide;
- capitalization and localization of display names cannot empty a feed;
- inactive expansion markets can be configured safely; and
- country/region admin scopes have a validated geography catalog to build on.

Costs:

- listing RPCs and edit/revision payloads need a controlled compatibility
  migration;
- profile and listing types gain canonical region fields; and
- reference-data tests must cover duplicate display names across countries.

## Deliberately excluded

- PostGIS, geocoding-provider adoption, radius search, and routing;
- a continent-wide default feed;
- country/region administrator enforcement;
- speculative areas for inactive markets;
- budget purchasing-power normalization;
- event recurrence generation; and
- renaming or deleting legacy `city` columns in the same release.
