# Phase 4.7C1 - Canonical Write Foundation

Status: complete on main

Date: 24 August 2026

Environment: main Supabase project, under the owner's explicit pre-launch
production-first exception

## Outcome

Make a D8 discovery market a first-class write key without changing consumer
identity, guessing unknown locations, or overwriting a listing's truthful
physical locality.

## Discovery findings

- consumer profiles still store a market ID in the legacy `city` field;
- the listing compatibility trigger uses an unordered global `limit 1` and
  rewrites `city` from a region display name;
- admin creation RPCs accept only display `city` even though listings already
  have `region_id`;
- partner applications already contain the canonical `region_id`, but new
  partner venues/events do not persist it explicitly; and
- event currency is still supplied by clients in several creation paths.

## Mini-plan

1. Add nullable `profiles.region_id`, backfill only unique legacy matches,
   remove the silent Lagos default for new profiles, and retain `city` for a
   one-release dual-read/dual-write boundary.
2. Add one deterministic resolver: explicit IDs must exist; legacy display
   names must match exactly one market; unknown or ambiguous values fail.
3. Replace listing triggers so `region_id` validation and market-owned event
   currency do not overwrite physical `city`.
4. Abort if any existing venue/event cannot be safely resolved, then require
   `region_id` on both tables.
5. Make admin and partner creation submit a canonical market ID. Preserve
   current physical locality text independently.
6. Add static contract checks, typecheck/build, database lint/preflight, apply
   the migration to main, and run the read-only production smoke.

## Explicit boundary

4.7C1 does not redesign listing location-edit/revision audit payloads. Those
become 4.7C2 so region changes can be represented explicitly in history rather
than inferred from a changed `city` string.

## Production delivery evidence

Migration `20260824150000_phase47c1_canonical_write_foundation.sql` was applied
to main on 24 August 2026. It completed transactionally, which proves every
existing venue and event had a deterministic market key; otherwise its stop
checks would have rolled the migration back.

Post-apply checks:

- local and remote migration history match through `20260824150000`;
- linked database lint reports no schema errors;
- public inventory remains 16 venues and 6 events;
- the canonical Lusaka venue predicate still returns all 16 venues;
- Lagos/Lusaka remain the only anonymously visible markets and four inactive
  Zambia markets remain hidden;
- anonymous access to plans, partner applications, and consumer notifications
  remains HTTP 401;
- `pnpm run check:phase47c1` passes; and
- both consumer and partner staging-mode builds pass.

Managed backup inventory remained empty and PITR remained disabled. That risk
was explicitly accepted for this pre-launch production-first delivery and is
not a post-launch precedent.

## High-level browser acceptance

1. **Consumer market preference:** sign in as an existing consumer, change the
   city/destination in Settings, refresh, and confirm Home and Map remain in
   the chosen live market.
2. **Admin creation:** create one draft venue or event in Lusaka and confirm it
   persists/reads only under the Lusaka market; an event derives ZMW without a
   client currency choice.
3. **Partner creation:** create one partner draft in the approved application
   market and confirm the D8-venue picker and resulting listing remain scoped
   to that market.

## Stop conditions

- any existing listing has no deterministic market;
- the migration would alter or delete a consumer UUID;
- a market selection overwrites listing physical locality;
- an inactive market becomes consumer-visible; or
- RLS/private-table access widens.
