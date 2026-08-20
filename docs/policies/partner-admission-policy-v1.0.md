# D8Advisr Partner Admission Policy

Policy ID: `partner-admission-v1.0`

Version: `1.0`

Approved: 20 August 2026

Status: approved MVP product policy

## Admission and capabilities

Partner approval grants access to D8 Partner tools; it is not a global account
type and does not remove consumer access.

| Application type | Venue tools | Event tools |
| --- | ---: | ---: |
| Venue operator | Yes | Yes |
| Event organizer | No | Yes |
| Venue and organizer (`both`) | Yes | Yes |

`both` is retained as a descriptive compatibility value. Capability decisions
are enforced in PostgreSQL as well as the client. An approved applicant cannot
self-change type to gain additional tools.

## MVP review evidence

D8 may use public business presence, direct contact, existing reputation,
portfolio or event evidence, and optional physical verification. D8 does not
request or store national identity documents, passports, business
certificates, or similar sensitive uploads in the MVP admission flow.

The durable review record contains the decision, reviewer, timestamp, reason
shown to the applicant where relevant, and concise non-sensitive review notes.

Partner-account approval is separate from venue verification, venue tier, and
venue publication. Approved venue operators first receive tools; their venue
listing follows its own draft, review, and publication lifecycle.

## Outcomes

- **Pending:** D8 is reviewing the application.
- **Needs update:** the applicant can see the reason, correct allowed fields,
  and resubmit.
- **Approved:** the configured tools become available.
- **Rejected:** no partner tools are granted; the reason is visible and any
  later reapplication follows an explicit resubmission path.

All outcomes preserve the person's independent consumer access.
