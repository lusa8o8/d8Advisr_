# Phase 4.6D3 - Administrator Event Policy v1.1 Parity

Status: complete on staging; automated and browser verification passed

Decision date: 21 August 2026

Governing policy: [Partner Event Publishing and Change Policy v1.1](../policies/partner-event-publishing-policy-v1.1.md)

## Outcome

D8-managed and partner-managed events follow the same consumer-trust contract.
The actor's role changes authorization and attribution, not the rules governing
first publication, material changes, notifications, or cancellation.

This is a Phase 4.6 closure repair and must finish before Phase 5 listing claims.

## Fresh discovery

The 21 August review found:

- both clients render the shared v1.1 policy and acknowledgement;
- partner live edits already use preview, confirmation, transactional audit,
  and interested-consumer notifications;
- `publish_event_with_policy` still accepts only v1.0 even though both clients
  submit v1.1;
- the administrator live editor and `admin_update_live_event` still prohibit
  free-to-paid changes and price increases from superseded v1.0;
- administrator material changes bypass v1.1 confirmation and consumer
  notifications; and
- the published-event trigger exempts administrators from the protected-field
  RPC boundary.

Applied migrations are immutable. Every repair in this phase is a forward
migration.

## Contract

### First publication

- New publications accept only the current v1.1 policy identifier, version,
  and content hash.
- Existing v1.0 acknowledgement and publication rows remain historical
  evidence and are not rewritten.
- Partner and administrator publication use the same RPC.

### Published edits

- Non-material changes validate, apply immediately, and create an event
  revision.
- Material changes return a non-mutating before/after preview.
- Explicit confirmation applies the change, records actor and optional reason,
  and notifies active interested consumers.
- Free-to-paid, paid-to-free, price increases, and price reductions are allowed
  after confirmation while D8 has no ticketing or registration rights.
- Invalid dates, prices, capacity, currency, and location states remain blocked.
- Protected fields cannot be written directly by either partner or admin
  browser sessions.

### Cancellation

- Administrators and partners receive a strong non-mutating preview.
- Confirmed cancellation applies immediately, is audited, and notifies active
  interested consumers.
- No routine approval queue is introduced.

## Mini plan

1. Add a forward migration for v1.1 first publication and shared admin/partner
   revision authorization.
2. Add explicit admin revision and cancellation RPC entry points while reusing
   the v1.1 mutation engine.
3. Move the administrator editor to preview/confirm/apply and add cancellation.
4. Add focused static and staging contract tests.
5. Run TypeScript, both staging builds, database lint, and one high-level
   browser journey.

## Verification contract

Automated checks must prove:

- v1.1 publication succeeds and a stale v1.0 acknowledgement is rejected;
- an admin material preview does not mutate the event;
- a confirmed admin material change creates a v1.1 revision and notifications;
- an admin non-material change applies without confirmation;
- direct protected-field mutation is rejected for an admin browser token;
- cancellation preview is non-mutating and confirmed cancellation is audited;
- partner v1.1 behavior remains unchanged; and
- client type checks and both staging builds pass.

Manual acceptance is intentionally one journey: publish an admin event, make a
material edit, confirm the preview and consumer notification, then cancel a
disposable event and confirm its cancelled consumer state.

## Delivery evidence

- `29c9ea6` documents discovery, scope, and acceptance boundaries;
- `4c3d1c7` adds v1.1 publication, protected-field enforcement, administrator
  revision confirmation, notification, and cancellation RPCs;
- `3bb69ab` adds the administrator confirmation/cancellation UI and timestamp
  normalization repair;
- `4cd1886` adds static, client, and staging gates; and
- `a16b9d3` covers automatic non-material administrator revisions; and
- `3b5218b` closes browser-discovered local-time drift, keeps the end time
  aligned when the start changes, and formats attendance independently of
  currency in material previews; and
- `c4ab29a` exposes optional cancellation reasons to consumers and reduces the
  cancelled event page to its essential status copy.

Migrations `20260821120000` and `20260821121000` are applied to staging and
local/remote migration history matches. Static contracts, TypeScript, the D3
staging smoke, the existing D2 partner regression smoke, linked database lint,
and both staging builds pass. Browser evidence confirms first publication,
aligned start/end editing without time drift, free-to-paid and paid-to-free
material confirmation, consumer price notifications, immediate cancellation,
cancelled-event deranking, and notification/direct-link history. Phase 4.6D3
is closed.

## Deliberately excluded

- no admin approval queue;
- no ticket, registration, refund, or acquired-right logic;
- no risk/reputation score or time-window classifier;
- no external email or push delivery; and
- no Phase 5 claim behavior.
