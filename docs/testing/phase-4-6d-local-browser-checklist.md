# Phase 4.6D High-Level Browser Acceptance

Run only these three journeys after the automated Phase 4.6D checks pass.
Smaller field and permission assertions are subsets of these journeys and do
not need to be reported individually unless they fail.

## 1. Dual-client identity

Sign into the consumer and partner staging clients as the same approved partner.
Confirm consumer discovery remains usable with no partner redirect. Log out of
one client and confirm the other origin remains signed in.

## 2. Admission lifecycle

With a disposable applicant, submit an application. As admin, request an update
with a reason. Confirm the partner sees the reason, edits the prefilled
application, and resubmits. Then test rejection with a reason and approval.
Confirm every state is visible without losing consumer access and approval does
not automatically publish a venue.

## 3. Capability isolation

Confirm a venue/`both` partner sees both venue and event tools. Confirm an
organizer sees event tools but cannot open the venue editor. The automated
staging test covers modified-client/database mutation attempts; the browser
test only verifies the user-facing navigation and direct route behavior.
