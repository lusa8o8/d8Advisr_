# Phase 4.5 Mini Plan: Listing Reference Data and Media

Status: planned after Phase 4 draft-edit closure and before listing claims

Date: 2026-08-12

## Why this phase exists

Admin creation, partner editing, consumer onboarding, discovery, ranking, and
future claims currently accept overlapping concepts in inconsistent forms.
Free-text city, category, price tier, and vibes will create spelling variants
that make filtering and relevance scoring unreliable. Solving these only in the
admin form would duplicate work and leave partner-created listings incompatible.

This phase establishes one shared listing vocabulary before claims and handover
work make the data harder to migrate.

## Fresh discovery evidence

- `regions` already stores a stable city ID, display name, country code,
  currency, timezone, and live status for Lagos and Lusaka.
- Listing tables still store city and area as text, while clients sometimes use
  a region ID and sometimes a display name.
- Venue category, price tier, and vibes are free text/text arrays. Admin and
  partner forms therefore cannot guarantee stable algorithm inputs.
- The partner portal already validates and uploads JPG/PNG/WebP images to
  Supabase Storage. The admin form still asks for pasted URLs.
- Venue coordinates are ordinary latitude/longitude columns. No current
  requirement needs geometric containment or spatial joins.

## Canonical geography model

1. Country is derived from the selected region and never typed into a listing
   form. A default is allowed only when the deployment/account context has one
   unambiguous country.
2. A region represents the supported city/market and supplies currency and
   timezone. Add a nullable `region_id` alongside legacy city text, backfill it,
   then dual-read during migration.
3. Add an admin-managed `region_areas` catalog with stable IDs, display names,
   aliases, active state, and provenance. Listings may reference an `area_id`.
4. Keep the existing area text as an explicit fallback when the catalog or an
   external address provider lacks coverage. Record whether an area was
   catalog-selected, provider-suggested, or manually entered; never silently
   present free text as verified geography.
5. External geocoding is assistive, not authoritative. Admins can add a small
   reviewed batch of missing areas without waiting for a third-party provider.

Do not add PostGIS in this phase. PostGIS becomes useful when accurate
coordinates exist and product requirements need distance ordering, radius
search, service areas, or point-in-boundary checks. It does not supply place
names or repair incomplete African address coverage.

## Controlled listing vocabulary

- Venue and event names remain operator-entered text; they are real-world
  proper names, not taxonomy values.
- Categories use stable slugs and admin-managed display labels. Both apps read
  the same active catalog.
- Vibes use a finite shared catalog and stable IDs/slugs. Persist relationships
  in normalized join tables (or an equivalently constrained migration model),
  rather than accepting arbitrary new strings from forms.
- Price tier becomes a region-independent ordinal such as 1-4. Actual average
  cost remains numeric and its currency always comes from the listing region.
- Changes to catalog labels must not change stored identity or algorithm keys.

## Media model

Replace URL-paste fields with a shared validated upload component based on the
existing partner upload behavior. Use listing-scoped object paths, explicit
admin/organization authorization, type/size/dimension checks, and database
metadata that records uploader and listing. Do not grant broad admin writes to
partner-owned paths as a shortcut.

The current URL field may remain during staging as a temporary compatibility
path, but production-facing creation should upload files and store generated
object URLs/paths.

## Ordered mini plan

1. Inventory distinct city, area, category, price-tier, and vibe values in
   staging and production read-only data; define reviewed mappings and unknowns.
2. Add region/area and taxonomy schemas additively, with admin policies,
   constraints, and seed catalogs.
3. Backfill deterministic values and produce an exception report; preserve raw
   fallback text for unresolved areas.
4. Add shared typed data access and selectors, then migrate admin and partner
   forms together.
5. Update consumer filters/onboarding/ranking inputs to use stable keys.
6. Add the shared listing-media upload flow and migrate URL-only UI.
7. Enforce constraints only after reconciliation shows no unmapped required
   values.

## Verification gates

- Unknown region/category/vibe IDs are rejected by the database.
- Country, currency, and timezone are derived from region in every client.
- Admin and partner forms expose identical active catalogs.
- Area fallback remains usable and visibly marked when no catalog entry exists.
- Lagos and Lusaka fixtures prove currency/time/location separation.
- Upload authorization prevents cross-user and cross-organization overwrite.
- Legacy rows retain readable display values throughout dual-read migration.
- Role matrix, both client typechecks/builds, migration tests, and browser
  creation/edit/approval flows pass before claims begin.

## Separate Phase 4 closure

Before this phase, add a bounded audited editor for non-live venues where
`source = 'd8_admin'`. It may correct creation fields before approval, but must
not become a general live-listing editor or grant partner/claim permissions.

