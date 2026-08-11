# Phase 2 Mini Plan: Admin Listing Model Extraction

Status: complete

Date: 2026-08-11

## Outcome

Reduce the size and coupling of `AdminPanel.tsx` by moving its domain types and
deterministic database-row mappers into a focused admin feature module without
changing runtime behavior.

## Fresh discovery

- The consumer TypeScript baseline passes before the change.
- `AdminPanel.tsx` is approximately 105 KB.
- Its leading section contains venue, application, placement, listing-review,
  reverification, inspection, and audit-log types plus pure mapping helpers.
- Queries, mutations, component state, JSX icons, and presentation constants
  are interleaved later in the same file.
- Recent changes to this file cover production cleanup, audit history, media
  review, inspections, health, reverification, and venue actions.

## In scope

- Add `artifacts/d8advisr/src/features/admin/adminListingModel.ts`.
- Move domain/row types and pure formatting/mapping helpers into that module.
- Import the moved symbols from `AdminPanel.tsx`.
- Preserve symbol behavior and query payloads exactly.

## Out of scope

- Query or mutation extraction.
- React state or rendering changes.
- Route, RLS, Supabase, schema, or generated-type changes.
- Renaming product concepts to the proposed organization model.
- Partner client changes.
- General formatting or dependency cleanup.

## Verification

1. `git diff --check`
2. Consumer TypeScript check.
3. Consumer production build.
4. Confirm no Supabase query/RPC string changed.
5. Confirm only the plan, new model module, and `AdminPanel.tsx` are staged.

## Commit

`refactor(admin): extract listing model`

## Completion record

- Extracted admin listing row types, view models, and deterministic mappers into
  `artifacts/d8advisr/src/features/admin/adminListingModel.ts`.
- Kept JSX-backed presentation constants, logging, Supabase operations, React
  state, and rendering in `AdminPanel.tsx`.
- Confirmed the admin panel diff contains no changed Supabase query, mutation,
  or RPC lines.
- `pnpm --filter @workspace/d8advisr run typecheck` passes.
- `pnpm --filter @workspace/d8advisr run build` passes; the pre-existing
  sourcemap, chunk-size, and Browserslist warnings remain non-blocking.
