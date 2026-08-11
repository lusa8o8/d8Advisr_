# Staging Explicit Table Grants

Status: migration verified — staging application pending

Date: 2026-08-11

## Outcome

Make table-level privileges on fresh Supabase projects match the operations
already permitted by D8Advisr's RLS policies.

## Fresh discovery

- All 25 historical migrations replayed successfully after the UUID fix.
- Local and staging migration histories match.
- Anonymous API reads succeed for `venues` and `events`.
- Anonymous reads of live `regions` return `401` even though the table has a
  public-live-regions RLS policy.
- The regions migration does not grant table-level `select`.
- Several older consumer tables likewise rely on legacy default grants rather
  than declaring privileges explicitly.
- `partner_applications` returning `401` to anonymous callers is intentional.

## Mini plan

1. Add one forward migration; do not rewrite another applied migration.
2. Revoke implicit privileges from the affected tables.
3. Grant only operations supported by their existing RLS policies.
4. Apply the migration to staging only.
5. Verify migration parity, empty dry run, and anonymous API behavior.

## Intended privileges

- `regions`: anonymous/authenticated read; authenticated write operations are
  still restricted to admins by RLS.
- `plans`, `plan_stops`, and `stash_funds`: authenticated CRUD, restricted by
  owner policies.
- `plan_members` and `stash_members`: authenticated read only.
- `stash_transactions`: authenticated read and insert only.
- `saved_venues`: authenticated read, insert, and delete only.

## Out of scope

- New policies or authorization semantics.
- Production migration application.
- Seed data or test-user creation.
- Ownership/claim schema work.

## Intended commit

`fix(db): declare client table grants`

## Pre-application verification

- The migration contains only table privilege revokes and grants.
- The granted operations match existing RLS policy capabilities.
- `git diff --check` passes.
- The staging dry run reports only
  `20260811150000_explicit_client_table_grants.sql` as pending.
