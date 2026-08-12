# Phase 4 Closure Mini Plan: Admin Draft Venue Editing

Status: implementation planned against staging only

Date: 2026-08-12

## Bounded outcome

Allow an authenticated D8 admin to correct creation fields on a non-live venue
created through the D8 admin flow, before approving it in Submissions. This is
not a general venue editor and does not grant any partner, claim, handover, or
post-publication capability.

## Fresh discovery

- Migration parity is clean through
  `20260812100000_admin_listing_creation_integrity.sql` on staging project
  `bntxnjfftikmaqnbskkq`.
- Admin creation stores `source = 'd8_admin'`, a private `created_by`, null
  `partner_id`, and either null ownership for unclaimed venues or the D8Advisr
  platform organization for D8-operated venues.
- The existing admin venue detail and Submissions cards are read-only for core
  listing fields. Tier, status, verification, and inspection actions already
  use purpose-built RPCs.
- Arbitrary admin table updates are not automatically written to
  `venue_change_log`; a direct client update would create an unaudited side
  door.
- `created_by` is intentionally absent from client-safe venue SELECT grants.
  Eligibility must be enforced inside a security-definer RPC, not inferred by
  the browser.
- Read-only staging inventory contains 20 venues: one non-live D8-admin draft
  (`0156b1b1`, `BROWSER TEST`), two live D8-admin venues, two partner-owned
  venues, and legacy/null-source venues. Only the first row is eligible for the
  bounded editor.

## Database contract

Add `admin_update_draft_venue(uuid, jsonb, timestamptz)` with a fixed search
path and these rules:

1. Require an authenticated admin.
2. Lock and load the target row.
3. Require `source = 'd8_admin'`, `partner_id is null`, and a non-live status.
4. Require the caller's last-seen `updated_at`; reject stale writes instead of
   silently overwriting another admin.
5. Reject unknown payload keys. Allow only name, city, category, area, address,
   description, price tier, average cost, cover image, and vibes.
6. Validate required text, non-negative cost, array shape, and sensible length
   limits without introducing Phase 4.5 taxonomies prematurely.
7. Preserve ownership, creator, source, status, activity, verification, tier,
   ratings, coordinates, timestamps unrelated to the edit, and all partner
   authorization fields.
8. Insert one `venue_change_log` row per changed field with the admin actor and
   `admin_draft_correction` reason, in the same transaction.
9. Return the updated venue row.

The RPC may edit an unclaimed or D8-operated admin draft. It may not edit live,
partner-created, partner-owned, imported, community, or legacy/null-source
venues.

## Client boundary

- Expose Edit only in the admin venue detail for eligible rows reported by
  public-safe provenance (`source = 'd8_admin'`, no partner, non-live).
- Use a focused form populated from the selected venue.
- Send the selected row's `updated_at` for concurrency protection.
- Refresh venue data and change history after success.
- Keep tier, ownership, status, verification, publication, and coordinates out
  of this form.
- URL-based cover editing remains a temporary staging compatibility field;
  shared uploads belong to Phase 4.5.

## Verification

- Static migration test checks security, allowlisting, eligibility,
  concurrency, validation, audit insertion, grants, and forbidden-field
  preservation.
- Staging role matrix proves consumer and partner denial.
- Staging tests prove eligible admin draft edits and per-field audit rows.
- Staging tests prove live D8-admin, partner-owned, and legacy/null-source rows
  are denied, and stale `updated_at` is denied.
- Test-created fixtures and audit rows are removed in `finally` cleanup.
- Workspace typecheck, consumer/admin build, database lint, migration parity,
  existing Phase 3/4 regressions, and browser create-edit-approve-discover flow
  pass.

## Intended commits

1. `docs(admin): plan audited draft venue editing`
2. `feat(db): update admin venue drafts safely`
3. `feat(admin): edit admin-created venue drafts`
4. `test(browser): cover admin draft correction flow`

Production promotion remains a separate explicit approval gate.
