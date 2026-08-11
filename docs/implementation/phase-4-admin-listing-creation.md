# Phase 4 Mini Plan: Admin Listing Creation

Status: discovery complete; implementation in progress

Date: 2026-08-11

## Bounded outcome

Allow authenticated D8 admins to create venues and events without creating a
fake partner user. Every creation must explicitly choose whether the listing is
unclaimed or operated/organized by D8Advisr and whether it stays a draft or is
published immediately.

## Fresh discovery

- All 28 migrations match the linked staging project through the Phase 3
  organization foundation, and linked database lint reports no schema errors.
- The admin client currently reviews partner applications, venue submissions,
  venue placement requests, inspections, and listing health. It has no venue or
  event creation path.
- The partner editors write directly to listing tables and derive ownership,
  city, capabilities, and publication behavior from a live partner application.
  Reusing those data operations would incorrectly require a partner identity.
- Existing admin RLS permits broad listing management, but direct table inserts
  cannot enforce a single explicit attribution contract or atomically record an
  audit event.
- Consumer venue queries require `is_active = true` and `listing_status =
  'live'`; consumer event queries require `event_status = 'live'`.
- Phase 3 provides the deterministic D8Advisr platform organization
  `00000000-0000-4000-8000-00000000d800`, nullable listing organization fields,
  private `created_by`, and public-safe `source` fields.

## Implementation boundary

1. Add an admin-only listing audit table and two transactional creation RPCs.
2. Require `unclaimed` or `d8advisr` attribution on every RPC call.
3. Keep `partner_id` null. Use a null organization for unclaimed listings and
   the deterministic platform organization for D8Advisr listings.
4. Set `created_by = auth.uid()` and `source = 'd8_admin'` in the database.
5. Default clients to draft creation. Only an explicit publish choice creates a
   live venue/event.
6. Add focused admin creation forms and data functions rather than importing
   partner-account behavior.
7. Include safe provenance fields in consumer reads and render D8Advisr
   attribution for platform-operated listings.

## Explicitly out of scope

- Claims, handover, invitations, organization membership creation, or partner
  account upgrades.
- Backfilling legacy listings or replacing `partner_id` authorization.
- General admin editing of every venue/event field after creation.
- Media upload changes; Phase 4 accepts existing hosted image URLs.
- Production migration or deployment.

## Verification

- Static migration checks cover hardened RPCs, grants, validation, provenance,
  safe defaults, audit insertion, and preservation of legacy ownership.
- A staging API role matrix proves consumers and partners cannot call either
  RPC, admins can create both attribution modes, drafts stay private, live
  content is public, no fake owner is assigned, and audit rows are admin-only.
- Test fixtures are deleted in a `finally` cleanup and their audit rows cascade.
- Shared and consumer TypeScript checks and the consumer production build pass.
- The existing full staging isolation and Phase 3 suites remain green.

## Intended commits

1. `feat(db): add admin listing creation RPCs`
2. `feat(admin): create venues and events`
3. `test(staging): verify phase 4 admin creation`

Production promotion remains a separate explicit approval gate.
