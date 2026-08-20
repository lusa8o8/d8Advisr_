# Phase 4.6D2 Event Policy v1.1 Cutover

Status: implemented on staging; automated verification complete; browser acceptance pending

Decision date: 20 August 2026

Governing policy: [Partner Event Publishing and Change Policy v1.1](../policies/partner-event-publishing-policy-v1.1.md)

## Outcome

Published event changes no longer create routine administrator approval work.
Approved partners use one database-controlled path:

- non-material changes validate, apply immediately, and create an audit row;
- material changes first return a non-mutating before/after preview;
- an explicitly confirmed material change applies immediately, is audited, and
  notifies active interested consumers; and
- cancellation uses a strong confirmation, applies immediately, is audited,
  and notifies active interested consumers.

Invalid and unauthorized states remain blocked at the database boundary.
Protected published fields cannot be changed through a modified client using a
direct table update.

## Implemented contract

Migration `20260820140000_event_policy_v11_apply_audit_notify.sql`:

- adds `events.cancelled_at` and 24-hour public visibility for recent
  cancellations;
- replaces the v1.0 partner revision RPC with
  `partner_apply_event_revision_v11`;
- requires the RPC session marker for direct partner changes to protected live
  event fields;
- applies non-material revisions automatically;
- returns a confirmation preview before material mutation;
- writes accepted revisions and consumer notifications transactionally;
- adds `partner_cancel_event_v11`; and
- revokes the legacy administrator event-review RPC from browser roles.

Forward migration
`20260820141000_preserve_cancelled_event_direct_history.sql` keeps cancelled
event history readable from notifications and direct links. Explicit consumer
discovery queries enforce the approximately 24-hour discovery window and
derank cancelled rows behind live events. Migration `20260820142000` adds the
matching read-only column grant required by the project's explicit-grant model.

The partner editor renders the material before/after preview and reuses staged
media between preview and confirmation. The partner dashboard exposes a strong
cancellation flow. The administrator submission queue no longer includes
event revisions; event detail contains read-only revision history for
signal-driven investigations.

Consumer discovery includes recent cancelled events after live events, marks
them as cancelled, and disables reminder and planning actions. Direct event
links remain readable while the database visibility window is active.

## Deliberately excluded

- no risk score, reputation score, semantic change classifier, or 24/72-hour
  approval threshold;
- no routine administrator pre- or post-approval for publication or edits;
- no speculative analytics counters;
- no ticket, registration, refund, or acquired-attendance-right logic;
- no occurrence-specific revision model; and
- no external email/push delivery outbox in this slice.

## Verification

Local gate:

```powershell
Set-Location H:\d8Advisr_
pnpm run check:phase46d2
```

Staging database/RLS gate:

```powershell
Set-Location H:\d8Advisr_
pnpm run check:phase46d2:staging
```

Release/build gate:

```powershell
Set-Location H:\d8Advisr_
pnpm run check:phase46d2:release
```

Manual acceptance is limited to the three journeys in
`docs/testing/phase-4-6d2-local-browser-checklist.md`.

## Forward repair

Applied migrations are never rewritten. If the v1.1 RPC or trigger needs a
repair, add a new forward migration that replaces the affected function or
policy. Historical v1.0 and v1.1 acknowledgement/revision rows retain the
policy version accepted at the time.
