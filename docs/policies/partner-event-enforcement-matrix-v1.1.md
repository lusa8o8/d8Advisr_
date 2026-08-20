# Partner Event Enforcement Matrix

Policy ID: `partner-event-publishing-v1.1`

Matrix version: `1.1`

Approved: 20 August 2026

## Outcomes

- **Automatic:** validate, apply, and audit.
- **Confirm + apply:** display before/after values, require explicit
  confirmation, apply, audit, and notify active interested consumers.
- **Strong confirm + apply:** destructive confirmation, immediate application,
  audit, and notification.
- **Block:** reject invalid or unauthorized state.

There is no routine pre-change or post-change admin approval queue in MVP.

| Change | Outcome |
| --- | --- |
| Description, vibes, emoji, images, contact, website | Automatic |
| Any valid price or currency change | Confirm + apply |
| Free to paid or paid to free | Confirm + apply |
| Date, start time, or end time | Confirm + apply |
| Venue or address | Confirm + apply |
| Attendance mode or capacity | Confirm + apply |
| Cancellation | Strong confirm + apply |
| Unauthorized actor or invalid field state | Block |

## Required operational record

Each published revision records only what the workflow presently needs:

- event and actor;
- changed fields;
- before and after values;
- policy version;
- confirmation and optional organizer reason;
- application timestamp; and
- notification linkage when recipients exist.

Do not add speculative risk scores, analytics counters, semantic labels, or
review-priority fields without a named operational consumer and a tested use.
