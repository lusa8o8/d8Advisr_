# Phase 4 Extension Mini Plan: Admin Live Venue Revisions

Status: planned for staging implementation

Date: 2026-08-12

## Bounded outcome

Allow D8 admins to maintain live venues created through the admin flow without
letting high-risk edits change consumer-visible data before explicit review.
This phase covers live `d8_admin` venues with no partner owner. It does not
change partner mutation behavior, claim handover, or legacy/null-source venues.

## Fresh discovery

- Local and staging migrations match through the audited draft editor.
- Consumer venue reads require `listing_status = 'live'` and `is_active = true`.
- The current admin detail page exposes the bounded editor only for non-live
  D8-admin venues. Live venues have tier, verification, and inspection actions,
  but no core listing editor.
- `venue_change_log` records applied field changes. It has no representation of
  a proposed value that is not yet public.
- `venue_reverification_tasks` provides an internal admin queue, but has no
  reference to a proposed revision.
- The partner editor currently writes directly to `venues`. Its safety trigger
  creates a re-verification task for sensitive fields only after the new value
  has already reached the live row. This contradicts its UI statement that D8
  reviews sensitive changes before they affect public discovery. Correcting the
  partner workflow requires a separate cross-client migration and is not folded
  into this admin-only phase.
- Read-only staging inventory has 19 live venues: three eligible unclaimed
  `d8_admin` venues (including `0156b1b1`, now `BROWSER TEST 1`), one
  partner-owned venue, and fifteen legacy/null-source venues. All live rows are
  currently verified. The task table contains one dismissed legacy task.

## Risk contract

Low-risk field:

- `description` applies immediately. It is audited as low risk with
  `applied_immediately = true`.

High-risk fields:

- `name`, `city`, `category`, `area`, `address`, `price_tier`, `avg_cost_pp`,
  `cover_image`, and `vibes` never update the public venue during submission.
  They are stored in a private pending revision and linked to an internal review
  task.

Opening hours are intentionally excluded until their input and validation
contract is normalized. Coordinates, tier, ownership, source, creator,
publication, verification, ratings, and review counts are always outside this
editor.

## Database contract

1. Add admin-only `venue_live_revisions` with previous/proposed JSON snapshots,
   submitter/reviewer provenance, status, notes, timestamps, and one-pending-
   revision-per-venue enforcement.
2. Link `venue_reverification_tasks` to a live revision without changing
   existing task behavior.
3. Add `admin_submit_live_venue_revision(uuid, jsonb, timestamptz)`:
   - require admin and exact live D8-admin eligibility;
   - require optimistic concurrency against the last-seen venue timestamp;
   - reject unknown keys and validate values using the draft editor bounds;
   - reject no-op submissions and a second pending high-risk revision;
   - apply/audit description immediately;
   - store only changed high-risk fields privately and create the review task;
   - return a safe JSON result describing immediate and pending fields.
4. Add `admin_review_live_venue_revision(uuid, text, text)`:
   - accept only `approved` or `rejected` for a pending revision;
   - lock the revision and venue;
   - on approval, verify every high-risk baseline value still matches the live
     row, apply the proposal atomically, audit each field, and resolve the task;
   - on rejection, leave public data unchanged, record the decision, and
     dismiss the task;
   - preserve all protected fields in either outcome.
5. Keep current verified live data verified while a proposal is pending because
   the proposal has not changed the public facts. Approval refreshes verification
   timestamps; rejection leaves them untouched.

## Client contract

- Show `Edit live listing` only for eligible live `d8_admin` venues.
- Populate a focused form from the current public row and clearly label which
  field applies immediately versus requires review.
- If a high-risk revision is pending, show its field-by-field comparison and
  hide the new high-risk submission path until it is resolved.
- Expose explicit Approve and Reject controls with loading/error states.
- Refresh venue data, revision data, internal tasks, and audit history after
  every action.
- Keep the URL cover field as temporary staging compatibility; shared uploads
  remain Phase 4.5.

## Verification

- Static tests cover table/RLS/grants, eligibility, allowlisting, concurrency,
  one-pending enforcement, immediate/pending separation, baseline conflict,
  audit insertion, decisions, and protected-field preservation.
- Staging tests prove consumer/partner denial and eligible admin behavior.
- A mixed submission proves description changes immediately while public
  high-risk values remain unchanged.
- Rejection proves public high-risk values remain unchanged.
- Approval proves atomic high-risk application, audit rows, task resolution,
  and verification refresh.
- Partner-owned, legacy/null-source, draft, and stale rows are denied.
- Fixtures, revisions, tasks, and audit rows are cleaned by cascade/finally.
- Existing Phase 3/4 suites, full isolation, typechecks, builds, lint, parity,
  and the local browser checklist pass.

## Intended commits

1. `docs(admin): plan reviewed live venue edits`
2. `feat(db): add reviewed live venue revisions`
3. `feat(admin): edit and review live venue revisions`
4. `test(browser): cover live venue revision workflow`

Production promotion remains a separate explicit approval gate.
