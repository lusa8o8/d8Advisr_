# Event Commercial Integrity, Revisions, and Notifications

Status: implementation plan; no schema or UI changes applied by this document

Decision date: 18 August 2026

Governing policy:

- [Partner Event Publishing and Change Policy v1.0](../policies/partner-event-publishing-policy-v1.0.md)
- [Partner Event Enforcement Matrix v1.0](../policies/partner-event-enforcement-matrix-v1.0.md)

## 1. Outcome

D8Advisr must preserve the commercial promise made when an event is first
published, route later changes through one auditable contract, and notify the
right consumers without turning every edit into an administrator bottleneck.

The implementation must guarantee, at the database boundary, that a published
free event never becomes paid and that a published price never increases. A
price reduction becomes the new permanent maximum. Unpublishing, transferring,
claiming, or returning an event to draft must not reset that history.

## 2. Discovery findings

The current implementation is not ready to enforce the policy safely:

1. Partners insert and update `public.events` directly from
   `partnerEventData.ts`. Publishing is represented by an ordinary
   `event_status` value rather than a versioned publication operation.
2. `price_pp` is an integer even though the UI accepts text and parses it with
   `parseFloat`. Existing code also strips non-numeric characters and falls
   back to zero, which explains why invalid paid values can publish as `K0` and
   decimal values can fail at the database.
3. The current event trigger normalizes attendance and free-entry values, but
   it does not preserve first-publication facts or reject later commercial
   regressions.
4. Events have no revision table. Venue revisions provide a useful workflow
   reference, but event changes need time-window classification, consumer
   impact, commercial rules, and occurrence scope that venue revisions do not.
5. `partner_notifications` is durable and protected by RLS. The consumer
   notification screen is hardcoded, so there is no durable cross-client
   notification contract.
6. `demand_signals` is append-only analytics with short-window deduplication.
   It records views and actions but cannot answer whether a consumer is still
   interested. It must not be used as notification-recipient truth.
7. Recurring events currently use one event row plus frequency and next-event
   display fields. There is no occurrence table on which to enforce
   occurrence-specific changes.
8. Privacy and Terms routes exist on both clients, but there is no versioned
   partner-policy page or stored publication acknowledgement.

## 3. Non-negotiable invariants

These rules belong in PostgreSQL, not only in React:

- `first_published_at` is write-once historical state.
- A first-published-free event remains free permanently.
- A paid event's current public price may stay equal or decrease, never rise.
- Currency is immutable after first publication.
- A mandatory charge cannot be added or increased after publication.
- A policy acknowledgement is required for first publication.
- Direct updates cannot bypass protected-field checks.
- A blocked change cannot be approved through the normal admin queue.
- Every material attempt has an actor, organization, policy version, before
  state, proposed state, decision, and timestamp.
- Notifications are generated from the accepted revision in the same database
  transaction, with stable idempotency keys.
- RLS prevents one partner or consumer from reading another account's private
  revisions, interests, or notifications.

## 4. Proposed database contract

### 4.1 Versioned acknowledgements

Add `event_publication_acknowledgements`:

| Column | Purpose |
| --- | --- |
| `id` | Immutable acknowledgement ID |
| `event_id` | Event being published |
| `organization_id` | Publishing organization |
| `actor_user_id` | Authenticated publisher |
| `policy_id`, `policy_version` | Exact accepted policy |
| `policy_content_hash` | Detects accidental content/version mismatch |
| `acknowledged_snapshot` | Title, occurrence scope, date/time, location, free/paid state, price, currency, charges |
| `acknowledged_at` | Server timestamp |
| `source` | `partner`, `admin`, or explicit legacy migration marker |

An acknowledgement is append-only. Do not invent acceptance records for legacy
events. Mark their baseline source as legacy and require acknowledgement at the
next affected publishing action.

Policy copy can initially remain versioned in source control. A small
`policy_versions` table may be added when multiple active versions or localized
content make database lookup necessary.

### 4.2 Event commercial fields

Change `price_pp` to `numeric(12,2)` while preserving existing values as major
currency units. The current product displays these values as `K150`, not as
minor units, despite the obsolete schema comment that says USD cents.

Add to `events`:

- `first_published_at timestamptz`;
- `initial_published_is_free boolean`;
- `initial_published_price numeric(12,2)`;
- `initial_published_currency text`;
- `commercial_policy_id text`;
- `commercial_policy_version text`;
- `commercial_baseline_source text`;
- structured mandatory-charge fields when D8 supports required fees.

Validation must require:

- free events: `is_free = true` and `price_pp = 0`;
- paid events: `is_free = false` and `price_pp > 0`;
- no more than two decimal places;
- a supported currency code/symbol mapping for the event location; and
- nonnegative mandatory amounts.

A `BEFORE UPDATE` trigger compares protected values with `OLD`, not only the
initial baseline. This makes pricing monotonic: after K150 is reduced to K100,
K100 is the new maximum. The trigger also rejects resets caused by status,
owner, or organization changes.

### 4.3 Active event interest

Add a current-state table such as `event_interests`:

- `user_id`, `event_id`, and `interest_type`;
- active/inactive state and timestamps;
- optional source references for a reminder, saved item, plan stop,
  registration, ticket, or waitlist entry;
- a unique key that prevents duplicate active relationships.

Views remain in `demand_signals` for analytics and never create notification
eligibility. Removing a reminder, saved event, plan stop, registration, or
waitlist position must update current interest state.

### 4.4 Event revisions

Add `event_revisions` with:

- event and optional occurrence scope;
- status: `applied`, `pending`, `approved`, `rejected`, `blocked`, or
  `cancelled`;
- immutable before and proposed JSON snapshots;
- changed-field list, enforcement code, rule code, and risk classification;
- actor, organization, source client, reason, emergency reason, and policy
  version;
- expected event `updated_at` for optimistic concurrency;
- reviewer, decision note, and decision timestamps;
- affected-interest and affected-registration counts captured at decision;
- financial-reconciliation state for future ticketing.

Allow at most one pending revision for the same event and occurrence scope.
Rejected and blocked attempts remain queryable audit records.

Create security-definer RPCs with narrow grants:

1. `partner_publish_event(...)` validates the draft, consumes an explicit
   acknowledgement, establishes the baseline, and publishes atomically.
2. `partner_submit_event_revision(...)` classifies the proposed diff. It
   rejects blocked changes, applies eligible automatic changes, or creates one
   pending revision.
3. `admin_review_event_revision(...)` approves or rejects only reviewable
   changes and verifies that the event has not changed since submission.
4. Dedicated cancellation, postponement, and rescheduling RPCs preserve status
   history and trigger the correct notifications.

After those RPCs exist, revoke or narrow direct partner updates to event
commercial, status, identity, location, schedule, and capacity fields. Admins
use the same contract in normal product flows; service-level emergency access
must be separate, logged, and unavailable to the browser.

### 4.5 Notifications and delivery

Prefer one durable `notifications` table for consumers, partners, and admins:

- `user_id`, type, severity, title, body, and structured metadata;
- event and event-revision references;
- `requires_action`, `read_at`, and `acknowledged_at`;
- stable deduplication key, normally recipient + revision + notification type;
- server timestamps only.

Use RLS so users can select and mark only their own notifications. Admin access
must be explicitly scoped. Existing `partner_notifications` can be migrated or
temporarily exposed through an adapter, but two permanent notification systems
would duplicate delivery, RLS, and UI work.

Create in-app notification rows in the same transaction that applies a
revision. Add a delivery outbox for email and later push. Workers claim outbox
rows idempotently and record provider attempts; the revision transaction must
not wait for an external email provider.

Recipient selection uses active `event_interests`. An `event_view` signal alone
is excluded. A blocked free-to-paid or price-increase attempt notifies the
partner only because no public change occurred.

### 4.6 Recurring events

The current single-row recurrence model cannot safely distinguish one
occurrence from a series. In the first release:

- enforce the commercial invariant at series level;
- do not offer occurrence-specific protected edits; and
- require a new series for a different commercial model.

Later add `event_occurrences` with occurrence start/end, status, venue override,
capacity, and immutable commercial inheritance. Revision scope can then be
`single_occurrence`, `date_range`, or `all_future` while past occurrences stay
immutable.

## 5. Proposed UI contract

### 5.1 Shared policy surfaces

Add a public Partner Policies index and Event Publishing and Change Policy page
on both domains. Link it from partner onboarding, settings, event creation,
event editing, the publish confirmation, and legal footers. Display policy ID,
version, approval date, and effective status.

### 5.2 Partner create and edit

- Use a numeric input that accepts at most two decimal places.
- Reject empty, alphabetic, malformed, negative, or zero paid prices inline and
  again server-side.
- Explain that `0` attendance means open attendance; otherwise require a whole
  number greater than zero.
- Before first publish, show a summary modal and require the exact versioned
  acknowledgement from the policy.
- On a published event, lock free-to-paid, price increase, and currency
  controls with a plain-language reason and policy link.
- For permitted changes, show the before/after diff, timing window, affected
  audience, warning, reason input, and whether the change is automatic or sent
  for review.
- Show pending, approved, rejected, and blocked revisions with review notes and
  change history. Rejection reasons must persist and be visible to the partner.
- Preserve draft and edit state across refreshes and tab changes using the
  existing draft-recovery direction.

### 5.3 Admin review

Add event revisions to the submissions/review workspace with:

- exact before/after values and highlighted protected fields;
- enforcement rule and policy version;
- time to event and P0-P4 priority;
- affected interest/registration counts;
- organizer reason and prior blocked/late-change pattern;
- persistent approve/reject reason controls; and
- no approve action for deterministic blocked changes.

Automatic changes and blocked attempts appear in history, not in the ordinary
approval queue. This is the main control against admin bottlenecks.

### 5.4 Consumer surfaces

Replace hardcoded notifications with the durable notification query and
realtime updates. Material event changes need:

- an in-app notification linked to the event and revision;
- a visible changed/cancelled/postponed state on event and plan pages;
- a concise before/after summary;
- accept/remove/refund actions when reconfirmation is required; and
- no false inventory text when attendance is open or ticket inventory is not
  connected.

## 6. Delivery sequence and commit boundaries

### Slice A - policy surfaces and commercial foundation

1. Add public policy routes and versioned copy.
2. Migrate `price_pp` to decimal and add strict constraints.
3. Add first-publication history and acknowledgement records.
4. Add publish RPC and database commercial-protection trigger.
5. Replace direct publish/status writes and fix partner/admin price inputs.

Commit separately for schema enforcement, shared policy UI, and client publish
integration.

### Slice B - event revision workflow

1. Add event revisions, classifier, and optimistic concurrency.
2. Add partner submission and admin review RPCs.
3. Remove protected direct-update paths.
4. Add partner revision history and admin priority queue.

Start with series-level changes only.

### Slice C - active interest and unified notifications

1. Add active event-interest state and integrate saves, reminders, plans, and
   later registrations.
2. Add unified notifications and migrate/adapt partner notifications.
3. Replace consumer hardcoded notifications.
4. Generate revision decision and event-change notifications transactionally.
5. Add delivery outbox and email only after in-app behavior is stable.

### Slice D - reconfirmation and ticket-aware behavior

Add consumer reconfirmation, ticket/refund reconciliation, registration-aware
capacity rules, and waitlist notifications when those domains become real.

### Slice E - occurrence model

Add normalized occurrences and occurrence-scoped revisions only after the
series-level contract is proven in staging.

## 7. Migration and backfill safety

Before applying Slice A to production or staging:

1. Report counts and IDs for live events, free events with nonzero price, paid
   events with zero price, unsupported currencies, malformed recurrence, and
   duplicate ownership.
2. Convert the column type without multiplying or dividing existing values.
3. Backfill valid live events from their current public state and mark the
   baseline source `legacy_backfill`.
4. Do not fabricate partner acknowledgements for legacy rows.
5. Quarantine or explicitly resolve invalid live rows; do not silently convert
   a paid-zero event to free.
6. Validate constraints after cleanup and before replacing client writes.
7. Keep migrations forward-only and safe to replay on staging.

## 8. Required tests

### Database and RLS

- First publish without acknowledgement is denied.
- First publish stores the exact policy version and commercial snapshot.
- Free-to-paid is blocked for partner and ordinary admin paths.
- Every price increase is blocked, including after unpublish, ownership change,
  and an earlier reduction.
- Paid-to-free and price reduction follow the confirmed path.
- Currency and mandatory-charge circumvention are blocked.
- Decimal prices round-trip exactly; letters, malformed decimals, zero paid
  price, negatives, and more than two decimals fail with useful errors.
- Concurrent revisions cannot overwrite a newer event version.
- One partner cannot read or mutate another partner's revisions.
- Consumers cannot read another consumer's interest or notifications.
- One revision creates at most one logical notification per recipient/type.
- Removed interest is not notified; an event view is never notified.
- A blocked commercial attempt never changes the public event.

### UI and browser

- Draft create/edit survives refresh and tab switching.
- Publish confirmation displays exact price/currency and policy version.
- Locked published fields explain why they cannot change.
- Reduction and paid-to-free warnings show before/after values.
- Partner sees persistent pending, approval, rejection reason, and audit history.
- Admin queue priorities and decisions persist through refresh.
- Consumer event, plan, and notification states agree after an approved change.
- Open attendance never renders `Only 0 left` or invented ticket inventory.
- Consumer, partner, and admin sessions remain isolated across all new routes.

Run static migration checks first, then staging role-isolation scripts, then the
three-client local browser checklist against staging. Production promotion
requires the same migration inventory and smoke checks used in earlier phases.

## 9. Product decisions still to resolve before later slices

These do not block Slice A's permanent commercial invariant:

- exact automatic-refund behavior once D8 handles payments;
- whether the proposed 15-minute and 20% operational thresholds remain the
  default or become remotely configurable policy values;
- the first structured model for mandatory charges and external ticket links;
- whether existing partner notification rows are migrated into the unified
  table or retained behind a compatibility view; and
- when registrations/tickets justify building occurrences rather than keeping
  the series-level restriction.

Thresholds must live in one versioned server-side classifier, not as scattered
client constants.
