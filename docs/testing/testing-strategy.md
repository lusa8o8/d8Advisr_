# D8Advisr Testing Strategy

Status: required delivery framework

Updated: 20 August 2026

## Purpose

Every phase must prove behavior at four boundaries: pure/client contracts,
PostgreSQL and RLS, real browser journeys, and build/release integrity. A green
UI alone is not proof of authorization, and a green database smoke test is not
proof of usable browser behavior.

## Test layers

### Layer 1 - fast static and contract checks

Run after each bounded edit. These scripts inspect migrations and integration
points for required and forbidden contracts. They are fast and do not mutate a
Supabase project.

```powershell
Set-Location H:\d8Advisr_
pnpm run test:phase46a:static
pnpm run test:phase46a:clients
pnpm run test:session-lifecycle:static
```

New phases follow the same naming convention:

- `test:phaseNN:static` for migration/security structure;
- `test:phaseNN:clients` for shared client integration; and
- focused scripts for cross-phase contracts such as session lifecycle.

Static source-string checks are guardrails, not behavioral proof. Pure domain
classifiers and parsers introduced in Phase 4.6B should receive executable
table-driven tests rather than only source inspection.

### Layer 2 - TypeScript and build checks

Run affected package typechecks during implementation and the workspace check
before a commit. Workspace concurrency is fixed at one because parallel
TypeScript processes exhausted memory on the external-drive workstation.

```powershell
Set-Location H:\d8Advisr_
pnpm run typecheck
pnpm run build:staging
```

`build:staging` verifies both deployable clients. Bundle-size and browserslist
warnings are recorded but do not fail a phase unless they indicate a new
regression.

### Layer 3 - staging database and RLS smoke tests

These tests use only the dedicated staging project
`bntxnjfftikmaqnbskkq`. They may create stable, named fixtures and must be
idempotent. They must refuse to run against any other project reference.

```powershell
Set-Location H:\d8Advisr_
pnpm run check:phase46a:staging
```

Each database slice must cover:

- anonymous, consumer, partner, other-partner, admin, and service boundaries as
  applicable;
- successful writes and every important bypass attempt;
- idempotency and optimistic concurrency;
- public visibility versus private draft/revision visibility;
- audit/notification side effects; and
- deterministic legacy/backfill exceptions.

Never use production as the first migration test. Production promotion is a
separate explicit decision after staging migration inventory, smoke checks,
browser acceptance, and rollback reasoning.

### Layer 4 - browser acceptance

Browser testing uses the consumer/admin and partner staging clients locally.
Test high-level journeys rather than reporting every click as a separate test.
Each phase should normally have three to five browser groups.

```powershell
# PowerShell window 1
Set-Location H:\d8Advisr_
pnpm run dev:consumer:staging

# PowerShell window 2
Set-Location H:\d8Advisr_
pnpm run dev:partner:staging
```

For each group record:

- identity and client;
- starting record/state;
- high-level action;
- expected public and private outcomes;
- pass/fail;
- visible error and Network response on failure; and
- whether refresh, back/forward navigation, or a second client changes the
  result.

Browser acceptance always includes session isolation, refresh/draft recovery,
duplicate-submit behavior, and consumer visibility when the feature crosses
clients. Console extension noise is not an application failure unless the
Network request or first-party source identifies the app.

## Phase gate commands

Phase 4.6A currently exposes three explicit gates:

```powershell
Set-Location H:\d8Advisr_
pnpm run check:phase46a
pnpm run check:phase46a:staging
pnpm run check:phase46a:release
```

- `check:phase46a` is the non-network commit gate.
- `check:phase46a:staging` is the deployed database/RLS gate.
- `check:phase46a:release` adds both staging client builds.
- Browser acceptance remains manual and is recorded in the phase checklist.

Future phase scripts must preserve this split so a local check never silently
mutates staging and a staging check can never target production accidentally.

Phase 4.6D2 follows the same split:

```powershell
Set-Location H:\d8Advisr_
pnpm run check:phase46d2
pnpm run check:phase46d2:staging
pnpm run check:phase46d2:release
```

Phase 4.6D4 currently exposes the local and staging gates below. The staging
gate creates isolated relationship/notification fixtures and cleans them up;
it refuses to run outside the dedicated staging project.

```powershell
Set-Location H:\d8Advisr_
pnpm run check:phase46d4
pnpm run check:phase46d4:staging
pnpm run build:staging
```

The two high-level slice-three partner journeys are recorded separately in
`docs/testing/phase-4-6d4-local-browser-checklist.md`. Consumer/admin dispute
acceptance is added only with slice four.

## Migration checklist

Before applying a new migration:

1. Re-read every earlier migration/function/policy that the new migration
   replaces or depends on.
2. Inventory affected staging rows and invalid legacy states.
3. Write static assertions for names, grants, constraints, trigger ordering,
   and forbidden legacy paths.
4. Apply only to staging.
5. Run role, bypass, idempotency, backfill, and visibility smoke tests.
6. Run both client typechecks/builds and focused browser journeys.
7. Commit the migration separately from client integration when practical.
8. Document forward rollback/repair; never rewrite an applied migration.

## Completion standard

A phase is complete only when implementation, automated checks, browser
evidence, documentation, and commits agree. “Automated complete, browser
pending” is a valid interim status but not phase closure. A test failure is
fixed or explicitly recorded with owner, risk, and next action; it is never
silently converted into a deferred item.
