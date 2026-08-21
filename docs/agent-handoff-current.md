# D8Advisr Current Agent Handoff

Updated: 21 August 2026

This is the authoritative context-restoration note for a new Codex session.
It supersedes `docs/agent-handoff-2026-08-19.md`, which is retained only as
historical evidence. Do not rely on conversation memory or the old handoff.

## Start here

The repository is carried on an external drive. Its drive letter may differ on
another computer. Open the directory containing this file, `.git`,
`pnpm-workspace.yaml`, `supabase`, `artifacts`, and `lib`, then treat that
directory as the repository root.

Before changing anything:

```powershell
Set-Location <external-drive>:\d8Advisr_
git status -sb
git log -6 --oneline
supabase migration list
```

Expected source state when this handoff was written:

- branch: `main`;
- worktree: clean;
- local branch: at least 122 commits ahead of `origin/main` and not pushed;
- latest implementation commit: `de97373 feat(partner): add event venue workflows`;
- a newer documentation-only commit containing this handoff is expected;
- prior D4 commits: `071a6c9`, `98a833b`, and `8b56a85`; and
- local and staging migrations match through
  `20260821153000_event_venue_partner_workflows.sql`.

If these expectations do not match, inspect the newer history and diff before
acting. Never reset or discard newer work merely to match this note.

## Environment and secrets

The dedicated staging Supabase project reference is
`bntxnjfftikmaqnbskkq`. Production is not the test target. Do not apply or
promote migrations to production without explicit user approval.

The ignored local files should already be present on the external drive:

- `artifacts/d8advisr/.env.staging.local`;
- `artifacts/d8advisr-partner/.env.staging.local`; and
- `.env.staging.test.local`.

They contain staging URLs, anonymous keys, and test identities. Never print,
paste into documentation, or commit their contents. The test identities are
disposable staging consumer, partner, second-partner, and admin accounts.

CLI authentication and the linked-project cache are machine-local. On a new
computer, install Node, pnpm and Supabase CLI if needed, then use:

```powershell
supabase login
supabase link --project-ref bntxnjfftikmaqnbskkq
```

The link command may request the staging database password. Ask the user to
enter it securely; do not request that it be pasted into chat or committed.
If dependencies copied from another machine fail, reinstall them from the lock
file:

```powershell
Set-Location <external-drive>:\d8Advisr_
pnpm install
```

## Repository and client shape

This is one pnpm workspace with separate deployable clients sharing libraries
and one Supabase/Postgres backend:

- `artifacts/d8advisr`: consumer client plus seeded-admin routes;
- `artifacts/d8advisr-partner`: partner portal;
- `lib/d8-core`: shared auth, Supabase types, models, and constants;
- `supabase/migrations`: the only forward database history;
- `scripts`: static contract and staging role/RLS tests; and
- `docs`: roadmap, policy, implementation, and browser evidence.

Consumer/admin and partner origins deliberately have independent sessions.
Partner approval must not remove consumer access or redirect the consumer
client. Admins are seeded and use email/password; Google admin sign-in is not a
supported flow.

## Product policy that must remain intact

The MVP is a curated, mainly read-only marketplace. The internal purpose of
early usage data is learning, but do not expose language suggesting that users
are experiments or that D8 tolerates abuse for data collection. Avoid premature
analytics counters; add only data required for a live product decision.

Approved partners publish events directly. There is no routine admin event
pre-approval queue. Published material changes use policy v1.1 confirmation,
audit, and interested-consumer notifications. Cancellation applies immediately,
notifies interested consumers, and remains visibly cancelled for about 24
hours before ordinary discovery deranks it.

Partner MVP approval does not collect national IDs or business documents.
Partner application approval, venue verification, and venue publication are
separate decisions. Venue operators have venue and event tools; organizers
have event tools only. The legacy `both` database value remains compatible but
is no longer offered as an onboarding choice.

For event venues, keep these concepts separate:

1. **Venue attribution** is the organizer's factual claim that an event happens
   at a D8 venue. An uncontested event page may show this before venue approval.
2. **Venue-page placement** is revocable marketing permission to show the event
   under the venue's `Upcoming here` section.

A persisted D8 venue selection automatically informs venue managers. Venue
managers can approve, decline, or revoke venue-page placement and can report an
incorrect venue. They never gain event-editing authority. Ordinary event edits
preserve placement. Changing/removing the venue closes the old relationship
and creates or withdraws the canonical relationship transactionally.

## Current phase: Phase 4.6D4

Authoritative documents:

- `docs/implementation/phase-4-6d4-event-venue-attribution-placement.md`;
- `docs/policies/event-venue-attribution-placement-policy-v1.0.md`;
- `docs/policies/event-venue-attribution-placement-enforcement-matrix-v1.0.md`;
- `docs/testing/phase-4-6d4-local-browser-checklist.md`; and
- `docs/partner-listing-ownership-roadmap.md`.

Do not restart the older speculative Phase 4.6B/4.6C plan from the historical
roadmap table. Phase 4.6D2 and D3 replaced routine review with the accepted v1.1
direct-publication/audit/notification policy. The immediate work is D4 closure,
then Phase 5 claims.

### Completed D4 slices

Slice one (`98a833b`) added canonical `event_venue_relationships`, immutable
audit history, organization-first plus legacy-compatible authority, optimistic
versions, placement/dispute transition RPCs, and the guarded legacy projection.

Slice two (`071a6c9`) made event writes synchronize that relationship
transactionally, made `venue_page_status` server-owned, preserved decisions
across ordinary edits, withdrew/recreated relationships on venue changes, and
removed organizer payload control of placement.

Slice three (`de97373`) added:

- a safe partner workflow read without widening draft-event table RLS;
- venue approve/decline/revoke/report operations;
- organizer placement resubmission, venue correction, and dispute response;
- canonical relationship/version usage in the partner dashboard;
- durable, deduplicated, transactionally generated partner notifications; and
- notification navigation back to the partner workflow.

Migration `20260821153000_event_venue_partner_workflows.sql` is already applied
to staging. Do not edit an applied migration; use a forward migration for any
repair.

### Verification already passed

The following were green at commit `de97373`:

```powershell
pnpm run check:phase46d4
pnpm run check:phase46d4:staging
pnpm run build:staging
supabase db lint --linked --level warning
supabase migration list
```

The staging workflow test proved role-safe organizer/venue reads, consumer
isolation, notification-forgery denial, exactly one opposite-party notice per
transition, optimistic transition behavior, and fixture cleanup. Production
builds passed with existing non-blocking bundle-size, sourcemap, and stale
Browserslist warnings.

### Browser acceptance still pending

Do not mark slice three browser-complete until the user reports these two
journeys:

1. Organizer selects another partner's D8 venue; venue manager receives one
   attribution notice, approves `Upcoming here`, then revokes it. Attribution
   and the event remain while marketing placement changes; organizer receives
   decisions and can resubmit.
2. Venue manager reports an incorrect venue with a reason; organizer receives
   one notice, sees the reason, can correct the venue or add a response; venue
   manager receives one response notice.

Use the exact steps in `docs/testing/phase-4-6d4-local-browser-checklist.md`.

Local staging servers:

```powershell
# Window 1: consumer and admin
Set-Location <external-drive>:\d8Advisr_
pnpm run dev:consumer:staging

# Window 2: partner
Set-Location <external-drive>:\d8Advisr_
pnpm run dev:partner:staging
```

## Next implementation: D4 slice four

After recording slice-three browser results, run fresh discovery before edits.
Do not rely on this note for exact current code paths. Inspect the consumer
event/venue reads and detail components, admin dashboard queues, existing admin
notification model, relationship RLS/audit, `resolve_event_venue_dispute`, and
the interested-consumer notification dispatcher. Write a mini plan before
implementation and commit after each key change.

The bounded slice-four outcome is:

- an admin operational surface for incorrect-location disputes, party-visible
  reasons/responses, immutable history, and confirmed/invalid resolution;
- a disputed public event location rendered neutrally without a confirmed D8
  venue link or venue-page promotion;
- an uncontested factual venue attribution still visible on the event page even
  when venue-page marketing is declined or revoked;
- only approved live placement shown under the venue's `Upcoming here`;
- interested consumers notified only when a relied-upon public location is
  suppressed, corrected, or restored as policy requires; and
- no transfer of organizer editing rights to venue managers or admins through
  the relationship workflow.

Discover the existing admin notification architecture before choosing whether
the queue itself or a durable admin inbox is the correct MVP signal. Do not add
an email/push outbox, speculative response analytics, forced response deadline,
or semantic reapproval classifier in this slice.

Minimum slice-four verification should cover consumer/partner/admin/outsider
roles, confirmed versus disputed attribution rendering, approved-only venue
placement, admin resolution concurrency and audit, recipient deduplication,
and regression of all `check:phase46d4` gates. Browser acceptance should remain
two or three high-level cross-client journeys.

## After D4

Phase 5 introduces claims on existing unclaimed listings and creates approved
organization membership without changing venue IDs. Do not start Phase 5 until
D4 automated and browser acceptance closes the venue-authority boundary.
Phase 6 later backfills legacy `partner_id` ownership and cuts RLS over to
memberships. Repository cleanup and bloat reduction remain separate measured
Phase 7 work, not incidental refactoring during D4/5.

## Working rules

- Fresh discovery, then a mini plan, then implementation.
- Commit after each stable key change.
- Preserve unrelated user changes in a dirty worktree.
- Never rewrite an applied migration.
- Never expose `.env*.local` values or database passwords.
- Never test a new migration in production first.
- Keep browser test lists high-level; automated tests own smaller permission
  and mutation assertions.
- Do not push unless the user explicitly asks.
- If the external drive temporarily disconnects, stop writes and verify the
  resolved repository path after reconnection.
