# Phase 4.8A — Event Provenance and Action Links

Status: Slice 1 database foundation is delivered to the main project. Slice 2
admin intake and reviewed import tooling are implemented and committed. The
manifest has passed dry-run validation, but no event seed rows have been
inserted; authenticated browser acceptance and the deliberate draft import are
the remaining Slice 2 operational checks.

Decision date: 25 August 2026

## Outcome

Make researched and imported event listings attributable, reviewable, and
useful before launch. D8 must retain the evidence used to create an event, show
a restrained public citation, and send a consumer to the correct external
ticket or registration destination without pretending D8 sells the ticket.

This is a launch-readiness prerequisite for the proposed Lusaka seed batch. Do
not insert that batch until the data foundation and admin intake are available.

## Discovery evidence

### Existing database contract

- `events.source` is listing ownership/origin (`d8_admin`, `partner`, `import`,
  or `community`). It is not a citation and must not be repurposed.
- `events` has no source URL, official URL, ticket URL, registration URL, or
  source-verification metadata.
- An event already has separate draft/publication, live revision,
  cancellation, retirement, and D8-venue-attribution lifecycles. Evidence and
  outbound links must not overload those fields.
- Published-event revisions are immutable/audited, but their payload does not
  include citation or action-link changes.
- Public event RLS exposes only non-retired live and cancelled events. Child
  records need the same parent visibility boundary.
- `listing_admin_audit_log.metadata` is admin-only operational metadata, not a
  public citation store.

### Existing clients

- Admin event create, draft edit, live edit, and detail surfaces do not accept
  or display sources or consumer action links.
- The partner editor has no such fields and writes new drafts directly before
  using the publication/revision RPCs.
- Consumer event detail reads only `events` plus the linked venue. It has no
  primary external CTA or source disclosure.
- Consumer event detail still has a hardcoded catalogue for legacy non-UUID
  routes. Those records must not be made to look sourced or production-backed.

### Seed-readiness findings

- An event can have several evidence sources and a different ticket or
  registration provider. One URL column cannot represent both.
- Ticket pages often advertise “from Kx”. Existing `price_pp` is presented as a
  canonical per-person amount, so minimum ticket tiers must not be copied into
  it without verification.
- Several researched conferences, expos, education, faith, professional, and
  family events do not fit the current event-category catalogue. Category
  expansion or exclusion is a separate seed-curation decision.
- Conflicting dates, past events, generic conference-alert pages, recurring
  annual assumptions, and unsupported social posts remain excluded or on hold.

## MVP data contract

Use two child tables. They serve different trust and display purposes and
should not be collapsed into one generic URL list.

### `event_sources`

Purpose: factual provenance and verification evidence.

Proposed fields:

- `id uuid` primary key;
- `event_id uuid` referencing `events`;
- `source_type text`: `organizer`, `venue`, `ticketing`, `press`, `calendar`,
  or `social`;
- `publisher_name text`;
- `source_title text` nullable;
- `url text`;
- `verification_status text`: `unverified`, `verified`, `stale`, or `rejected`;
- `is_primary boolean` and `show_publicly boolean`;
- `observed_at` and `last_checked_at` timestamps;
- `verified_by uuid` nullable;
- `internal_note text` nullable; and
- created/updated actor and timestamp metadata.

Enforce one URL per event, at most one primary public source, bounded text,
HTTP(S) validation, and attributable verification changes. Do not copy or
archive full third-party page content.

### `event_action_links`

Purpose: a consumer-facing action completed outside D8.

Proposed fields:

- `id uuid` primary key;
- `event_id uuid` referencing `events`;
- `link_type text`: `tickets`, `registration`, or `official`;
- `provider_name text` and optional `label text`;
- `url text`;
- `status text`: `unverified`, `active`, `sold_out`, `closed`, or `invalid`;
- `is_primary boolean`;
- `last_checked_at timestamptz` nullable; and
- created/updated actor and timestamp metadata.

Enforce one URL per event and at most one primary active action. “Contact the
organizer” is not an arbitrary link type in this slice; contact data and payment
arrangements require their own explicit product contract.

### Access boundary

- Anonymous/consumer: only public sources and active or sold-out public actions
  whose parent event is non-retired and live or cancelled.
- Admin: all rows, including verification notes and invalid/stale links.
- Admin writes: RPC-only, with request-key idempotency, optimistic event
  version, validation, and audit.
- Partner reads/writes: not added in Slice 1. Partner parity must join the
  published-event revision contract rather than gain direct table mutation.
- Automated link checking is deferred; a future service process may mark links
  stale or invalid without deleting evidence.

## Publication and presentation rules

- Researched/imported events begin as drafts.
- A new event with `source = 'import'` cannot transition to live without at
  least one verified source. Existing records receive an explicit compatibility
  review; do not invent citations for them.
- Do not globally require ticket links for paid partner events in this slice.
  D8 does not own checkout and the partner workflow has no complete alternative
  payment contract.
- Admin seed review treats a working ticket, registration, or official action
  as a publication-quality requirement when the source claims online booking.
- A “from” ticket price is not canonical `price_pp`. Leave it unresolved and
  keep the event in draft until the semantics are verified.
- Consumer detail shows one primary CTA (`Get tickets`, `Register`, or `View
  official details`) and identifies the external provider before navigation.
- Consumer detail shows one restrained citation such as “Information sourced
  from TicketHost · checked 25 Aug 2026”. Feed cards remain uncluttered.
- Cancelled events may retain evidence and official information, but ticket
  actions must respect closed/invalid state and cancellation treatment.
- External links use `noopener noreferrer`; the server rejects non-HTTP(S),
  whitespace, and overlong URLs.

## Mini plan

### Slice 1 — Additive database foundation

1. Add both tables, checks, partial unique indexes, parent indexes, RLS, column
   grants, and admin-only mutation RPCs.
2. Add dedicated immutable audit for source/link changes; do not squeeze
   mutable evidence into event-creation metadata.
3. Add the import-publication guard without changing ordinary partner event
   publication.
4. Add static checks for grants, RLS, URL schemes, primary uniqueness, import
   publication, and forbidden direct client writes.
5. Add role smoke coverage for anonymous, consumer, partner owner, other
   partner, admin, and retired/draft/live/cancelled parent states.

Suggested commit: `feat(db): add event provenance and action links`

#### Slice 1 delivery — 26 August 2026

Delivered migrations:

- `20260826100000_event_provenance_and_action_links.sql`; and
- `20260826103000_fix_event_provenance_parent_visibility.sql`.

The first migration adds separate evidence, external-action, and immutable
audit tables; admin-only idempotent replacement; server-owned listing origin;
and the verified-source publication guard only for imported events. It creates
no events and performs no backfill.

Production verification found that an inline child-policy query required a
table-level `events` grant that the hardened event contract deliberately does
not expose. The forward repair replaces that query with a narrow
security-definer boolean visibility helper. It does not widen event-table
grants or return private event rows.

Verified:

- focused Phase 4.8A static contract checks;
- session lifecycle and workspace typecheck;
- pre/post production read-only baseline (19 venues, 8 events);
- public empty reads for both new child tables;
- anonymous insert denial for both child tables;
- anonymous denial for the admin replacement RPC and audit table;
- linked database lint with no schema errors; and
- matching local/remote migration history through `20260826103000`.

Authenticated admin mutation, optimistic-conflict, request retry, verified
import publication, and consumer visibility with real rows remain acceptance
for Slice 2's admin intake. Do not manufacture disposable identities or leave
test event fixtures in the main project merely to close those checks early.

### Slice 2 — Admin intake and seed manifest

1. Add repeatable Source and Tickets/registration sections to admin event draft
   create/edit and detail surfaces.
2. Keep saves idempotent and preserve unfinished form state.
3. Show verification state, last-checked date, and actionable validation errors;
   never expose internal notes to consumers.
4. Create a versioned, reviewable seed manifest with source URLs, observed
   facts, verification state, and stable request keys.
5. Import only verified, future, taxonomy-compatible records as drafts. Keep
   conflicts and unsupported categories in a documented hold list.

Suggested commits:

1. `feat(admin): manage event sources and action links`
2. `chore(data): prepare reviewed Lusaka event drafts`

#### Slice 2 implementation delivery — 26 August 2026

Delivered locally in:

- `6a68cbb feat(admin): manage event sources and action links`; and
- `96e6942 chore(data): prepare reviewed Lusaka event drafts`.

Admin event creation and event detail now support repeatable evidence sources
and ticket/registration/official links. Unfinished creation state is retained
in the existing session-draft boundary. Evidence replacement uses the
admin-only RPC's stable request key and optimistic event version; imported
records are first created as drafts, marked as imports through that RPC, and
cannot be selected for direct publication during intake.

A follow-up schedule correction removes the duplicate-looking timestamp
experience for researched imports. Ordinary events retain the existing native
start/end controls. Selecting `Researched/imported event` hides those controls
and exposes one dedicated schedule with separate start date, start time,
optional end date, and optional end time. Draft and live imported editors use
the same component, and all paths still write canonical `starts_at` and
`ends_at`. Evidence observation is now labelled `Evidence checked on` and is
date-only so it cannot be mistaken for the event schedule.

`data/event-imports/lusaka-launch-v1.json` is the first reviewed manifest. It
contains two future, taxonomy-compatible draft records with stable creation and
provenance request keys. Six unresolved groups remain explicit holds for
taxonomy mismatch, conflicting facts, or inadequate event-specific evidence.
The paired importer is dry-run by default, targets the main project explicitly,
requires admin authentication for `--apply`, refuses to overwrite independently
added evidence, and verifies that imported rows remain drafts.

Verified locally:

- Phase 4.8A schema and RLS static checks;
- admin provenance client contract checks;
- manifest validation and the no-write default;
- session lifecycle checks; and
- complete workspace typecheck.

Authenticated detail-manager acceptance also saved two private unverified
sources and one unverified action on an existing event, reloaded with exactly
one copy of each, and removed all three successfully. The child rows were
cleaned up; the immutable audit entries remain by design.

Not yet performed:

- authenticated imported-event creation with the dedicated schedule UI;
- intentional `--apply --confirm-main` of the two reviewed drafts; or
- database acceptance with those real rows. Publication remains a separate
  human review after prices and action availability are rechecked.

### Slice 3 — Consumer trust surface

1. Extend persisted event detail with public sources and action links.
2. Add one primary external CTA, provider disclosure, citation, and
   unavailable/sold-out/closed fallbacks.
3. Keep legacy hardcoded event routes visually distinct or remove their
   production reach; never fabricate citations.
4. Verify desktop/mobile wrapping, keyboard focus, and safe navigation.

Suggested commit: `feat(consumer): show event sources and external actions`

#### Slice 3 implementation delivery — 26 August 2026

Implemented locally after one researched/imported event completed admin review
and publication. Persisted consumer event detail now loads the public child
records through their existing RLS boundary and presents:

- one deterministic primary external action, with provider disclosure before
  navigation;
- a restrained verified-source citation and last-checked date;
- non-navigable sold-out, cancelled, and unavailable states; and
- safe new-tab navigation with `noopener noreferrer` and visible keyboard
  focus treatment.

Closed, invalid, unverified, stale, and private evidence remains hidden by
database policy. When an imported event has no publicly usable action, the UI
therefore presents a generic unavailable state rather than exposing a dead or
untrusted URL. A cancelled event may retain its public citation but never
renders an external booking action. Legacy non-UUID demo routes do not query or
receive fabricated provenance.

Automated coverage includes table-driven active, sold-out, closed, invalid,
missing-action, multiple-source, ordinary-event, and cancelled-event mapping;
consumer query-field/static safety checks; workspace typecheck; and the
consumer production build.

High-level browser acceptance passed on 26 August 2026 at 1020×695 and 390×844.
The published imported event rendered one CTA, provider disclosure, public
citation, and checked date without horizontal overflow. Both links used safe
new-tab attributes, the CTA retained a 48px target, keyboard focus was visible,
and the console remained clear. The tested record still contains deliberate
`example.com` browser-test source/action data; replace or retire that content
before treating it as launch inventory. Slice 3 is complete.

#### Listing-attribution follow-up — 26 August 2026

Persisted event detail now uses honest listing attribution rather than calling
every listing party the event organiser. D8-created and researched/imported
events render `Listed by D8Advisr`; partner-created events render the associated
organization name with a D8 Partner label. A narrow security-definer function
returns only attribution type and display name for an already-public event.
`partner_organizations` RLS and column grants were not widened, and clients
cannot submit an attribution display name.

Migration `20260826113000_public_event_listing_attribution.sql` was applied to
the main project after an encrypted snapshot round-trip. Local/remote migration
history matches, linked database lint reports no errors, and the production
anonymous smoke verifies both the D8Advisr result and the existing private/write
denial boundaries.

### Slice 4 — Partner parity, deliberately later

After the admin/import path works, discover partner operational need. If
accepted, partner source/action editing must use an audited revision contract,
including treatment of live primary ticket-destination changes. Do not begin
with direct partner update policies on the child tables.

## Verification framework

### Automated

- Static schema/RLS/grant and client-integration checks.
- Table-driven URL, label, primary-selection, and display-state tests.
- Database role matrix and bypass attempts.
- Idempotent retry and optimistic-concurrency checks.
- Draft/live/cancelled/retired parent visibility checks.
- Import publication blocked without verified evidence and allowed with it.
- Consumer mapper tests for active, sold-out, closed, invalid, multiple-source,
  and no-link events.
- Workspace typecheck and both client builds before release.

### High-level browser journeys

1. Admin creates an imported draft, adds two evidence sources and one ticket
   link, reloads, and sees the same state without duplication.
2. Publication is blocked without verified evidence, then succeeds after
   verification; consumers see only public evidence and the primary safe CTA.
3. A source becomes stale and a ticket action becomes sold out/closed; the
   audit remains while consumer presentation updates correctly after refresh.

## Delivery and rollback

The schema is additive. Do not rewrite applied migrations and do not seed in
the migration itself. Before a main-project migration, use the existing
encrypted production snapshot/preflight. Apply schema first, run read-only and
role checks, then deploy admin integration, import drafts, and finally deploy
consumer presentation. A forward rollback can disable public policies and CTAs
without deleting evidence.

## Explicitly deferred

- Ticket sales, checkout, refunds, inventory, affiliate tracking, and redirect
  analytics;
- scraping, link-health workers, and freshness counters;
- semantic source scoring and automatic price extraction;
- partner self-service mutation until revision semantics are designed;
- category expansion not justified by accepted launch inventory; and
- publication with materially ambiguous date, venue, organizer, or price.
