# D8Advisr Current Agent Handoff

Updated: 25 August 2026

This is the authoritative context-restoration note for a new Codex session.
It supersedes `docs/agent-handoff-2026-08-19.md`, which is retained only as
historical evidence. Do not rely on conversation memory or the old handoff.

## Current product priority

The partner and administrator clients are accepted as sufficient for the MVP
launch boundary, although they are not considered permanently finished. Phase
4.6D4 is closed at that boundary and Phase 4.7 canonical geography is complete
on main, including the final combined event-market/D8-venue edit browser test.

The next active workstream is Phase 4.8 consumer launch readiness in
`docs/implementation/phase-4-8-consumer-launch-readiness.md`. Start with a fresh
code and browser-state audit, then write a bounded mini plan for the first
consumer slice. Phases 5 (claims), 6 (membership RLS cutover), and 7 (broad
repository cleanup) are deliberately deferred. Do not resume them merely
because older sections below describe their original sequence.

A bounded admin listing-retirement detour has completed discovery and planning
in `docs/implementation/admin-listing-retirement.md`; no runtime implementation
has started. The proposed contract uses reversible retirement, not raw delete,
because the existing foreign-key graph can erase consumer and audit history.
Do not implement it or displace Phase 4.8 until the owner explicitly accepts
the plan.

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
- local branch: at least 128 commits ahead of `origin/main` and not pushed;
- latest implementation commit:
  `c381475 fix(events): confirm venue dispute responses`;
- a newer documentation-only commit containing this handoff is expected;
- prior D4 commits: `071a6c9`, `98a833b`, and `8b56a85`; and
- local and staging migrations match through
  `20260822003000_idempotent_event_venue_dispute_responses.sql`.

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

## Completed priority: Phase 4.7 canonical geography

The promoted main database contains 16 active live Lusaka venues, but the
consumer feed/map query the compatibility `city` field using display name
`Lusaka`. Main legacy rows store lower-case `lusaka`; staging rows store
display `Lusaka`. Both environments already store canonical
`region_id = 'lusaka'`. Commit `a18067f` fixed staging by switching from region
ID to display name and therefore became a production regression after the
baseline promotion. No listing rows were lost.

The authoritative new documents are:

- `docs/adr/0002-canonical-market-geography.md`; and
- `docs/implementation/phase-4-7-canonical-geography.md`.

Slice 4.7A is implemented locally: feed, map, events, partner D8-venue
selection, and partner event references/currency now query canonical
`region_id`. Its client contract, session lifecycle, typechecks, both builds,
and main read-only predicate smoke pass in `eeb32f2`. Both high-level browser
journeys passed on 24 August; the partner journey correctly displayed staging
venues because it ran with the staging build. The client repair was pushed to
`main`; deployment status was not re-inspected during the database-only 4.7B
slice. The
bounded schema work adds a countries catalog, country-scoped region slugs,
inactive Livingstone, Kitwe, Ndola, and Siavonga, canonical
`profiles.region_id`, and market-ID-based listing writes without removing
compatibility `city` fields.

Cross-country validation against Nigeria and South Africa amended ADR 0002:
`regions` means D8 discovery markets, not government regions. Administrative
context is optional generic metadata, and listing physical locality must remain
independent from market membership. Do not add country-specific province,
state, district, municipality, or LGA logic. The evidence and examples are in
`docs/research/cross-country-discovery-market-validation-2026-08-24.md`.

The owner explicitly authorized a pre-launch exception for Slice 4.7B: apply
the additive catalog/metadata/inactive-seed migration to main directly and
defer staging-first delivery until post-launch. This exception does not permit
destructive changes, consumer/Auth mutations, market activation, or speculative
content. Main is linked as `evfftzhrucwwfnertiup`; verify that exact ref before
every remote command and capture pre/post read-only evidence.

Slice 4.7B is now complete on main. Migration `20260824120000` is recorded
locally/remotely, linked database lint is clean, and the post-deploy smoke
preserved 16 venues, 6 events, 2 live public markets, and private-table denial.
Nigeria/Zambia are public active country references; Livingstone, Kitwe, Ndola,
and Siavonga are seeded inactive and hidden from anonymous clients. See
`docs/implementation/phase-4-7b-production-delivery.md`. Phase 4.7C is next but
requires its own delivery decision; do not silently extend the direct-main
exception.

Do not change old production event dates to populate the feed. All six main
events are currently in the past; recurrence normalization remains Phase 4.6F.

Phase 4.7 is closed. The final production browser regression confirmed a live
event could move markets and attach a destination-market D8 venue atomically,
with correct persisted market, locality, currency, venue ID, and audit reason.

## Closed at MVP boundary: Phase 4.6D4

Authoritative documents:

- `docs/implementation/phase-4-6d4-event-venue-attribution-placement.md`;
- `docs/policies/event-venue-attribution-placement-policy-v1.0.md`;
- `docs/policies/event-venue-attribution-placement-enforcement-matrix-v1.0.md`;
- `docs/testing/phase-4-6d4-local-browser-checklist.md`; and
- `docs/partner-listing-ownership-roadmap.md`.

Do not restart the older speculative Phase 4.6B/4.6C plan from the historical
roadmap table. Phase 4.6D2 and D3 replaced routine review with the accepted v1.1
direct-publication/audit/notification policy. D4 is accepted at its MVP
boundary, Phase 4.7 is complete, and ownership claims are deferred while the
consumer application becomes launch-ready.

Earlier on 24 August the user prioritized promoting the tested baseline into
the existing main Supabase project before continuing D4 slice four. That
promotion is complete. Its production plan and evidence are in
`docs/implementation/production-promotion-2026-08-24.md`. Preserve every
consumer/Auth identity; existing partner ownership is not a release-blocking
preservation requirement. Do not import staging fixtures or abandon staging as
the future migration-test environment.

The main database and client promotion is now complete: all migrations through
`20260822003000` are recorded remotely, database lint is clean, and the
production read-only API smoke preserved the 16-venue/6-event baseline while
confirming private-table denial. An encrypted Auth/consumer snapshot exists in
the user's internal Documents folder. GitHub `main` fast-forwarded to
`63c8cf8`, both Vercel projects deployed successfully, and both production
domains/assets returned HTTP 200.

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

### Browser acceptance in progress

Journey 1 passed on 21 August 2026 after the browser-acceptance repair in
`cebd506`:

1. Organizer selects another partner's D8 venue; venue manager receives one
   attribution notice, approves `Upcoming here`, then revokes it. Attribution
   and the event remain while marketing placement changes; organizer receives
   decisions and can resubmit. Approval, revocation, public attribution,
   notification, and explicit resubmission all passed. Resubmission is optional;
   taking no action leaves the event off the venue page with attribution intact.

Journey 2 reached response persistence and venue notification on 22 August but
did not pass: the organizer card failed to show the saved response and invited
three duplicate submissions, producing three notifications. Repair `c381475`
shows the saved response, uses an explicit `Update response` action, blocks an
unchanged client update, and adds a forward migration that makes identical
database retries notification-safe. Do not delete the existing duplicate
staging notifications; they are test evidence.

The forward repair is applied to staging and the complete D4 staging gate
passes, including identical stale-retry idempotency and exactly one response
notice. Do not mark slice three browser-complete until the repaired browser
journey proves one response notification plus visible saved-response feedback.

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

## Deferred D4 expansion

Do not implement the former slice-four scope unless real disputes, consumer
confusion, support volume, or repeated manual admin handling justify it.
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

## Deferred ownership and cleanup phases

Phase 5 claims, Phase 6 membership/RLS cutover, and Phase 7 broad cleanup are
deliberately deferred while consumer launch readiness is prioritized. Their
existing plans remain valid reference material, not active instructions.

## Working rules

- Fresh discovery, then a mini plan, then implementation.
- Commit after each stable key change.
- Preserve unrelated user changes in a dirty worktree.
- Never rewrite an applied migration.
- Never expose `.env*.local` values or database passwords.
- Use staging first after launch. The sole current exception is the explicitly
  authorized, additive Phase 4.7B pre-launch main-project delivery recorded in
  its implementation plan.
- Keep browser test lists high-level; automated tests own smaller permission
  and mutation assertions.
- Do not push unless the user explicitly asks.
- If the external drive temporarily disconnects, stop writes and verify the
  resolved repository path after reconnection.
