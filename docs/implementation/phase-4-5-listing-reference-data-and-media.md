# Phase 4.5 Mini Plan: Listing Reference Data and Media

Status: complete on 2026-08-18; implementation, automated staging verification,
and local browser acceptance passed

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
- Production public RLS exposes 16 live Lusaka venues and six live events.
  Staging admin scope exposes 20 venues and five events. Production was queried
  read-only; no production mutation or privileged connection was used.
- Anonymous production reads of `regions` currently fail because the select
  policy calls profile-dependent logic without the required anonymous table
  privilege. Phase 4.5 must make live-region discovery genuinely public without
  granting anonymous access to `profiles`.

## Reviewed inventory and mappings

The migration preserves every legacy display value while adding stable keys.
Rows that cannot be mapped deterministically remain readable and are reported;
they are never guessed into a taxonomy.

### Regions and areas

- `Lusaka`, `lusaka`, and the stable key `lusaka` map to region `lusaka`.
- `Lagos`, `lagos`, and the stable key `lagos` map to region `lagos`.
- The initial Lusaka area catalog contains the production values Chilenje,
  Haile Selassie, Ibex Hill, Jesmondine, Kabulonga, Leopards Hill, Longacres,
  Mass Media, Matero, Northmead, Olympia, Ridgeway, Thornpark / Great East Road
  Area, and Woodlands.
- The staging-only `manda hill` value is retained as manual fallback text. The
  city-name-as-area value `Lusaka` is also retained as a fallback rather than
  being misrepresented as a reviewed neighbourhood.
- Lagos receives no invented area seed. Admins can add reviewed areas as local
  coverage becomes available.

### Categories

Stable general-purpose categories and deterministic legacy mappings are:

| Stable key | Legacy values |
| --- | --- |
| `restaurant` | Restaurant, Fine Dining, Garden Restaurant |
| `restaurant-bar` | Restaurant & Bar, Local Bar & Grill |
| `cafe-brunch` | Café & Brunch, Brunch & Day Club |
| `event-space` | Café & Events Space |
| `bar-lounge` | Cocktail Bar & Lounge, Rooftop Bar |
| `live-music` | Live Music Venue, Live Music |
| `sports-fitness` | Sports Facility |
| `activity-experience` | Activity, activity |
| `cinema` | Cinema |
| `market-food` | Market & Street Food |
| `nightlife` | Nightlife |
| `social-mixer` | Social & Mixer |

`Test Venue` is an intentional staging-only exception and remains unmapped.
New admin and partner submissions must choose a valid stable category.

### Price levels and vibes

- Legacy `$`, `$$`, `$$$`, and `$$$$` map to ordinal levels 1 through 4.
- Staging-only `K` is an exception because a currency symbol is not a price
  level. It remains in legacy text until corrected through the editor.
- Vibes are normalized case-insensitively and mapped to stable slugs. Exact
  semantic duplicates are consolidated (`Affordable`/`Budget`,
  `Chill`/`Relaxed`, `Art`/`Creative`, and `Cultural`/`Culture`). Distinct
  signals such as Romantic, Date Night, Anniversary, and Intimate stay distinct
  because they can carry different relevance weights later.
- Staging lowercase `outdoor` maps to `outdoor`. `DJ`, found during the
  first staging reconciliation, is a legitimate production signal and has its
  own stable key. Test-only `loud` and `Staging` remain explicit unmapped
  exceptions rather than being silently assigned product meaning.

The exception query is part of the static/staging test harness. Required
canonical columns remain nullable during compatibility; database mutation
contracts reject unknown values for new writes.

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

## Implemented staging result

- Canonical regions, reviewed areas, listing categories, aliases, vibes, and
  ordinal price levels now coexist with legacy display fields through additive
  dual-read and dual-write compatibility.
- Admin and partner listing forms read the same active reference catalogs.
  Currency and timezone come from region data; area supports a visibly manual
  fallback when the reviewed catalog has no match.
- Shared listing media uses uploader-scoped storage paths, validated images,
  public reads, and database metadata. Consumers and cross-user uploads are
  rejected.
- Browser discovery extended admin media from cover-only creation to a bounded
  six-image gallery across creation, draft correction, and reviewed live edits.
  Removing an image soft-unlinks it from the listing while retaining the object
  for audit/recovery. Real venue detail pages render saved galleries and hide
  unsupported demo content.
- Partner edits to live descriptions and opening hours apply immediately.
  Name, category, address, area, cover image, and gallery changes remain private
  until an admin approves them. Approval and rejection are audited.
- A pending partner revision is visible to its owner, hidden from consumers,
  surfaced in the partner dashboard/editor, and cannot be submitted twice.
- Staging smoke tests restore their venue fixture exactly after exercising
  rejection and approval. No production migrations were applied.

Run the automated Phase 4.5 gate with:

`pnpm run test:staging:phase45`

Then complete
`docs/testing/phase-4-5-local-browser-checklist.md` before proposing production
promotion.

## Implementation slices and commit boundaries

1. `docs(phase4.5): record listing value inventory and mappings`
2. `feat(db): add listing reference catalogs` — additive catalogs, canonical
   columns, deterministic backfill, public reads, admin management, and static
   plus staging migration checks.
3. `feat(listings): use shared reference selectors` — one shared query/model,
   dual-write mutation contracts, and admin/partner controls.
4. `feat(media): add shared listing uploads` — shared bucket, uploader-scoped
   object paths, metadata, and role isolation tests.
5. `feat(partner): review high-risk live venue revisions` — partner live edits
   stop changing public high-risk fields before approval.
6. `test(phase4.5): cover local listing workflows` — full role matrix, both
   builds, and a browser checklist before any production migration proposal.

Staging receives each migration after its static check passes. Production stays
read-only throughout Phase 4.5 and requires a separate explicit migration
approval after local and staging closure.

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
