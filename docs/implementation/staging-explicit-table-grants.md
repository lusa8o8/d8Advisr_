# Staging Explicit Table Grants

Status: complete

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

## Post-application discovery

- The grants migration applied and migration parity passed.
- `regions` continued returning `401` with PostgREST error `42501` because the
  existing admin policy applied to `PUBLIC` and directly queried `profiles`.
- The correction is a separate forward migration that scopes the admin policy
  to `authenticated` and reuses the existing security-definer
  `public.is_admin_user()` helper.
- Anonymous access to `plans` and `partner_applications` must remain denied.

## Completion record

- `d7c781f fix(db): declare client table grants` added and applied the explicit
  privilege migration to staging.
- `06797d5 fix(db): scope regions admin policy` added and applied the regions
  policy correction to staging.
- All 27 local migration versions match staging.
- The final staging API smoke matrix returned:
  - `200`: `regions`, `venues`, and `events` for anonymous reads;
  - `401`: `plans` and `partner_applications` for anonymous reads.
- Production was not linked or modified.
