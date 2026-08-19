# Phase 4.6A Event Commercial Foundation

Status: database, shared policy UI, client integration, and automated staging
verification complete; browser groups 1-3 passed on 19 August 2026; admin
browser acceptance requires one focused retest after commit `e2de756`

Date: 18 August 2026

Governing documents:

- `docs/policies/partner-event-publishing-policy-v1.0.md`
- `docs/policies/partner-event-enforcement-matrix-v1.0.md`
- `docs/implementation/event-commercial-integrity-revisions-and-notifications.md`

## Fresh discovery

The current event contract has four independent write paths:

1. partners insert and update `events` directly in `partnerEventData.ts`;
2. partner dashboard publish/resume actions directly update `event_status`;
3. admin creation calls `admin_create_event`, which wraps an older integer-based
   creation RPC; and
4. existing RLS gives partners broad insert/update/delete access to their own
   events while admins have global event access.

Current price behavior is unsafe. `price_pp` is an integer, the partner client
strips arbitrary characters before using `parseFloat`, malformed paid values
fall back to zero, and the admin RPC casts prices to integer. The attendance
trigger normalizes free prices but does not preserve first-publication facts or
prevent later price increases.

Both public clients expose Privacy and Terms routes from shared core code. No
public partner-policy route or reusable policy constants exist.

Admin authorization is a global `profiles.is_admin` boolean. Regions are
canonical records, but there is no additive country/region admin assignment
model.

### Staging inventory

Read-only inventory on 18 August 2026 found:

- six events, all live, in the Lusaka/ZMW region;
- five commercially valid live rows;
- one live paid event with a zero price (`Lusaka Comic Con`); and
- one legacy `partner_id` event without an organizer organization.

The invalid row must not receive a fabricated price or be silently reclassified
as free. It will be recorded as a migration exception and returned to draft for
explicit correction before republication.

## Bounded implementation

### Database migration 1: commercial foundation

- Change `price_pp` from integer to `numeric(12,2)` without multiplying or
  dividing existing values.
- Add scale, nonnegative, free-zero, and live-paid-positive constraints.
- Add immutable first-publication timestamp, free/paid state, price, currency,
  policy version, and baseline-source columns.
- Backfill valid live rows from their current public state with source
  `legacy_backfill`; never fabricate acknowledgements.
- Record invalid live rows in a migration-exception table and return them to
  draft before validating live-event constraints.
- Add append-only, versioned publication acknowledgements with server-built
  snapshots and idempotent request keys.
- Add one security-definer publication RPC used by partners and admins.
- Reject direct draft-to-live updates outside that RPC.
- Enforce free-stays-free, monotonic non-increasing price, and immutable
  currency after first publication for partner and ordinary admin writes.
- Preserve the baseline through pause, draft, ownership, and organization
  changes.
- Update the admin creation wrapper to create a draft first and use the same
  publication RPC when `publication_status = live`.

Mandatory-charge fields are not added in this slice because D8 has no
structured charge model yet. The public policy still prohibits evasion; a
later migration will add structured charges before D8 supports ticket fees.

### Database migration 2: additive admin scope foundation

- Add explicit `platform_admin`, `country_admin`, and `region_admin`
  assignments.
- Backfill every current boolean admin as `platform_admin`.
- Add helpers for platform and region access without changing current RLS
  behavior.
- Restrict assignment management to platform admins.
- Do not build the Events directory, assignment UI, or regional enforcement in
  this phase.

### Shared UI and client integration

- Add shared, versioned event-policy constants and strict decimal parsing.
- Add public Partner Policies and Event Publishing Policy routes to both
  clients and include them in legal navigation.
- Require a before/after publication summary and explicit acknowledgement for
  first publication in partner and admin flows.
- Change partner creation to save a draft and publish through the RPC.
- Change dashboard draft publication and paused-event resumption to use the
  RPC; first publication requires acknowledgement, resumption does not reset
  the baseline.
- Keep approved partners able to publish without admin approval.
- Lock or reject free-to-paid, price increase, and currency changes on
  previously published events. Full operational revision routing remains Phase
  4.6B.

## Verification

Static checks must prove:

- migration columns, constraints, triggers, RPC grants, and admin assignment
  helpers exist;
- the policy ID, version, acknowledgement text, and content hash agree across
  database and shared client constants;
- no partner/admin first-publication path writes `event_status = live`
  directly; and
- paid inputs reject letters, zero, negative values, and more than two decimal
  places while accepting values such as `150.50`.

Staging checks must prove:

- invalid legacy live rows are quarantined and recorded;
- valid legacy events retain their current public price and baseline;
- publish without acknowledgement is denied;
- first publication writes one idempotent acknowledgement and baseline;
- partner and admin can publish through the shared contract;
- consumers cannot call the publication RPC;
- free-to-paid, every price increase, and currency change are denied for both
  partner and admin;
- paid-to-free and price reduction remain allowed in this foundation slice;
- pause/resume and ownership changes do not reset the baseline; and
- admin assignment rows do not leak or allow scoped admins to self-escalate.

Run library/client typechecks and staging builds after integration. Browser
acceptance follows the database smoke tests.

## Commit boundaries

1. `docs(events): plan phase 4.6a commercial foundation`
2. `feat(db): enforce published event commercial baseline`
3. `feat(db): add future admin access scopes`
4. `feat(policy): publish versioned partner event policy`
5. `feat(events): require acknowledged event publication`
6. `test(events): verify phase 4.6a staging contract`
