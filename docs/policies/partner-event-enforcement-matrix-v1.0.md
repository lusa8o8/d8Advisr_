# Partner Event Enforcement Matrix

Policy ID: `partner-event-publishing-v1.0`

Matrix version: `1.0`

Approved: 18 August 2026

Status: implementation contract

## 1. Enforcement codes

- **B — Block:** reject deterministically; admin review cannot approve it.
- **A — Automatic:** apply after validation and audit.
- **C — Confirmed automatic:** show before/after warning and require explicit
  organizer confirmation before applying.
- **R — Review:** create a pending revision for D8 approval.
- **E — Emergency review:** expedited review with a required emergency reason.
- **N — New event:** cancel/archive the original and create a separate event.

Notification codes:

- **P:** notify the publishing partner.
- **I:** notify interested consumers in-app.
- **M:** send critical email when delivery is enabled.
- **K:** require consumer reconfirmation.
- **W:** notify a waitlist or registered cohort when it exists.

## 2. Commercial matrix

| Proposed change after first publication | Decision | Admin queue | Notifications | Notes |
| --- | --- | --- | --- | --- |
| Free to paid | B | Never | P | Record blocked attempt; new event required |
| Increase entry price | B | Never | P | Compare against the current public price; every reduction establishes a new permanent maximum |
| Change currency | B | Never | P | Prevents disguised increases |
| Add/increase mandatory fee, deposit, minimum spend, package, door payment, or required external ticket | B | Never | P | Structured charges and moderation must close text/link loopholes |
| Reduce paid price | C | Only when financial reconciliation or abuse review is required | P, I; W after ticketing | Apply only after refunds/difference handling when purchases exist |
| Paid to free | C | Only when financial reconciliation or abuse review is required | P, I; W after ticketing | Existing purchasers receive the required refund treatment |
| Correct a malformed display without changing stored amount/currency | A | No | P | Audit as correction |

The published ceiling survives status, owner, organization, claim, and
occurrence-management changes. An event reduced from K150 to K100 may not later
return to K150: an increase from the current public price is prohibited even
when it remains below the original ceiling. This removes consumer ambiguity.

## 3. Operational matrix

| Field/change | More than 72h | 72–24h | Less than 24h | Consumer treatment |
| --- | --- | --- | --- | --- |
| Typo or formatting correction | A | A | A | No notification unless meaning changes |
| Expanded description with no changed promise | A | A | A | Audit only |
| Accurate image addition/reorder | A | A | A | Audit only |
| Remove or materially replace promised imagery/content | R | R | E | I; K if core promise changes |
| Start-time change up to 15 minutes | C | R | E | I; M inside 72h |
| Start-time change over 15 minutes | R | R | E | I, M, K |
| Date change | R | R | E | I, M, K |
| End-time correction without shortened experience | C | R | E | I when plans are affected |
| Venue/address correction at same physical place | C | R | E | I; M inside 72h |
| Different venue or area | R | R | E | I, M, K |
| Different city | N | N | E only for documented emergency | I, M, K |
| Capacity increase | A | A | A | W when waitlist capacity becomes available |
| Capacity reduction below confirmed registrations | B | B | B | Never allowed |
| Capacity reduction under 20%, still above registrations | C | R | E | I if exact maximum was displayed |
| Capacity reduction of 20% or more | R | R | E | I; M inside 72h; K if access is affected |
| Open attendance to limited attendance | R | R | E | I; K when access is affected |
| Limited attendance to open attendance | C | C | R | I; W |
| Add an age or eligibility restriction | R | R | E | I, M, K |
| Remove an accessibility commitment | R | R | E | I, M, K |
| Add an accessibility improvement | A | A | A | Optional I |
| Organizer/headliner/core activity replacement | R or N | R or N | E or cancellation | I, M, K |
| Vibe/category metadata only | A | A | A | No notification unless experience meaning changes |
| Cancel | C | C | C | I, M; stop discovery immediately |
| Postpone without new date | C | C | C | I, M; stop discovery immediately |
| Reschedule postponed event | R | R | E | I, M, K |

Thresholds classify workflow risk; they do not override applicable law or
confirmed registration rights.

## 4. Interest and notification eligibility

Notify a consumer when, at decision time, they have an active:

- event reminder;
- saved/followed event;
- plan containing the event;
- registration or ticket; or
- waitlist position.

Do not notify from `event_view` alone. Analytics events and notification
subscriptions are different data domains. Removing an event from a plan,
disabling a reminder, unsaving, cancelling a registration, or leaving a
waitlist must update current eligibility.

One revision produces at most one logical notification per recipient and
channel. Delivery retries reuse the same idempotency key.

## 5. Reconfirmation

Reconfirmation changes the consumer's relationship to `needs_reconfirmation`
without silently deleting their plan or registration. The consumer can:

- accept the changed event;
- remove it from their plan or interest state;
- request the applicable refund or transfer once ticketing exists; or
- take no action, in which case D8 continues to show the unresolved warning.

## 6. Review prioritization

Admin workload is controlled by deterministic routing:

1. Block prohibited commercial changes before they reach the queue.
2. Auto-apply low-risk and equal-or-better changes after confirmation.
3. Queue only ambiguous material changes.
4. Sort emergency and near-term events first.
5. Escalate repeated blocked attempts and repeated late changes as partner-risk
   signals rather than individual ordinary revisions.

Recommended review priority:

| Priority | Condition | Target handling |
| --- | --- | --- |
| P0 | Safety issue, cancellation, event within 24h | Immediate operational response |
| P1 | Material change within 72h | Expedited review |
| P2 | Material change with active registrations/tickets | Review before public effect |
| P3 | Material change with interest but no registration | Normal review |
| P4 | No-interest identity/content review | Batch review |

## 7. Enforcement escalation

| Pattern | Response |
| --- | --- |
| First blocked commercial attempt | Explain policy and record attempt |
| Repeated blocked attempts | Partner warning and risk flag |
| Mandatory-fee evasion in text or external link | Hide affected event pending review |
| Misleading replacement event carrying old interest/social proof | Remove transferred state and review account |
| Repeated avoidable late material changes | Restrict direct publishing |
| Fraudulent reason or deliberate consumer deception | Suspend publishing or partner access |

## 8. Required evidence

Every applied, rejected, or blocked material change records:

- event and occurrence scope;
- organization and actor;
- policy ID/version;
- before and proposed values;
- classification and rule code;
- organizer reason and acknowledgement;
- decision, reviewer, note, and timestamps;
- affected-recipient count;
- notification event IDs; and
- financial reconciliation state when applicable.
