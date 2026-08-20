# Partner Listing Ownership and Repository Cleanup Roadmap

Status: active planning document - Phase 4.5 complete; Phase 4.6A automated
staging verification and browser groups 1-3 complete; focused admin retest pending

Created: 2026-08-11

Scope: admin-created venues/events, unclaimed listings, partner claims and handover, RLS evolution, and bounded repository cleanup

## Purpose

D8Advisr needs to support three related workflows without creating fake or
orphaned user accounts:

1. D8 admins create and publish venues or events before a business joins.
2. D8 publishes first-party events as D8Advisr.
3. A real venue owner or organizer later claims an existing listing and gains
   management access without replacing the listing, reviews, history, or IDs.

Repository cleanup is included as a separate workstream because the current
admin and partner surfaces are already large. Cleanup must not be mixed into a
database ownership migration unless it is required for that migration.

## Mandatory Working Protocol

Every phase below follows this sequence. A phase does not inherit assumptions
from an earlier review.

### 1. Fresh discovery

Before changing a file or migration:

- run `git status -sb` and preserve unrelated user changes;
- read recent commits affecting the phase's paths;
- open the current implementation files in full where practical;
- search current call sites, types, policies, triggers, RPCs, grants, and tests;
- inspect all later migrations that replace an affected policy or function;
- compare local and linked migration histories for database work;
- record newly discovered constraints in this document or a phase ADR.

Discovery may be abbreviated only when the exact files and migrations were
reviewed during the same active phase. Memory or an older conversation summary
is not sufficient.

### 2. Mini plan

Before implementation, record:

- the bounded outcome;
- files and database objects in scope;
- files and objects explicitly out of scope;
- data migration and rollback strategy;
- verification commands and acceptance criteria;
- the intended commit boundary.

### 3. Bounded implementation

- prefer additive and reversible changes;
- do not combine behavior changes with broad formatting or file moves;
- never rewrite an already-applied migration;
- preserve stable venue/event IDs and historical audit data;
- enforce authorization in PostgreSQL, not only in React guards;
- do not create placeholder `auth.users` records for businesses.

### 4. Verification

Use the smallest relevant set, increasing with risk:

- TypeScript checks for affected packages;
- production builds for affected clients;
- SQL lint/diff and local reset when Docker is available;
- linked migration comparison before any remote push;
- role-matrix tests for anonymous, consumer, pending partner, live partner,
  admin, claimant, and former member;
- explicit postconditions for ownership transfers and audit history.

### 5. Commit gate

- inspect `git diff --check` and the exact staged diff;
- stage only files belonging to the phase;
- commit after each key change with a focused message;
- leave unrelated user changes uncommitted;
- do not push or apply a remote database migration without explicit approval.

## Fresh Discovery Baseline

This baseline was collected on 2026-08-11 and must be refreshed when its phase
starts.

### Repository and deployment

- The repository is a pnpm workspace with four artifact packages:
  `d8advisr`, `d8advisr-partner`, `api-server`, and `mockup-sandbox`.
- Consumer/admin and partner are separate Vite applications sharing
  `lib/d8-core` and one Supabase project.
- The working tree contained a user-owned deletion at
  `artifacts/d8advisr-partner/public/images`; it is outside this roadmap's
  commits.
- Recent auth work introduced shared `AuthLayout` and removed Google sign-in
  from the partner UI.
- Deployment configuration exists at both repository root and package level;
  this is a drift risk to audit later, not part of the ownership migration.

### Current database state

- The 25 checked-in migrations match the linked Supabase project through
  `20260725020000_route_neutral_account_context.sql`.
- `venues.partner_id` references `profiles.id` and is nullable.
- `events.partner_id` references `profiles.id` and is nullable.
- Partner RLS and multiple RPCs equate management with
  `auth.uid() = partner_id` plus an approved capability.
- Admin RLS can manage venues and events, but the current admin interface reads,
  reviews, verifies, and changes status; it does not create them.
- Ownership assumptions also appear in demand analytics, review summaries,
  partner notifications, venue-event visibility, and protected-column
  triggers. Updating only the main CRUD policies would be incomplete.
- Existing listing lifecycle and change-log migrations provide useful audit
  infrastructure that should be extended rather than replaced.

### Structural hotspots

- `AdminPanel.tsx` is approximately 105 KB and combines types, mapping, queries,
  mutations, and UI.
- `usePartner.ts` combines application, venue, event, demand, review, and write
  operations.
- `mockup-sandbox` duplicates all 55 consumer UI component filenames.
- API scaffold packages appear lightly used; the consumer declares
  `@workspace/api-client-react`, but current application imports must be
  rechecked before removal.
- Applied migrations contain legitimate historical redefinitions. They may be
  documented or baselined for new environments later, but must not be edited in
  place.

## Accepted Target Model

ADR 0001 accepts an organization entity independent of authentication:
`partner_organizations`:

- `id`
- `name`
- `organization_type`: venue operator, event organizer, both, or platform
- `status`: unclaimed, pending, active, suspended, or archived
- contact and verification metadata
- timestamps

An internal active organization represents D8Advisr for first-party publishing.

### Membership and access

Create `partner_organization_memberships`:

- `organization_id`
- `user_id`
- `role`: primary_owner, owner, manager, or editor
- `status`: invited, active, suspended, or revoked
- `granted_by`, `granted_at`, and `revoked_at`

Users retain their existing `auth.users.id`. Handover creates or activates a
membership; it does not migrate content to another auth user.

### Claims

Create `partner_organization_claims`:

- claimant and target organization IDs, with an optional source listing
- status: pending, approved, rejected, cancelled, or disputed
- evidence metadata and private review notes
- reviewer and decision timestamps
- uniqueness rules preventing multiple active claims for the same target/user

Claimants never update ownership columns directly. An admin-only transactional
RPC approves the claim, creates membership, links the listing, and writes audit
records.

### Listing provenance

Venues and events should distinguish:

- `business_id`: who is represented by or controls the listing;
- `created_by`: which authenticated user created the row;
- `source`: d8_admin, partner, import, or community submission;
- optional publishing attribution for consumer-facing “D8Advisr” content.

`created_by` is immutable historical provenance. A claim changes management
access, not authorship or the listing ID.

## Delivery Phases

### Phase 0 — Roadmap and baseline

Outcome: establish this protocol and current-state evidence.

Mini plan:

- Scope: repository structure, relevant auth changes, local/remote migrations,
  current ownership references, and known hotspots.
- Out of scope: schema, UI, RLS, file moves, dependency removal.
- Verify: linked migration parity, Markdown review, clean staged scope.
- Commit: `docs: add partner ownership roadmap`.

Acceptance:

- this file exists and reflects the current repository;
- no production behavior changes;
- the existing partner image deletion is not staged.

### Phase 1 — Ownership architecture decision

Outcome: approve the precise schema and access semantics before SQL is written.

Fresh discovery:

- reread current table definitions and every later venue/event policy or RPC;
- inspect live row shapes and counts using read-only queries;
- identify duplicate partner applications, null owners, and dangling references;
- review current admin and partner workflows end to end;
- review generated/shared database types.

Mini plan:

- write an ADR containing table names, constraints, state transitions, role
  matrix, claim evidence policy, D8 attribution, and migration strategy;
- decide whether events belong to a business, a venue, both, or neither;
- define which fields owners, managers, editors, and admins may change;
- define account removal, ownership dispute, and transfer behavior.

Implementation: documentation and executable role-matrix test cases only.

Verify: walk every existing and proposed workflow against the role matrix.

Commit: `docs: define listing ownership and claim model`.

### Phase 2 — Focused admin/partner data-layer extraction

Status: complete on 2026-08-11.

Outcome: create safe seams for later features without changing behavior.

Fresh discovery:

- review `AdminPanel.tsx`, `usePartner.ts`, shared Supabase types, and all imports;
- identify current query keys, mutation refresh behavior, and UI state coupling;
- run baseline typechecks and builds.

Mini plan:

- extract domain types and row mappers;
- extract existing admin queries/mutations into focused hooks or services;
- extract existing partner application/venue/event operations by domain;
- keep routes, rendering, query shapes, and permissions unchanged.

Verify: consumer, partner, and shared typechecks; both production builds; focused
tests for pure mappers if introduced.

Commits should be separated by stable boundary, for example:

1. `refactor(admin): extract listing data layer`
2. `refactor(partner): split partner domain operations`

### Phase 3 — Additive ownership schema foundation

Outcome: introduce organizations, memberships, claims, and provenance without
cutting over existing partner access.

Status: implementation and staging verification complete on 2026-08-11;
production promotion requires separate explicit approval.

Fresh discovery:

- repeat migration parity check;
- reread Phase 1 ADR and all migrations/functions named in its impact list;
- obtain read-only production counts required for deterministic backfill;
- verify local Docker availability for `supabase db reset`.

Mini plan:

- add new tables, enums/checks, indexes, grants, audit fields, and helper
  functions in one new migration;
- add nullable `business_id`/`created_by`/`source` fields;
- create the internal D8Advisr business deterministically;
- do not remove or repurpose `partner_id`;
- add read-compatible shared TypeScript types.

Rollback: new objects remain unused and can be removed by a forward migration
before cutover; existing ownership continues through `partner_id`.

Verify: local reset, schema diff, constraint tests, RLS role matrix, package
typechecks and builds.

Commit: `feat(db): add business ownership foundation`.

The migration is applied to staging only. Production application requires a
separate explicit approval.

### Phase 4 — Admin creation and D8 publishing

Outcome: admins can create unclaimed venues/events or publish as D8Advisr.

Status: implementation and staging verification complete on 2026-08-11;
production promotion requires separate explicit approval.

Fresh discovery:

- reread the extracted admin data layer and current admin RLS/RPCs;
- inspect current venue/event editors and validation rules;
- inspect current consumer queries and publication-status assumptions.

Mini plan:

- add admin-only transactional create RPCs;
- require explicit source/attribution selection;
- default unclaimed content to safe review/publication states;
- add focused admin forms by reusing validated partner editor components where
  reuse does not leak partner assumptions;
- record creator and audit events.

Verify: admin can create; non-admin cannot call RPC; public sees only live
content; unclaimed content has no fake user; D8 attribution renders correctly.

Likely commits:

1. `feat(db): add admin listing creation RPCs`
2. `feat(admin): create venues and events`

Browser verification added four closure requirements: creation is idempotent,
admin-created venues cannot publish before Submissions approval, and non-live
admin-created venues can be corrected through an audited bounded editor. All
three plus reviewed live editing are implemented and automated-staging verified.
Live description edits apply immediately; high-risk edits remain private until
explicit approval or rejection. The local browser create-edit-approve-discover
and live-revision checklist remains before Phase 4 is closed.

### Phase 4.5 — Shared listing reference data and media

Outcome: admin, partner, and consumer flows use the same canonical location,
category, vibe, price-tier, currency, timezone, and media contracts before
claims are introduced.

Use the mini plan in
`docs/implementation/phase-4-5-listing-reference-data-and-media.md`. Extend the
existing regions and partner media foundations; add an admin-managed area
fallback catalog; preserve explicit free-text area fallback; and defer PostGIS
until accurate coordinates and a spatial query requirement exist.

Fresh discovery also proved the partner editor currently applies sensitive
changes to the live row before its re-verification task is reviewed, despite UI
copy promising the opposite. Phase 4.5 must migrate partner live edits onto the
same pending-revision principle after canonical fields and shared media are
defined; this is a production-readiness gate, not an optional cleanup.

Implemented commits are separated by boundary:

1. `feat(db): add listing reference catalogs`
2. `feat(listings): use shared reference selectors`
3. `feat(media): add shared listing uploads`
4. `feat(partner): review high-risk live venue revisions`
5. `test(phase4.5): cover local listing workflows`

Browser evidence on 2026-08-12 confirmed the core live-venue contract end to
end: a partner submitted controlled venue fields and six uploaded photos, the
low-risk description applied immediately, the controlled proposal remained
private, admin reviewed and approved it, and the updated listing and gallery
appeared in the consumer feed. On 2026-08-18 the user confirmed all remaining
partner-venue, admin-venue, venue-media, and notification browser cases passed.
The automated staging media test covers cross-user path isolation. Event
commercial and revision cases were reclassified into Phase 4.6 because that
phase replaces the current direct-write event contract.

### Phase 4.6 — Event policy enforcement

Outcome: published event commercial promises are enforced in PostgreSQL,
material changes are auditable, and affected users receive durable
notifications without requiring admin approval for ordinary publication.

Use the versioned policy, enforcement matrix, and implementation plan in:

- `docs/policies/partner-event-publishing-policy-v1.0.md`;
- `docs/policies/partner-event-enforcement-matrix-v1.0.md`; and
- `docs/implementation/event-commercial-integrity-revisions-and-notifications.md`.

Implement the commercial foundation and publication acknowledgement first,
then event revisions, active interest and notifications, reconfirmation, and
finally occurrence-level behavior when real usage requires it. Add the
country/region admin-assignment foundation additively during the first database
slice, but defer regional enforcement and the read-only Events directory until
operational staffing requires them.

Delivery state on 19 August 2026:

| Slice | Scope | Status |
| --- | --- | --- |
| 4.6A | Commercial baseline, decimal prices, policy acknowledgement, public policy routes, admin-scope foundation | Implemented and staging-automated; browser groups 1-3 passed; focused admin retest pending after `e2de756` |
| 4.6B | Event revision table, deterministic classifier, partner submission, sensitive admin review, history and optimistic concurrency | Next implementation slice; fresh discovery required |
| 4.6C | Active consumer interest, unified durable notifications, transactional recipient generation and later delivery outbox | Planned after revision decisions are stable |
| 4.6D1 | Partner admission, capability, and dual-client session closure | Complete: automated and all three browser journeys passed on 20 August 2026 |
| 4.6D2 | Event-policy v1.1 enforcement cutover and removal of routine event review | Implemented on staging; automated gates complete; three browser journeys pending before Phase 5 |
| 4.6E | Reconfirmation, registration/ticket/refund-aware behavior | Deferred until those domains are real |
| 4.6F | Normalized occurrences and occurrence-scoped revisions | Deferred until series-level behavior is proven |

Phase 4.6D supersedes the speculative pre-approval portions of the v1.0 event
policy. Approved partners continue to publish directly. Published event edits
are validated, confirmed when material, audited, and applied without a routine
admin queue. D8 investigates from consumer reports, reviews, complaints, or
other operational signals. See the versioned v1.1 policy and matrix; v1.0 is
retained as historical policy evidence and must not be silently rewritten.

Phase 4.6D also closes partner admission before claims are introduced:

- partner approval is additive and never removes consumer access;
- the consumer and partner clients make independent routing decisions and keep
  origin-local sessions;
- venue operators receive venue and event tools, event organizers receive only
  event tools, and `both` remains a descriptive compatibility value with venue
  and event tools;
- applicants cannot grant themselves capabilities by editing an approved
  application type;
- correction and rejection reasons are durable and visible to the applicant;
- partner review does not collect identity or business documents for MVP; and
- account approval, venue verification, and venue publication remain separate
  decisions.

The implementation contract is
`docs/implementation/phase-4-6d-partner-admission-access-closure.md`.

Phase 4.6D1 delivery evidence:

- `2e87f74` versions the policy and implementation contract;
- `54be390` closes application type escalation and aligns PostgreSQL
  capabilities;
- `4ab8941` removes consumer-to-partner routing and uses origin-local logout;
- `8087383` adds durable reasons and applicant resubmission;
- `0d72489` adds focused automated and browser acceptance gates; and
- `ec04741` repairs schema references in the existing event revision fallback.

The linked staging database contains migrations `20260820110000` and
`20260820120000`. Automated admission/capability smoke, TypeScript, both
staging builds, and migration parity pass. Database lint has no errors; one
pre-existing text-to-`text[]` initialization warning remains in the legacy
`partner_submit_event_revision` function and will disappear when 4.6D2
replaces that v1.0 function.

Phase 4.6D2 delivery evidence:

- `4d84066` adds the v1.1 apply/audit/notify database boundary and cancellation;
- `ce83ed5` adds partner material-change confirmation and public v1.1 policy copy;
- `243db0e` removes the routine admin event queue and adds read-only event history;
- `c5ecc87` adds immediate cancellation and recent-cancelled consumer surfaces; and
- the D2 automated and browser gates are defined in the phase implementation
  and testing documents.

Phase 5 remains blocked only by the three D2 browser journeys and any defects
they reveal. Ticket-aware restrictions, occurrence normalization, delivery
outboxes, and speculative analytics are not Phase 5 prerequisites.

### Phase 5 — Claim submission and approval

Outcome: a real user claims an existing listing and receives approved access.

Fresh discovery:

- reread onboarding, partner application, notifications, admin review, and
  current email/password session flows;
- inspect current application uniqueness and capability derivation;
- confirm evidence storage/privacy requirements.

Mini plan:

- expose “Claim this listing” only for eligible unclaimed listings;
- create claim submission RPC with duplicate/dispute controls;
- add claimant status and admin review screens;
- define a shared notification event/recipient contract before claim decisions
  depend on it; retain the durable in-app inbox as the source of truth and defer
  external delivery channels to an asynchronous outbox;
- add admin approval/rejection RPCs with audit and notifications;
- create business membership on approval without changing listing IDs.

Verify: unauthorized self-assignment fails; duplicate active claims fail;
approval is atomic; rejected claims grant no access; approved membership works
on the partner subdomain after sign-in.

Likely commits:

1. `feat(db): add listing claim workflow`
2. `feat(partner): submit and track listing claims`
3. `feat(admin): review listing claims`

### Phase 6 — Existing partner backfill and RLS cutover

Outcome: existing partner-owned content uses business memberships instead of
direct user ownership.

Fresh discovery:

- query production for every partner application, venue, event, notification,
  review summary, and demand function affected by `partner_id`;
- identify orphans and ambiguous multi-business users;
- refresh the exact list of policies, triggers, RPCs, and frontend filters.

Mini plan:

- deterministically create businesses/memberships for existing live partners;
- attach their venues/events while retaining `partner_id` for compatibility;
- update helper functions, policies, analytics, notifications, and visibility
  to use active membership;
- expose a partner-visible organization activity ledger before multiple members
  can mutate listings; record actor, action, listing, decision reason, changed
  fields, and timestamp while keeping private admin-only notes separate;
- dual-read during a defined compatibility window;
- add reconciliation queries proving old and new access sets match.

Rollback: preserve legacy columns and a forward rollback migration until the
reconciliation window passes.

Verify: old/new access-set equality, full role matrix, orphan report equals
zero or has reviewed exceptions, both app builds, production smoke checks.

Likely commits:

1. `feat(db): backfill partner businesses and memberships`
2. `feat(db): enforce membership-based listing access`
3. `refactor(apps): read business-based ownership`

### Phase 7 — Legacy removal and targeted repository cleanup

Outcome: remove proven-dead ownership paths and reduce structural bloat without
mixing unrelated product changes.

Fresh discovery:

- verify no runtime, RPC, policy, report, or type reads legacy ownership;
- re-audit workspace package imports, build scripts, deployment roots, and UI
  duplication;
- measure bundle sizes and build times before deletion.

Mini plan candidates, each requiring its own evidence and commit:

- remove legacy `partner_id` only after complete cutover;
- remove or archive `mockup-sandbox` if it has no deployment or active use;
- remove unused API scaffold packages/dependencies;
- choose one authoritative Vercel configuration per deployment path;
- split remaining oversized pages by feature;
- centralize only genuinely shared UI/domain code.

Verify each deletion with `rg`, workspace typecheck, affected builds, and
deployment-config inspection.

Do not combine all cleanup candidates into one commit.

### Phase 8 — Production hardening and operational handoff

Outcome: claims and ownership changes are observable, supportable, and safe.

Fresh discovery:

- review audit coverage, support procedures, dispute states, rate limits,
  retention, and privacy exposure;
- inspect production logs and failure paths after real usage.

Mini plan:

- add operational dashboards/queries for pending claims and orphan detection;
- document claim verification and dispute handling;
- add rate limiting or abuse controls where evidence requires them;
- document rollback and emergency access-revocation procedures.

Verify using a release checklist and a staged production rollout.

Commit documentation and observability changes separately from policy changes.

## Required Role Matrix

Every ownership/RLS phase must test at least:

| Actor | Unclaimed draft | Unclaimed live | Claimed own | Claimed other | D8-owned |
| --- | --- | --- | --- | --- | --- |
| Anonymous | No | Read | Read if live | Read if live | Read if live |
| Consumer | No direct edit | Submit claim | No unless member | No | No |
| Pending partner | No direct edit | Submit/track claim | No publish | No | No |
| Active editor | No | No | Limited edit | No | No |
| Active manager | No | No | Manage content | No | No |
| Active owner | Claim/transfer actions | Manage after approval | Full business management | No | No |
| Admin | Full audited access | Full audited access | Full audited access | Full audited access | Full audited access |

Exact field permissions and publication rights are finalized in Phase 1.

## Research Basis

The provisional model follows established listing-platform behavior:

- Tripadvisor keeps listings independent of user accounts and requires a
  representative to claim and verify before management access.
- Google Business Profile separates profile identity from owners/managers and
  transfers access without replacing the profile.
- Yelp supports creating a page first and claiming it later through
  verification.

Primary references:

- https://www.tripadvisor.com/business/claim-hotel-listing-free
- https://support.google.com/business/answer/2911778
- https://support.google.com/business/answer/3403100
- https://support.google.com/business/answer/3415281/transfer-primary-ownership-of-a-business-profile
- https://biz.yelp.com/support-center/Yelp_Business_Page/Getting_Started/How-do-I-claim-a-business-page/en-US

## Immediate Next Step

Run the focused Phase 4.6A admin browser retest recorded in
`docs/testing/phase-4-6a-local-browser-checklist.md`. All automated staging
checks and browser groups 1-3 pass. Once the admin draft/publish and migration
exception observations are recorded, close 4.6A and begin fresh Phase 4.6B
event revision discovery. Production promotion of accumulated migrations
remains a separate explicit decision.
