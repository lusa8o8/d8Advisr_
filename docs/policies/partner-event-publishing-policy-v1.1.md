# D8Advisr Partner Event Publishing and Change Policy

Policy ID: `partner-event-publishing-v1.1`

Version: `1.1`

Approved: 20 August 2026

Status: approved and implemented on staging; partner and administrator browser acceptance passed in Phases 4.6D2 and 4.6D3

Owner: D8Advisr

## Purpose and MVP boundary

D8Advisr is a curated discovery marketplace. It does not yet sell tickets,
accept registrations, or create contractual attendance rights. This policy
protects consumers from silent consequential changes while keeping publishing
practical for approved partners.

The product must not describe internal learning or data-collection objectives
in public-facing policy copy. Product analytics remain separately governed and
are added only when a defined operational decision needs them.

## Publication

Draft events are directly editable. At first publication, the publisher sees
and confirms the event's date, time, venue, free/paid state, price, currency,
and attendance mode. D8 stores the accepted policy version and acknowledged
values.

Approved partners may publish without routine admin approval.

## Published event changes

Published history is permanent even when an event later returns to draft or is
paused.

Non-material fields apply after validation and are audited:

- description;
- vibe tags;
- emoji;
- images; and
- contact, website, and minor display metadata.

Material fields require an explicit before/after confirmation, then apply and
are audited:

- price, currency, or free/paid state;
- date, start time, or end time;
- venue or address;
- attendance mode or capacity; and
- cancellation.

Interested consumers receive a durable notification for a material change.
Until active interest exists, no speculative counters or recipient rows are
created beyond the operational audit record.

## Validation and blocking

The database blocks data-integrity and authorization failures, including:

- an unauthorized organizer;
- an end time that is not after the start time;
- a negative or malformed price;
- a limited event with capacity below one;
- an unsupported currency;
- moving an event into the past; and
- malformed required venue or location state.

Free-to-paid changes, price increases, open-to-limited changes, and capacity
reductions are not permanently prohibited while D8 has no ticketing or
registration rights. They require an explicit warning, audit, and interested
consumer notification.

## Cancellation

Cancellation applies immediately after a strong confirmation and is never
held for routine admin approval. The cancelled event remains visibly marked
and deranked for approximately 24 hours, then leaves ordinary discovery while
remaining available from notifications, direct links, and history.

## Administration and enforcement

D8 does not pre-review ordinary event publication or edits. Administrators
inspect change history when consumer reviews, reports, complaints, partner
support, or another real operational signal calls for investigation. D8 may
warn, restrict, suspend, correct, or remove deceptive listings or partners.

This policy deliberately avoids risk scoring, organizer reputation algorithms,
72-hour thresholds, semantic classifiers, and ticket/refund logic until real
usage or those product domains justify them.

## Versioning

Version 1.1 supersedes v1.0 for new acknowledgements after deployment. Version
1.0 remains immutable historical evidence. Existing publication records retain
the policy version actually accepted.
