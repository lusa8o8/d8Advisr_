# Phase 4.6D Partner Admission and Access Closure

Status: D1 implemented and staging-automated; browser acceptance pending; D2
event-policy enforcement cutover pending

Date: 20 August 2026

## Discovered defects

1. Approved applicants can directly update `partner_type`, making organizer to
   venue/`both` a privilege escalation.
2. Venue operators do not currently receive event capability.
3. The consumer client redirects every partner application status to the
   partner subdomain, removing practical B2C access.
4. Shared logout uses Supabase's global default rather than ending only the
   current origin's session.
5. The application saves a region ID in the legacy `city` field while existing
   consumers expect the display name, breaking downstream currency/location
   comparisons.
6. `needs_update` and rejection reasons are not a complete applicant workflow.
7. Application approval, listing verification, and listing publication remain
   easy to confuse in copy despite being separate database decisions.

## Delivery slices and commits

1. Version the policies and roadmap.
2. Add database capability and application-integrity migration plus static and
   staging role tests.
3. Remove consumer-to-partner routing and make shared logout origin-local.
4. Add applicant correction/resubmission and durable admin reasons; align copy
   and region handling.
5. Run focused checks, builds, migration lint, and three browser journeys.

## Non-goals

- claims, disputes, or business membership cutover;
- multiple users managing one organization;
- document upload or sensitive identity verification;
- partner risk scores or speculative admission analytics;
- ticketing, registration, refund, or occurrence normalization; and
- a general admin event directory.

## High-level browser acceptance

1. **Dual-client identity:** a consumer can apply, remain signed into the
   consumer client, open the partner client independently, and log out of one
   without ending the other session.
2. **Admission lifecycle:** pending, needs-update/resubmission, rejection, and
   approval show the correct durable reason/state without cross-domain
   redirects; account approval does not publish a venue.
3. **Capability isolation:** venue and `both` partners can use venue and event
   tools; organizers can use event tools but cannot reach or mutate venue tools,
   including through direct database requests.

## Delivery record

The partner admission and dual-client slices were implemented on 20 August
2026. Migrations `20260820110000` and `20260820120000` are applied to the linked
staging project with local/remote migration parity. The Phase 4.6D static,
client, session-lifecycle, type, staging role/capability, and dual-build gates
pass.

Phase 4.6D is not closed until the three browser journeys pass and D2 replaces
the v1.0 event revision review classifier with the v1.1 confirm/apply/audit
contract. Phase 5 must not start before those gates are complete.
