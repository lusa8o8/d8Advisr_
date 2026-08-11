# Phase 3 Mini Plan: Organization Ownership Foundation

Status: local foundation complete — staging application pending approval

Date: 2026-08-11

## Bounded outcome

Add the accepted organization ownership model alongside the existing
`partner_id` authorization model without cutting over any current client,
policy, trigger, notification, analytics function, or account scope.

## Fresh discovery

- All 27 local migrations match the linked staging project through
  `20260811153000_scope_regions_admin_policy.sql`.
- Docker is unavailable, so a local `supabase db reset` cannot be used.
- Staging contains 2 live partner applications, 17 venues, and 5 events.
- Fifteen venues are unowned and two use legacy `partner_id`; both legacy owner
  IDs have live partner applications. All five events are currently unowned.
- `venues.partner_id` and `events.partner_id` remain embedded in capability
  policies, partner queries, demand/review summaries, notifications, change
  logs, placement approval, media storage, and account context.
- The existing foreign keys from listing `partner_id` columns to `profiles`
  prevent dangling profile IDs, but a live application is still the current
  capability source.
- The shared database type is maintained manually in `lib/d8-core/src/supabase.ts`.

## In scope

- Add `partner_organizations`, `partner_organization_memberships`, and
  `partner_organization_claims`.
- Add nullable organization/provenance fields to applications, venues, and
  events.
- Create a deterministic active D8Advisr platform organization.
- Add constraints, indexes, grants, RLS, updated-at triggers, and guarded
  organization capability helpers.
- Protect new ownership/provenance fields from ordinary partner writes while
  retaining legacy listing CRUD.
- Extend shared TypeScript database types.
- Add a read-only post-apply SQL verification script.

## Explicitly out of scope

- Backfilling organizations for either staging or production partner rows.
- Changing or removing `partner_id`.
- Replacing any existing listing policy, RPC, analytics function, notification,
  media path, account scope, or frontend ownership query.
- Admin listing creation, claim approval RPCs, member management, transfer, or
  organization selection UI.
- Applying the migration to staging or production in this commit.

## Schema decisions

- Organizations do not authenticate and never create `auth.users` records.
- Membership is unique per organization/user, with at most one active primary
  owner per organization.
- Claims target organizations and allow only one active pending/disputed claim
  per claimant and organization.
- `created_by` and `source` are immutable once a listing is inserted.
- Non-admin clients cannot assign organization ownership directly.
- Existing rows remain valid with null organization/provenance fields.
- The D8Advisr organization uses the stable UUID
  `00000000-0000-4000-8000-00000000d800`.

## Rollback strategy

Before cutover, a forward rollback migration may drop the new triggers,
helpers, columns, and tables because no existing authorization path depends on
them. The legacy columns and policies remain authoritative throughout Phase 3.

## Verification and acceptance

1. `supabase migration list` shows parity before the new local migration.
2. `supabase db push --dry-run` identifies only the Phase 3 migration.
3. Static SQL checks confirm RLS, grants, constraints, fixed search paths,
   deterministic D8 organization, nullable compatibility columns, and no
   dropped legacy policy/function/column.
4. Shared, consumer, and partner TypeScript checks pass.
5. Both production client builds pass.
6. The existing authenticated staging isolation suite passes unchanged.
7. After separate approval and staging application, run the Phase 3 SQL
   postconditions and add organization role-matrix API tests before production.

## Intended commit

`feat(db): add organization ownership foundation`

Remote migration application remains a separate explicit approval gate.

## Local completion record

- Added the three organization tables, deterministic platform organization,
  nullable compatibility columns, constraints, indexes, RLS, narrow grants,
  updated-at triggers, and guarded capability helpers in one additive migration.
- Preserved every legacy `partner_id` column, policy, helper, RPC, and client
  ownership path; no backfill or cutover is included.
- Added a trigger that records partner provenance on new listings and prevents
  ordinary authenticated users from assigning organization ownership or
  rewriting provenance.
- Replaced broad listing SELECT grants with explicit safe columns so
  `created_by` is not exposed through public or partner queries.
- Replaced listing wildcard queries with pre/post-migration-compatible select
  constants; the clients do not request new columns before deployment order is
  approved.
- Added a dependency-free additive-contract checker and a read-only staging
  SQL postcondition script.
- The migration dry run reports only
  `20260811160000_organization_ownership_foundation.sql` as pending.
- Workspace typechecks, both production builds, the static migration contract,
  `git diff --check`, and the unchanged authenticated staging suite pass.
- PostgreSQL execution and the post-apply role matrix remain pending because
  Docker is unavailable and no remote application was authorized in this phase.
