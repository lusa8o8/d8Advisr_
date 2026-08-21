# Phase 4.6D4 Partner Workflow Browser Acceptance

Status: ready for local staging browser acceptance after slice three.

Acceptance note, 21 August 2026: the attribution/approval journey reached the
public venue page, where testing found that the Overview `Upcoming here`
preview rendered only the first approved event even though the Events tab had
the full list. The consumer surface now renders every approved future event in
the overview as well as the Events tab. Testing also found that a user who
entered the partner application flow with the wrong account had no visible
pre-submission exit. The application flow now offers `Cancel and sign out`;
before `Submit for review` there is no persisted application to delete.

The approval-to-revocation portion of journey 1 remains pending and must be
rerun after refreshing the updated local clients. Neither finding changes the
database transition contract or requires a Supabase migration.

The automated staging suite covers role isolation, modified-client denial,
optimistic versions, notification deduplication, and cleanup. Browser testing
is intentionally limited to two high-level partner journeys.

## Dev server

```powershell
Set-Location H:\d8Advisr_
pnpm run dev:partner:staging
```

## 1. Attribution and placement

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

From a venue-manager workflow card, report the venue as incorrect and enter a
reason. Confirm the organizer receives one notification and sees the disputed
state, report reason, `Correct venue`, and `Add response` actions. Add a
response and confirm the venue manager receives one response notification.

Admin resolution and consumer disputed-location behavior are slice-four tests,
not blockers for this slice-three browser acceptance.
