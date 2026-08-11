# Staging Migration Replay Compatibility

Status: complete

Date: 2026-08-11

## Outcome

Make the existing migration history reproducible on a fresh hosted Supabase
project without changing migration versions, application behavior, or the
production database.

## Fresh discovery

- The staging project began with an empty migration history.
- `20260428041715_remote_schema.sql` is an empty baseline migration and applied
  successfully.
- `20260428100000_d8advisr_schema.sql` rolled back because
  `uuid_generate_v4()` was referenced without its `extensions` schema.
- Fresh hosted projects already provide `uuid-ossp` in the `extensions` schema,
  but that schema was not visible through the migration session search path.
- Ten UUID defaults use the unqualified function across the core-schema and
  partner-security migrations.

## Mini plan

1. Keep the existing migration versions and ordering.
2. Declare `uuid-ossp` in the `extensions` schema where the migrations request
   it.
3. Change UUID defaults to `extensions.uuid_generate_v4()`.
4. Verify the diff contains only the compatibility documentation and UUID
   qualification changes.
5. Commit before resuming the staging migration push.
6. Verify local/remote migration parity after the push.

## Out of scope

- New ownership tables or RLS behavior.
- Seed data.
- Production migration application.
- Rewriting UUID generation to a different function.

## Intended commit

`fix(db): make uuid migrations replayable`

## Compatibility verification

- All ten UUID defaults now call `extensions.uuid_generate_v4()`.
- No unqualified `uuid_generate_v4()` calls remain in migration history.
- All three `uuid-ossp` declarations target the `extensions` schema.
- `git diff --check` passes.

## Completion record

- Commit: `76d5f18 fix(db): make uuid migrations replayable`.
- The remaining 24 historical migrations replayed successfully on staging.
- All 25 local migration versions matched staging after the replay.
- The CLI's Docker catalog-cache warning was non-blocking and did not affect
  the remote migration transaction or history.
