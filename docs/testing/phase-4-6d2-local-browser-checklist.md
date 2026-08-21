# Phase 4.6D2 High-Level Browser Acceptance

Status: journeys reported passed on 21 August 2026; focused schedule-timezone retest pending

Browser evidence:

- material attendance and schedule changes produced an accurate confirmation
  modal and two interested recipients;
- the consumer received durable entry and schedule notifications and both
  notification links opened the event;
- notification-page rendering, free-to-paid editing, cancellation, admin
  history, and cancelled-event surfaces passed;
- discovery found that the initial schedule notification formatted timestamps
  in UTC (`5:00 PM → 6:00 PM`) while the event-local confirmation showed
  `7:00 PM → 8:00 PM`;
- migrations `20260821100000` and `20260821101000` now format schedule copy in
  the canonical event-region timezone and prevent browser roles from directly
  invoking the internal dispatcher.

Phase closure requires only one new schedule change confirming that notification
copy matches the partner modal and includes the event-local time label.

Run both clients locally against staging. Use one disposable live partner event
that is not needed for later tests. Cancellation is intentionally destructive
for that event.

## 1. Non-material and material editing

As the staging partner, edit a live event description and save. Confirm it goes
live without an admin-review banner. Then change one material field such as
price, date/time, venue, or attendance limit. Confirm the before/after modal is
accurate, cancelling the modal changes nothing, and confirming applies the
change. Refresh the editor and consumer event page to verify the new values.

Expected: no pending-review state; no duplicated images; the administrator
event detail shows both changes in read-only history.

## 2. Interested-consumer notification

As the staging consumer, enable a reminder for the live event. As the partner,
make and confirm a material change. Return to the consumer notification center
and open the notification.

Expected: one durable notification describes the changed field, links to the
event, and the event page reflects the accepted value. A non-material edit does
not create a consumer notification.

## 3. Cancellation lifecycle

As the partner, choose **Cancel event**, inspect the affected-interest count,
cancel the dialog once, then repeat and confirm. Check the partner dashboard,
consumer discovery, venue page if linked, notification center, and direct event
URL.

Expected: cancellation is immediate and has no admin queue; the partner event
is marked cancelled; the consumer receives a cancellation notification; the
event is visibly cancelled and lower than live events; reminder/planning
actions are disabled; and the direct page remains readable during the 24-hour
visibility window.

Record pass/fail and the first-party Network response for any failure. These
three journeys close Phase 4.6D2; Phase 5 remains blocked until they pass.
