# Phase 4.5 Local Browser Checklist

Date: 2026-08-12

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

- [ ] Create a draft venue and confirm country/currency are derived from region.
- [ ] Confirm category is selected from the shared venue catalog.
- [ ] Select a reviewed area, then confirm manual area fallback remains usable.
- [ ] Confirm price level is a finite ordinal choice rather than free text.
- [ ] Select finite vibes and confirm arbitrary new vibe text cannot be entered.
- [x] Upload a valid cover image and confirm its preview and saved public URL.
- [ ] Confirm invalid file types and oversized files show a useful error.
- [ ] Edit the saved draft and confirm canonical values and media reload.
- [ ] Submit once and confirm the completed form clears and cannot be resubmitted
  until **Create another** is selected.
- [ ] Submit/approve it and confirm the consumer sees one listing, not duplicates.
- [ ] Add multiple images, make a different image the cover, and soft-unlink an
  image in both draft and live revision flows.
- [ ] Confirm the consumer venue gallery matches the saved image order and no
  demo gallery/contact/review content appears for the real venue.

## Admin live revision

- [ ] Open an eligible D8-admin-created live venue.
- [ ] Change a low-risk field and a high-risk field.
- [ ] Confirm the low-risk field applies while the current public high-risk
  value stays unchanged.
- [ ] Reject once and confirm the public high-risk value remains unchanged.
- [ ] Submit again, approve, and confirm the consumer sees the approved value.

## Partner shared editor and media

- [ ] Sign in as the staging partner and open the venue editor.
- [ ] Confirm category and reviewed-area choices match the admin catalogs.
- [ ] Confirm manual area fallback is available and visibly identified.
- [ ] Upload a valid image and save it successfully.
- [ ] Confirm another user's storage path cannot be used or overwritten.

## Partner live revision privacy

- [ ] Change description/opening hours plus name/category/address/area or media.
- [ ] Save once and confirm the dashboard says the listing is in review.
- [ ] Reopen the editor and confirm the pending-review banner is visible and the
  save button is disabled.
- [ ] In the consumer client, confirm low-risk values changed but high-risk
  values did not.
- [ ] In admin, confirm the revision is labeled as a partner revision.
- [ ] Reject it and confirm the old public high-risk values remain.
- [ ] Submit a second revision, approve it, and confirm the consumer sees the
  approved values without the listing becoming inactive.
- [ ] Confirm the partner can edit again after the decision.

## Event references

- [ ] Create/edit an admin event and a partner event.
- [ ] Confirm both use the shared event category catalog.
- [ ] Confirm event currency follows the selected region.
- [ ] Confirm venue placement and existing event publication behavior still
  work.

## Failure capture

For any failure, record the route, identity role, exact steps, visible message,
Console error, and failing Network request method/status/response. Do not apply
Phase 4.5 migrations to production until every required item above is checked or
explicitly accepted as a documented exception.
