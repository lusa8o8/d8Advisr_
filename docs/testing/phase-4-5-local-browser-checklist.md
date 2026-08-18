# Phase 4.5 Local Browser Checklist

Date: 2026-08-12

Closed: 2026-08-18

Status: complete. The user confirmed that all partner-venue, admin-venue,
venue-media, and notification browser cases passed. Cross-user media-path
isolation is covered by `scripts/staging-phase45-media-smoke.mjs`. Event
commercial, attendance, and revision cases are now governed by Phase 4.6 and
are not Phase 4.5 closure gates.

Purpose: verify the shared listing references, media, and partner live-revision
workflow in the real clients before any production migration proposal.

## Before starting

- Run `pnpm run test:local:browser-env`.
- Run `pnpm run test:staging:phase45`.
- Start the consumer/admin client with `pnpm run dev:consumer:staging`.
- Start the partner client in another terminal with
  `pnpm run dev:partner:staging`.
- Use only staging identities and staging data.

## Admin listing creation and draft editing

Browser evidence, 2026-08-12:

- Draft creation, Submissions placement, approval, consumer visibility, live
  correction, and initial cover upload passed.
- Repeated post-success clicks created four separate venues because the client
  cleared its idempotency key after each success while retaining the form.
  The client now clears the form, disables the completed submission, and
  requires an explicit **Create another** action.
- Draft/live editing now uses the shared six-image gallery editor. Upload,
  reorder cover, add multiple images, soft unlink, and URL fallback require a
  browser retest.
- Real venue detail pages now use saved gallery images and vibes, approved venue
  events, real rating/count state, and named price levels. Fabricated contact
  and review content is hidden for real database venues.

- [x] Create a draft venue and confirm country/currency are derived from region.
- [x] Confirm category is selected from the shared venue catalog.
- [x] Select a reviewed area, then confirm manual area fallback remains usable.
- [x] Confirm price level is a finite ordinal choice rather than free text.
- [x] Select finite vibes and confirm arbitrary new vibe text cannot be entered.
- [x] Upload a valid cover image and confirm its preview and saved public URL.
- [x] Confirm invalid file types and oversized files show a useful error.
- [x] Edit the saved draft and confirm canonical values and media reload.
- [x] Submit once and confirm the completed form clears and cannot be resubmitted
  until **Create another** is selected.
- [x] Submit/approve it and confirm the consumer sees one listing, not duplicates.
- [x] Add multiple images, make a different image the cover, and soft-unlink an
  image in both draft and live revision flows.
- [x] Confirm the consumer venue gallery matches the saved image order and no
  demo gallery/contact/review content appears for the real venue.

## Admin live revision

- [x] Open an eligible D8-admin-created live venue.
- [x] Change a low-risk field and a high-risk field.
- [x] Confirm the low-risk field applies while the current public high-risk
  value stays unchanged.
- [x] Reject once and confirm the public high-risk value remains unchanged.
- [x] Submit again, approve, and confirm the consumer sees the approved value.

## Partner shared editor and media

- [x] Sign in as the staging partner and open the venue editor.
- [x] Confirm category and reviewed-area choices match the admin catalogs.
- [x] Confirm manual area fallback is available and visibly identified.
- [x] Upload valid images and save them successfully. Six 1080x1350 images were
  preserved in the pending revision, approved by admin, and rendered in the
  consumer feed on 2026-08-12.
- [x] Confirm another user's storage path cannot be used or overwritten. The
  staging media smoke test denies cross-user path writes, and storage/RLS
  policies restrict update and delete to the path owner.

Browser evidence, 2026-08-13:

- Rejection preserved the consumer listing and approval published the proposal.
- The manual area fallback worked.
- Removing one of six partner gallery images stayed private during review and,
  after approval, both partner and consumer surfaces showed five images.
- The existing database audit stored the admin review note, but no partner
  notification was created and the partner could not see the rejection reason.
  The local notification migration now requires staging promotion and retest.
- Venue and event editor refresh returned to the dashboard. Existing event edit
  state was incomplete, and an unlimited free event rendered as 0 of 1 spots.
  Local lifecycle/event fixes now require browser retest.

## Partner live revision privacy

- [x] Change description/opening hours plus name/category/address/area or media.
- [x] Save once and confirm the dashboard says the listing is in review.
- [x] Reopen the editor and confirm the pending-review banner is visible and the
  save button is disabled.
- [x] In the consumer client, confirm low-risk values changed but high-risk
  values did not.
- [x] In admin, confirm the revision is labeled as a partner revision and shows
  all proposed fields and image previews.
- [x] Reject it and confirm the old public high-risk values remain.
- [x] Submit a revision, approve it, and confirm the consumer sees the
  approved values without the listing becoming inactive.
- [x] Confirm the partner can edit again after the decision.

## Event references reclassified to Phase 4.6

Browser evidence, 2026-08-13: a partner-created live event appeared in consumer
discovery, under the venue's Upcoming section, and in its Events tab. The form
still needs a complete edit/reload retest after the local hydration and vibe
changes.

These cases are retained as Phase 4.6 regression inputs rather than testing the
direct-write event behavior that the policy implementation will replace:

- Create/edit an admin event and a partner event.
- Confirm both use the shared event category catalog.
- Confirm event currency follows the selected region.
- Confirm venue placement and existing event publication behavior still works.

## Notification and editor closure

- [x] Reject a partner venue revision with a note and confirm one unread partner
  inbox item contains the reason while the live listing remains unchanged.
- [x] Approve a partner venue revision and confirm one approval notification is
  created without duplicating on reload.
- [x] Leave the partner inbox open, decide a revision as admin, and confirm the
  unread badge/inbox refreshes without signing in again.
- [x] Refresh the partner venue editor and confirm the route and recovered form
  state remain intact.
- [x] Reorder partner venue photos, select a different cover, approve it, and
  confirm partner and consumer gallery order match.

Partner-event hydration, attendance, free-entry, and paid-entry cases move to
the Phase 4.6 commercial-integrity browser suite.

## Failure capture

For any failure, record the route, identity role, exact steps, visible message,
Console error, and failing Network request method/status/response. Do not apply
Phase 4.5 migrations to production until every required item above is checked or
explicitly accepted as a documented exception.
