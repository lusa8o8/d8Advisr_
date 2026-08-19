# Phase 4.6A Local Browser Checklist

Date: 19 August 2026

Status: automated staging contract passed; public policy, partner publication,
and published-price lifecycle passed. Admin creation requires a focused retest
after `e2de756`; the migration-exception browser check remains to be recorded.

Use staging identities and the two local staging clients.

## Public policy routes

- [x] Open `/partner-policies` on both clients without signing in.
- [x] Open `/partner-policies/event-publishing` on both clients and confirm the
  policy ID is `partner-event-publishing-v1.0`, version is `1.0`, and the
  permanent free/price rules are visible.
- [x] Confirm Privacy, Terms, and Partner Policies navigation works without an
  authentication redirect.

## Partner first publication

- [x] Create a paid event draft using a decimal price such as `150.50`; reopen
  it and confirm the exact value is retained.
- [x] Confirm letters, zero, negative values, and more than two decimal places
  prevent a paid event from being saved or published with a useful message.
- [x] Select **Review and publish** and confirm the summary shows event,
  schedule, location, entry price/currency, and attendance mode.
- [x] Confirm publication remains disabled until the exact policy
  acknowledgement is selected.
- [x] Confirm the policy link opens the versioned public policy in a new tab.
- [x] Publish once and confirm one live event appears in the partner dashboard
  and consumer discovery.
- [x] Pause the event, select **Review and resume**, acknowledge, and confirm the
  same event returns live without creating a duplicate.

## Published commercial protection

- [x] Edit a published paid event and confirm a price increase is blocked in
  the editor.
- [x] Reduce the price and confirm the lower value persists publicly.
- [x] Reopen it and confirm the price cannot return to its previous higher
  value.
- [x] Change a paid event to free and confirm consumer surfaces show Free entry.
- [x] Reopen the now-free event and confirm it cannot become paid.

## Admin publication

- [ ] In Admin Create, select Event and Publish now; confirm the same versioned
  summary and acknowledgement are required.
- [ ] Publish an event with a decimal price and confirm it appears once in the
  consumer client with the exact price.
- [ ] Save an event as draft and confirm no policy acknowledgement is required
  until publication.

Focused retest notes after `e2de756`:

- use a blank attendance limit for open attendance; entering `0` must show an
  inline validation message and must not call Supabase;
- confirm the controlled event-icon picker replaces free text;
- confirm the organizer/publication language appears for events instead of the
  venue-oriented ownership copy;
- if the RPC fails, record the specific database message now surfaced in the
  UI; and
- open `/signin?next=%2Fadmin` signed out and confirm Google/account creation
  are absent and Enter submits the email/password form.

## Migration exception

- [ ] Confirm `Lusaka Comic Con` is no longer public and appears as a partner
  draft requiring a valid positive paid price or an explicit Free entry choice
  before republication.

Record the identity, route, visible error, and Network response for any failure.
