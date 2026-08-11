# Staging Seed and Test Identities

Status: repeatable seed verified — staging application pending

Date: 2026-08-11

## Outcome

Prepare repeatable staging catalog data and supported Auth identities for
consumer, partner, and admin client testing without Docker or production data.

## Fresh seed review

- `seed_lusaka.sql` contains 15 venues and 5 events.
- It does not reference `auth.users`, profiles, partners, or admins.
- All venue rows are intentionally unowned, which is suitable for testing the
  public catalog and future claim workflow.
- The original seed was not idempotent: venue slugs would conflict and events
  would duplicate on rerun.
- Current venue lifecycle triggers downgrade non-admin direct inserts to draft,
  so simply applying the old seed would produce no publicly visible venues.
- Current event defaults produce live, undisclosed-location events and satisfy
  the effective location constraint.

## Mini plan

1. Wrap the seed in one transaction.
2. Temporarily disable only the venue partner-safety trigger while loading
   trusted fixtures, then re-enable it before commit.
3. Upsert venues by slug and explicitly mark the seed set live/verified.
4. Replace only the five named, unowned seed events before reinserting them.
5. Apply the seed to staging with the explicit `--include-seed` flag.
6. Create consumer, partner, and admin staging identities through supported
   Auth APIs or the dashboard; never insert directly into `auth.users`.
7. Promote partner/admin profiles only after their Auth IDs exist.
8. Add repeatable client/API smoke checks using ignored local credentials.

## Safety boundaries

- Production remains unlinked and unchanged.
- No production user data is copied.
- Staging passwords remain in ignored local environment files.
- The seed does not create or claim partner ownership.
- Identity-role promotion is not included in normal migration history.

## Intended commits

1. `fix(db): make catalog seed repeatable`
2. `test(staging): add client smoke preparation`

## Seed verification

- The seed is wrapped in a transaction.
- The venue safety trigger is disabled and re-enabled within that transaction.
- Fifteen venues upsert by slug and are explicitly made live/verified.
- Only the five named unowned seed events are replaced on rerun.
- `git diff --check` passes.
- `supabase db push --dry-run --include-seed` reports only
  `supabase/seed_lusaka.sql` as the pending seed operation.
