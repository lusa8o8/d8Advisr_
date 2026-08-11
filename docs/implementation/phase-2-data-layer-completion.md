# Phase 2 Mini Plan: Admin and Partner Data-Layer Completion

Status: in progress

Date: 2026-08-11

## Bounded outcome

Complete the behavior-preserving data-layer seams required before the
organization ownership migration:

- remove direct Supabase queries and mutations from `AdminPanel.tsx`;
- split partner application, venue, event, analytics, and review operations out
  of the monolithic `usePartner.ts` hook;
- retain the existing hook and component APIs so routes and pages do not change.

## Fresh discovery

- `AdminPanel.tsx` is 1,800 lines after the earlier model extraction and still
  contains every admin Supabase query, RPC call, and inspection insert.
- `usePartner.ts` is 658 lines and combines row mapping, date/payload building,
  application onboarding, venue/event CRUD, placement review, demand signals,
  reviews, React state, and refresh orchestration.
- Partner pages consume only the public `usePartner()` return contract.
- No database migration, policy, RPC signature, route, or query payload needs
  to change for this extraction.
- The unrelated deletion at `artifacts/d8advisr-partner/public/images` remains
  outside this phase and must not be staged.

## Implementation slices

### Admin boundary

- Add a focused admin listing data module containing the existing table reads,
  RPC mutations, and inspection insert.
- Keep loading, optimistic state, error presentation, refresh ordering, and UI
  decisions in `AdminPanel.tsx`.
- Preserve every selected column, filter, ordering clause, and RPC parameter.

Commit: `refactor(admin): extract listing data operations`

### Partner boundary

- Add modules for partner models, applications, venues, events, and insights.
- Keep React state and orchestration in `usePartner.ts`.
- Preserve the `usePartner()` return contract and all page call sites.
- Preserve current legacy `partner_id` behavior until the Phase 3 additive
  ownership foundation is designed and migrated.

Commit: `refactor(partner): split partner domain operations`

## Out of scope

- Organization tables, memberships, claims, or provenance fields.
- RLS, grants, triggers, RPCs, generated database types, or remote database
  changes.
- New admin creation forms or partner claim UI.
- Route, authentication, styling, deployment, dependency, or package cleanup.
- Broad formatting or renaming established product terminology.

## Verification

1. Confirm direct Supabase calls are absent from `AdminPanel.tsx` and isolated
   by partner domain.
2. Run consumer and partner TypeScript checks after their respective slices.
3. Run consumer and partner production builds.
4. Run the full authenticated staging smoke suite.
5. Run `git diff --check` and inspect each staged boundary independently.

## Rollback

Each slice is a source-only refactor with no persisted-state change. Reverting
its focused commit restores the former component/hook implementation.
