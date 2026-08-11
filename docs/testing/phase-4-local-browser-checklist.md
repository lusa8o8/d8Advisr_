# Phase 4 Local Browser Test Checklist

Date prepared: 2026-08-11

Environment: local consumer and partner clients connected to the staging
Supabase project. No Vercel deployment is required for this checklist.

## Before starting

- Use test listing names beginning with `[BROWSER TEST]`. This makes cleanup
  narrow and unambiguous.
- Staging is shared state. Do not use real businesses, events, personal contact
  information, or production credentials.
- Use separate browser profiles or Incognito windows for admin, consumer, and
  partner sessions.
- Open DevTools in each app. Keep Console and Network visible, enable “Preserve
  log,” and note any red request or CSP error.
- If a page looks stale, hard refresh it. If that does not help, clear site data
  and unregister any service worker for that localhost origin.

Run the secret-safe environment preflight from the repository root:

```powershell
pnpm run test:local:browser-env
```

Expected: `Local browser environment is ready for staging. No secret values
were printed.`

## Start the clients

Terminal 1 — consumer and admin client:

```powershell
Set-Location C:\Users\Lusa\d8Advisr_
pnpm run dev:consumer:staging
```

Open `http://localhost:3000`.

Terminal 2 — partner client:

```powershell
Set-Location C:\Users\Lusa\d8Advisr_
pnpm run dev:partner:staging
```

Open `http://localhost:3001`. Stop either server with `Ctrl+C`.

## 1. Role and routing baseline

- [ ] A staging consumer on port 3000 reaches the consumer experience and
      cannot remain on `/admin`.
- [ ] A staging partner on port 3001 reaches onboarding/dashboard according to
      its approved state.
- [ ] A staging admin on port 3000 reaches `/admin`.
- [ ] Refresh preserves each session and correct route.
- [ ] Sign-out protects authenticated pages.
- [ ] No local flow unexpectedly redirects to a production domain.

## 2. Unclaimed venue draft

From Admin → Create → Venue:

- [ ] Name it `[BROWSER TEST] Unclaimed Draft Venue`.
- [ ] Select `Unclaimed listing` and `Save as draft`.
- [ ] Enter city, category, address, description, and optional image/vibes.
- [ ] Submit once; a success message appears and no duplicate is created.
- [ ] Return to Venues and confirm it is present for the admin.
- [ ] Refresh consumer discovery/map and confirm the draft is absent.
- [ ] No failed creation request appears in Console or Network.

Expected data contract: no partner user, no organization owner, `d8_admin`
source, inactive draft, unverified.

## 3. Public unclaimed venue

- [ ] Create `[BROWSER TEST] Public Unclaimed Venue` with `Unclaimed listing`
      and `Publish now`.
- [ ] Provide realistic display data and a valid cover image URL.
- [ ] It appears in consumer discovery for its selected city.
- [ ] Its details page says `Listed by D8Advisr`, not `Operated by D8Advisr`.
- [ ] Address, price, category, description, images, and map behave sensibly.

## 4. D8Advisr-operated venue

- [ ] Create `[BROWSER TEST] D8 Operated Venue` with `Operated by D8Advisr`
      and `Publish now`.
- [ ] It appears publicly after refresh.
- [ ] Its details page says `Operated by D8Advisr`.
- [ ] It does not display or imply a fake partner owner.

## 5. Event creation and visibility

- [ ] Create `[BROWSER TEST] Draft Event` with a future start time and save it
      as a draft. It stays out of consumer event discovery.
- [ ] Create `[BROWSER TEST] D8 Public Event` as D8Advisr and publish it.
- [ ] Test an external location with a name and address.
- [ ] The public details page identifies the organiser as `D8Advisr` with D8
      verification.
- [ ] Date/time, price/free state, capacity, description, location, image, and
      vibes render correctly.
- [ ] Create another event using `Existing live D8 venue`.
- [ ] Only live venues appear in the selector.
- [ ] Its venue link opens the intended venue and the event appears on that
      venue page without an approval dead end.

## 6. Validation and failure states

- [ ] Required fields prevent an empty submission.
- [ ] External location requires a location name.
- [ ] Linked venue mode requires a selected venue.
- [ ] Negative price/capacity cannot be entered normally.
- [ ] An end time before the start produces a clear server error and no row.
- [ ] Repeated clicks while saving do not create duplicates.
- [ ] A failed request leaves the form usable for correction and retry.

## 7. Partner regression

- [ ] Existing partner email/password sign-in works on port 3001.
- [ ] Existing partner venue/event data loads.
- [ ] Existing partner venue edits save.
- [ ] Existing partner event draft/publish behavior works.
- [ ] A partner cannot see or use an admin creation action.
- [ ] Consumer redirects use `http://localhost:3000`.

## 8. Responsive and browser quality

Check approximately 390 px mobile width and desktop width:

- [ ] Admin navigation reaches Create without clipping.
- [ ] Forms remain readable, scrollable, and usable.
- [ ] Success/error messages remain visible.
- [ ] Consumer attribution badges do not overlap content.
- [ ] Maps render in the tested browser.
- [ ] No uncaught exception, CSP violation, mixed-content warning, infinite
      redirect, or unexpected 401/403 appears during a successful flow.

## Record issues

For each issue, capture the app/URL, role, exact test listing name, preceding
steps, visible message, Console error, failing Network request method/status/
response, browser, and viewport width. If screenshots cannot be pasted into the
terminal, leave the failing page open and ask Codex to inspect the browser.

## Cleanup

Do not reuse these as real staging data. Keep their exact `[BROWSER TEST]`
names and report when testing is complete; they can then be deleted narrowly
from staging along with their cascading creation audit rows.
