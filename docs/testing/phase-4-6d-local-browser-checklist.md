# Phase 4.6D High-Level Browser Acceptance

Status: passed by the user on 20 August 2026.

Run only these three journeys after the automated Phase 4.6D checks pass.
Smaller field and permission assertions are subsets of these journeys and do
not need to be reported individually unless they fail.

## 1. Dual-client identity

Result: passed. Both sessions coexisted, one origin could sign out without the
other, and the consumer onboarding guard fix was confirmed.

Sign into the consumer and partner staging clients as the same approved partner.
Confirm consumer discovery remains usable with no partner redirect. Log out of
one client and confirm the other origin remains signed in.

## 2. Admission lifecycle

Result: passed. Needs-update and rejected states displayed durable reasons and
the prefilled update/resubmit action.

With a disposable applicant, submit an application. As admin, request an update
with a reason. Confirm the partner sees the reason, edits the prefilled
application, and resubmits. Then test rejection with a reason and approval.
Confirm every state is visible without losing consumer access and approval does
not automatically publish a venue.

## 3. Capability isolation

Result: passed. Venue and legacy `both` accounts received venue and event tools;
the organizer account was restricted to event tools.

Confirm a venue/`both` partner sees both venue and event tools. Confirm an
organizer sees event tools but cannot open the venue editor. The automated
staging test covers modified-client/database mutation attempts; the browser
test only verifies the user-facing navigation and direct route behavior.
