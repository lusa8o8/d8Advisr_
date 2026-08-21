# Phase 4.6D4 Partner Workflow Browser Acceptance

Status: journey 1 passed; journey 2 found a response-feedback/idempotency
failure, repair implemented locally, staging migration and retest pending.

Acceptance note, 21 August 2026: the attribution/approval journey reached the
public venue page, where testing found that the Overview `Upcoming here`
preview rendered only the first approved event even though the Events tab had
the full list. The consumer surface now renders every approved future event in
the overview as well as the Events tab. Testing also found that a user who
entered the partner application flow with the wrong account had no visible
pre-submission exit. The application flow now offers `Cancel and sign out`;
before `Submit for review` there is no persisted application to delete.

After refreshing the repaired clients, journey 1 passed with `D8Advisr
Freshman Launch` at `D8 Cinema I`: approval placed the event under `Upcoming
here`; revocation removed it from the venue page while the public event and
venue attribution remained; the organizer received the placement-removed
notification; and explicit resubmission returned the relationship to
`Venue-page review requested`.

Resubmission is optional. If the organizer does not want another placement
review, no state-changing action is required: the event remains off the venue
page and keeps its uncontested factual venue attribution. The organizer should
edit or remove the venue only when the event location itself changes. Do not
add a redundant decline-resubmission transition; future copy may make the
no-action option clearer. Neither browser finding changes the database
transition contract or requires a Supabase migration.

The automated staging suite covers role isolation, modified-client denial,
optimistic versions, notification deduplication, and cleanup. Browser testing
is intentionally limited to two high-level partner journeys.

## Dev server

```powershell
Set-Location H:\d8Advisr_
pnpm run dev:partner:staging
```

## 1. Attribution and placement

Result: **Pass — 21 August 2026.**

As an organizer, create or edit an event and select a D8 venue managed by the
other staging partner. Confirm the event card says the venue is the location
while venue-page review is pending. In the venue-manager session, confirm one
notification and one `Events identifying your venue` card appear. Approve
`Upcoming here`; confirm the organizer receives one decision notification and
the organizer card changes to `On venue page`.

Then revoke placement as the venue manager. Confirm the event remains listed
and still identifies its venue, while the organizer sees the venue-page
placement removed state and can explicitly resubmit it.

## 2. Incorrect-location report

Result: **Repair and retest pending — 22 August 2026.**

The incorrect-location report succeeded for `D8Advisr Freshman Launch` at `D8
Cinema I`: placement was suppressed from the venue page, the organizer received
the dispute notification, and the partner card showed the report reason plus
`Correct venue` and `Add response`. The organizer response also persisted and
the venue manager received a notification, but the organizer card did not show
the saved response and continued to offer the unchanged `Add response` action.
The tester submitted the same response three times and the venue manager
received three response notifications.

Repair `c381475` now shows `Your response was sent` and the saved response on
the card, changes the follow-up action to `Update response`, prefills the saved
text, and disables an unchanged update. Forward migration
`20260822003000_idempotent_event_venue_dispute_responses.sql` makes an identical
retry a no-op before optimistic-version rejection, so it creates no additional
audit transition or notification. Do not delete the three existing staging
notifications; they are evidence of the discovered failure.

From a venue-manager workflow card, report the venue as incorrect and enter a
reason. Confirm the organizer receives one notification and sees the disputed
state, report reason, `Correct venue`, and `Add response` actions. Add a
response and confirm the organizer card shows the saved response and changes
the action to `Update response`. Confirm the venue manager receives one response
notification. Reopen the response, leave the text unchanged, and confirm the
update action is disabled. After the forward migration is on staging, an
identical direct retry must also leave the relationship version and notification
count unchanged.

Admin resolution and consumer disputed-location behavior are slice-four tests,
not blockers for this slice-three browser acceptance.
