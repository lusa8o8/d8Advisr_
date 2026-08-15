# Event Attendance and Free Entry Contract

Status: local implementation; remote migration requires explicit staging approval

Date: 2026-08-13

## Discovery

- `spots_total` is the current capacity ceiling; `capacity` and `spots_left` are
  legacy duplicates and are not synchronized.
- `spots_filled` is initialized but no RSVP, booking, ticket, or attendance
  workflow legitimately increments it.
- Add-to-plan, reminder, and view actions are demand signals, not attendance.
- The UI nevertheless described `spots_filled` as attendees/going and derived
  scarcity from stale fields.
- Partner event edits previously reset `spots_filled`; the direct client update
  no longer does so, but the database needs to enforce the invariant.

## Contract

- `spots_total = 0` means open attendance with no listed ceiling.
- `spots_total > 0` means a maximum attendance limit, not live inventory.
- D8 does not claim spots taken/left or confirmed attendees until a real
  occurrence-level RSVP/registration source exists.
- Ordinary partner edits preserve `spots_filled`.
- A finite capacity cannot be reduced below preserved registrations.
- `is_free = true` means no mandatory event entry/ticket fee; food, drinks,
  transport, optional purchases, booking deposits, and venue requirements may
  still cost extra.
- `price_pp` is zero whenever `is_free` is true.

## Implementation

- Add non-negative database constraints and a trigger protecting attendance,
  free-entry pricing, and canonical legacy-field behavior.
- Stop application reads from using `capacity` or `spots_left`.
- Replace scarcity/attendee claims with Open attendance or Up to N attendees.
- Replace Free event/Free admission copy with Free entry and explanatory text.
- Keep demand analytics explicitly labelled as views, reminders, and additions
  to plans.

## Deferred

- RSVP/registration records and cancellation states.
- Booking or ticket-provider integrations.
- Check-in/attendance confirmation.
- Per-occurrence capacity for recurring events.
- Price ranges, donations, registration-required, external ticketing, and
  minimum-spend structured fields.

## Verification

- Static checks prevent legacy availability reads and partner attendance resets.
- Migration checks assert non-negative capacity/count/price and protected
  partner edits.
- Both clients typecheck and build in staging mode.
- Browser checks confirm honest open/limited capacity and free-entry copy.

Commit boundaries:

1. `feat(db): enforce event attendance semantics`
2. `fix(events): present capacity and free entry honestly`
3. `test(events): cover attendance and price contracts`