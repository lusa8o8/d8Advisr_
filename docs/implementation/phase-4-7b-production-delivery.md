# Phase 4.7B production delivery evidence

Status: complete

Date: 24 August 2026

Project: main Supabase `evfftzhrucwwfnertiup`

Migration: `20260824120000_phase47b_country_market_catalog.sql`

Implementation commit: `47e7a2d`

## Authorized exception

The owner explicitly authorized direct-main delivery while D8Advisr is
pre-launch and deferred staging-first migration practice until post-launch.
The exception was bounded to additive country/market catalog changes and
inactive seeds. It did not authorize Auth/profile/listing mutation, destructive
schema changes, market activation, or content import.

## Preflight

- linked project ref: `evfftzhrucwwfnertiup`;
- local/remote history matched through `20260822003000`;
- live catalog contained only Lagos and Lusaka;
- public baseline: 16 venues, 6 events, 2 live regions, 13 categories, and 49
  vibes;
- canonical Lusaka predicate returned all 16 live venues;
- anonymous reads of plans, partner applications, and consumer notifications
  returned HTTP 401;
- encryption snapshot self-test passed;
- Supabase reported WAL-G enabled but no managed backup entries and no PITR;
- credentials for a new encrypted workspace snapshot were not present in this
  shell. The earlier encrypted production snapshot remains recorded outside
  the workspace; and
- the owner accepted proceeding under the pre-launch exception with
  transactional abort checks and forward repair.

## Gates before apply

- `pnpm run check:phase47b` passed;
- all workspace typechecks passed;
- both staging-mode client builds passed;
- `supabase db lint --linked --level warning` returned no findings; and
- `supabase db push --linked --dry-run` identified exactly one pending
  migration.

The migration itself refused/rolled back on unknown existing country codes,
country/slug collisions, unnormalizable slugs, or invalid country-admin
assignments. It contained no profile, venue, event, Auth, delete, or activation
mutation.

## Applied result

- migration `20260824120000` appears in both local and remote history;
- countries: Nigeria (`NG`) and Zambia (`ZM`), both Africa M49 `002`;
- live markets: Lagos and Lusaka, each with normalized slug and generic ISO
  administrative context;
- inactive markets: `zm-livingstone`, `zm-kitwe`, `zm-ndola`, and
  `zm-siavonga`;
- all four inactive markets use ZMW, `Africa/Lusaka`, country-qualified IDs,
  and reviewed ISO subdivision context;
- no areas, venues, events, or other content were created; and
- post-apply linked database lint returned no findings.

The CLI emitted a non-blocking warning that it could not cache the migration
catalog because Docker Desktop was unavailable. The SQL migration had already
applied successfully, remote history recorded it, and all independent API/lint
checks passed.

## Post-deploy smoke

- public venues: 16;
- public events: 6;
- public live regions: 2;
- public countries: 2;
- canonical Lusaka venues: 16;
- upcoming Lusaka events: 0, matching the known absence of future main
  inventory;
- inactive expansion markets visible anonymously: 0;
- canonical live market metadata: 2 rows;
- anonymous private-table checks: HTTP 401; and
- production read-only smoke: pass.

The initial post-deploy smoke selected `countries.id`, but the table correctly
uses ISO `code` as its primary key. This was a test-harness error only; it was
corrected in `f41223a`, after which the complete smoke passed.

## Next boundary

Phase 4.7C moves consumer profiles and listing writes to canonical market IDs
while preserving truthful physical locality. It is a separate mutation slice
and requires fresh discovery, a mini-plan, and an explicit decision on direct
main versus staging delivery.
