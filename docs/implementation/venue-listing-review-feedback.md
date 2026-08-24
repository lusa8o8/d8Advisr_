# Venue Listing Review Feedback

Status: implemented in the admin and partner clients on 24 August 2026.
TypeScript and both production builds pass. Browser acceptance is explicitly
deferred and must not be reported as passed.

## MVP decision

Venue listing review uses two outcomes:

- approve the listing;
- return it for updates with a required free-text reason.

The UI does not classify feedback into guessed categories such as `needs better
photos`. Review text is stored in the existing `venues.reverification_reason`,
venue change log, reverification task, and partner notification metadata. The
partner dashboard presents the same text as the action required before
resubmission.

This keeps the MVP workflow auditable while allowing recurring feedback themes
to emerge from actual reviews. Categories should only be introduced after the
team has enough review history to show that they reduce work or improve data
quality.

## Known lifecycle follow-up

The current venue lifecycle does not store a distinct partner-resubmission
transition. A returned `needs_update` row can therefore reappear in the admin
query without a durable signal that the partner has finished responding. Do not
solve this with a client-only filter. A later bounded change should add an
explicit return/resubmit transition and resolved venue-review history.

## High-level browser journey

1. In Admin Submissions, enter a multi-word reason and return a venue. Confirm
   the field retains focus while typing and the card leaves the current view.
2. In the partner portal, confirm the venue card says `Listing needs updates`,
   shows the exact reason, and offers `Update and resubmit`.
3. Approve a separate listing and confirm it becomes live without requiring a
   return reason.
