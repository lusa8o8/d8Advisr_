# Phase 4.6A Local Browser Checklist

Date: 18 August 2026

Status: automated staging contract passed; local browser acceptance pending

Use staging identities and the two local staging clients.

## Public policy routes

- [ ] Open `/partner-policies` on both clients without signing in.
- [ ] Open `/partner-policies/event-publishing` on both clients and confirm the
  policy ID is `partner-event-publishing-v1.0`, version is `1.0`, and the
  permanent free/price rules are visible.
- [ ] Confirm Privacy, Terms, and Partner Policies navigation works without an
  authentication redirect.

## Partner first publication

- [ ] Create a paid event draft using a decimal price such as `150.50`; reopen
  it and confirm the exact value is retained.
- [ ] Confirm letters, zero, negative values, and more than two decimal places
  prevent a paid event from being saved or published with a useful message.
- [ ] Select **Review and publish** and confirm the summary shows event,
  schedule, location, entry price/currency, and attendance mode.
- [ ] Confirm publication remains disabled until the exact policy
  acknowledgement is selected.
- [ ] Confirm the policy link opens the versioned public policy in a new tab.
- [ ] Publish once and confirm one live event appears in the partner dashboard
  and consumer discovery.
- [ ] Pause the event, select **Review and resume**, acknowledge, and confirm the
  same event returns live without creating a duplicate.

## Published commercial protection

- [ ] Edit a published paid event and confirm a price increase is blocked in
  the editor.
- [ ] Reduce the price and confirm the lower value persists publicly.
- [ ] Reopen it and confirm the price cannot return to its previous higher
  value.
- [ ] Change a paid event to free and confirm consumer surfaces show Free entry.
- [ ] Reopen the now-free event and confirm it cannot become paid.

## Admin publication

- [ ] In Admin Create, select Event and Publish now; confirm the same versioned
  summary and acknowledgement are required.
- [ ] Publish an event with a decimal price and confirm it appears once in the
  consumer client with the exact price.
- [ ] Save an event as draft and confirm no policy acknowledgement is required
  until publication.

## Migration exception

- [ ] Confirm `Lusaka Comic Con` is no longer public and appears as a partner
  draft requiring a valid positive paid price or an explicit Free entry choice
  before republication.

Record the identity, route, visible error, and Network response for any failure.
