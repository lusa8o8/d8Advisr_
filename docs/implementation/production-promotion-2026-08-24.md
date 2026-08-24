# Production Promotion Plan - 24 August 2026

Status: discovery complete; production writes not started

Production Supabase project: `evfftzhrucwwfnertiup` (`D8Advisr_`)

Staging Supabase project: `bntxnjfftikmaqnbskkq` (`D8Advisr Staging`)

## Decision

Promote the tested schema and clients into the existing main project. Do not
replace the main project and do not copy staging data into it. The main
project's Auth users and consumer-owned data are the source of truth.

Staging remains the migration-test environment after this release. Promotion
does not authorize testing future migrations first against production.

The user confirmed that current partner accounts and partner ownership are not
data-preservation requirements. That does **not** authorize deleting Auth
users: consumer and partner access share the same Supabase Auth identity, so an
apparently partner-only account may also be a consumer. Preserve every
`auth.users` UUID by default. Partner applications and ownership links may be
reviewed or cleaned later without blocking this cutover.

## Fresh discovery

### Source and Git

- The external-drive repository is readable.
- `git fsck --full` found no corrupt or missing Git objects; six unreachable
  blobs are harmless Git history residue.
- The worktree is clean at `05b0c64`.
- Local `main` is 128 commits ahead of `origin/main`.
- GitHub `main` is exactly the recorded `origin/main` commit `4fef000`; the
  local history is a fast-forward and does not overwrite newer remote work.
- The current local Phase 4.6D4 source/type/session gate passes.

### Main database

Read-only public API inspection found:

- 16 venues and 6 events;
- one partner-linked venue and one partner-linked event;
- no missing city values;
- no negative prices or attendance values;
- no free events with non-zero prices;
- no live paid events with a non-positive price;
- no filled attendance above a finite limit; and
- no venue phone/website length or website-scheme violations relevant to the
  pending constraints.

Main still exposes anonymous `plans` reads and denies anonymous `regions`
reads. Both are repaired by the first August privilege/policy migrations.
Main does not expose the August organization, event revision, consumer
notification, or event-venue relationship tables. This indicates that the 56
August migrations beginning with `20260811150000` are probably pending, but
the exact remote migration history must be read with the main database
password before any push.

### Consumer preservation

The pending migration source contains no deletion of `auth.users`, consumer
profiles, plans, plan stops, saved venues, or stash data. It adds tables,
columns, policies, functions, catalogs, audit history, and controlled
backfills. Existing public event/venue rows satisfy the important validated
constraints detectable through the API.

The highest consumer risk is deployment order, not intentional data deletion:
the new clients call August tables and RPCs that do not exist on main yet.
Pushing GitHub `main` first would let Vercel publish incompatible clients.

## Promotion gates

### Gate 0 - source durability

Before production changes, push the current commit to a non-production GitHub
backup ref or tag. This protects the 128 local commits from another external
drive failure without updating the Vercel production branch. Final delivery
still fast-forwards GitHub `main` after the database gate.

Do not force-push. Reconfirm the remote head immediately before the final push.

### Gate 1 - close or accept the known partner browser risk

The placement browser journey passed. The repaired dispute-response journey
still awaits its final browser retest, although the complete staging role gate
proves identical retries are idempotent and produce exactly one notification.

Because no existing partner operation is a preservation requirement, this
remaining partner-only browser check may be accepted as a known low-risk
post-deployment check. It must remain documented as pending; do not mark it
passed without evidence. Consumer promotion does not depend on importing any
of its staging records.

### Gate 2 - exact main migration inventory

The repository is currently linked to staging. Relink to main using the secure
password flow; linking changes only machine-local CLI state:

```powershell
Set-Location <drive>:\d8Advisr_
$databasePassword = Read-Host "Paste the MAIN database password" -AsSecureString
$credential = New-Object System.Management.Automation.PSCredential("postgres", $databasePassword)
supabase link --project-ref evfftzhrucwwfnertiup --password $credential.GetNetworkCredential().Password
Remove-Variable databasePassword, credential
```

Then run only read-only inventory commands:

```powershell
supabase migration list --linked
supabase db push --dry-run
```

Expected pending start: `20260811150000_explicit_client_table_grants.sql`.
Expected pending end:
`20260822003000_idempotent_event_venue_dispute_responses.sql`.

Stop if versions are missing in the middle, an August migration is already
recorded without its schema, or the dry run starts before the expected August
boundary. Do not use `migration repair` merely to make the list green. Inspect
schema/history divergence first, following the official
[Supabase migration guidance](https://supabase.com/docs/guides/deployment/database-migrations).

### Gate 3 - recoverable production snapshot

Before applying migrations, confirm a restore path that includes Auth users,
not only public tables:

1. If the project has dashboard backups or PITR, confirm the latest restore
   point and record its time outside Git.
2. Otherwise make a logical backup using a native PostgreSQL client/session
   pooler or another machine with sufficient tooling. The normal Supabase CLI
   dump excludes managed `auth` and `storage` schemas, so a public-schema-only
   dump is not enough for the stated consumer-account guarantee.
3. At minimum export and securely retain the Auth users/identities required for
   account recovery and the consumer-owned public tables.
4. Inventory Storage separately; database backups contain Storage metadata but
   not the actual stored objects.

Supabase documents dashboard backup/PITR behavior in
[Database Backups](https://supabase.com/docs/guides/platform/backups) and Auth
user preservation in
[Migrating Auth Users](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects).

Record pre-migration counts and UUID fingerprints—not emails or tokens—for:

- `auth.users` and `auth.identities`;
- `public.profiles`;
- plans, plan stops, saved venues, stashes and transactions;
- venues and events; and
- partner applications.

### Gate 4 - production database migration

Keep the existing production clients live. The migrations are designed to be
forward/additive and retain compatibility projections.

Run:

```powershell
supabase db push --dry-run
supabase db push
supabase migration list --linked
supabase db lint --linked --level warning
```

Each migration is its own transaction. If a migration fails, stop. Do not
repair history, rerun destructive commands, or push clients until the failure
and the exact committed/rolled-back boundary are understood.

Do not run staging smoke scripts against main: they correctly refuse the main
project and several deliberately create/delete fixtures. Add a separate
production-safe smoke that performs read-only schema/RPC checks and optional
authenticated reads without modifying legitimate consumer rows.

Before Git push, verify with the old deployed client:

- anonymous landing, venues, events and regions load;
- one legitimate consumer can sign in;
- that consumer retains the same profile/onboarding state;
- existing plans/saves/stashes remain available; and
- Google consumer OAuth still returns to the consumer client.

Compare the pre/post Auth UUID fingerprints and consumer-table counts. New
empty audit/notification/reference rows are expected; loss of an existing
consumer UUID or owned row is a stop condition.

### Gate 5 - client build and environment parity

Before pushing GitHub `main`:

- confirm both Vercel projects use main project
  `evfftzhrucwwfnertiup` for production;
- confirm consumer Google OAuth and Supabase redirect URLs still target
  `https://d8advisr.com/auth/callback` as configured;
- keep Google sign-in absent from the partner and seeded-admin flows;
- confirm partner production has the same main URL/anonymous key, not staging;
- run the full workspace type/static gate; and
- build both clients locally with production-equivalent environment values.

Vercel deploys the configured production branch automatically, so the database
must be compatible before `main` is pushed. See
[Vercel Git deployments](https://vercel.com/docs/git).

### Gate 6 - fast-forward GitHub main and monitor Vercel

Re-read the remote head and require a fast-forward:

```powershell
git status -sb
git ls-remote origin refs/heads/main
git merge-base --is-ancestor origin/main HEAD
git push origin main
```

Monitor both Vercel production deployments. Do not assume one successful
project means the other succeeded.

Post-deployment smoke:

1. consumer landing and existing-consumer email/Google sign-in;
2. existing profile, onboarding, plans, saves and notifications;
3. venue/event discovery and detail pages;
4. seeded-admin email/password login and read operations;
5. partner email/password onboarding and dashboard; and
6. independent consumer/partner sessions and logout.

Partner application/ownership cleanup can follow as a separate audited task.
Do not delete shared Auth identities merely to obtain a clean partner table.

## Rollback reasoning

- **Database fails before Git push:** leave the old Vercel deployment live.
  Stop at the failed migration. Earlier successful additive migrations can
  remain while a forward repair is prepared and tested on staging.
- **Client deployment fails:** roll Vercel back to the previous production
  deployment or revert the Git commit. The migrated database is intentionally
  backward-compatible with the old clients.
- **Consumer data mismatch:** stop all further deployment, preserve logs and
  pre/post fingerprints, and use the confirmed backup/restore path. Do not
  improvise deletes or migration-history repairs.
- Never use `git reset --hard`, force-push, `supabase db reset --linked`, or
  destructive migration repair as rollback mechanisms.

## Deliberately excluded

- No staging identities, events, venues, notifications, or media are copied to
  main.
- No Phase 5 claim implementation is bundled into the release.
- No D4 slice-four consumer/admin dispute work is added before this baseline
  promotion.
- No repository cleanup or ownership-column removal is mixed into cutover.
- No production partner-account cleanup occurs until consumer identity overlap
  has been explicitly ruled out.

## Immediate next action

Complete Gate 0, then have the user securely link the CLI to main for Gate 2.
Do not apply migrations until exact history and a consumer-account recovery
path are confirmed.
