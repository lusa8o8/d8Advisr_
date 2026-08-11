# ADR 0001: Organization-Owned Listings and Claims

Status: accepted

Date: 2026-08-11

Roadmap: [Partner Listing Ownership and Repository Cleanup Roadmap](../partner-listing-ownership-roadmap.md)

## Phase 1 Mini Plan

### Bounded outcome

Define the schema and authorization contract for:

- admin-created and initially unclaimed venues/events;
- first-party D8Advisr publishing;
- partner onboarding and multi-business access;
- listing claims, verification, approval, and ownership transfer;
- migration from direct `partner_id = auth.uid()` ownership.

### In scope

- table and column contracts;
- organization, membership, claim, and listing states;
- role/capability matrix;
- RLS and RPC responsibilities;
- compatibility and backfill strategy;
- executable acceptance scenarios for later database tests;
- impact inventory for current functions, policies, triggers, and clients.

### Out of scope

- writing or applying a migration;
- changing current RLS;
- modifying admin or partner UI;
- resolving the currently orphaned production rows;
- repository package deletion or general cleanup;
- automated external business verification.

### Rollback

This phase changes documentation only. Rejection or revision of the decision has
no runtime or database rollback.

### Verification

- compare the contract against current production aggregate data;
- cover anonymous, consumer, pending claimant, active member, former member,
  and admin behavior;
- enumerate every current database object known to depend on `partner_id`;
- confirm listing IDs and historical authorship survive claims and transfers;
- confirm the model supports multiple venues and organizations per user.

### Commit boundary

Commit this ADR and any roadmap status update only:

`docs: define organization-owned listing model`

## Context

The current schema uses `venues.partner_id` and `events.partner_id` as both:

- the user who controls a listing; and
- the implied business or organizer represented by the listing.

Those are different concepts. A business can exist before its representative
creates an account, one business can have multiple managers, one user can manage
multiple businesses, and D8 can create a listing without claiming to own the
underlying venue.

Direct user ownership also makes handover look like a content migration. A
claim should change access while preserving the venue/event ID, consumer links,
reviews, analytics, audit history, and original author.

## Fresh Discovery Evidence

The following was collected from the current repository and linked Supabase
project on 2026-08-11. It must be refreshed before writing the migration.

### Applied database state

- All 25 local migrations match the linked project through
  `20260725020000_route_neutral_account_context.sql`.
- Effective event policies give admins full access and give live event partners
  access when `auth.uid() = partner_id`.
- Effective venue policies give admins full access and give live venue partners
  access when `auth.uid() = partner_id`.
- `partner_applications` permits one application per user and represents status
  and capability at the user level.
- The venue safety trigger protects `partner_id`, tier, visibility, and listing
  status from partner updates.

### Production aggregate shape

| Measure | Count |
| --- | ---: |
| Profiles | 14 |
| Admins | 1 |
| Live partner applications | 1 |
| Venues | 16 |
| Unowned venues | 15 |
| Directly owned venues | 1 |
| Events | 6 |
| Unowned events | 5 |
| Directly owned events | 1 |

The one directly owned venue and event do not belong to a profile with a live
partner application. No personally identifying data was read for this finding.

### Current dependency inventory

Effective functions containing direct `partner_id` assumptions:

- `admin_update_venue_listing_status`
- `apply_venue_partner_safety`
- `get_partner_demand_summary`
- `get_partner_review_summary`
- `set_event_venue_page_status`

Additional local SQL and client dependencies include:

- partner capability CRUD policies for venues and events;
- partner notification recipients;
- venue change-log and reverification visibility;
- event placement approval by venue owner;
- partner event and venue queries in `usePartner.ts`;
- partner save payloads that assign `partner_id = user.id`;
- consumer-facing organizer labels inferred from `partner_id`;
- shared TypeScript database types.

## Decision

Listings will be controlled by organizations, and users will receive access
through organization memberships. Authentication identities will not represent
businesses.

### 1. Organizations

Add `public.partner_organizations`.

Proposed columns:

| Column | Contract |
| --- | --- |
| `id` | UUID primary key |
| `name` | Required display/legal operating name |
| `organization_type` | `venue_operator`, `event_organizer`, `both`, or `platform` |
| `status` | `unclaimed`, `pending`, `active`, `suspended`, or `archived` |
| `contact` | Optional business contact; not publicly selected by default |
| `city` | Optional region identifier compatible with current applications |
| `created_by` | Nullable profile ID; immutable provenance where known |
| `verified_at` | Nullable verification timestamp |
| `verified_by` | Nullable admin profile ID |
| `created_at` / `updated_at` | Audit timestamps |

The migration will create one deterministic `platform` organization for
D8Advisr. Its stable ID must be declared in the migration or stored in a
well-known configuration table; application code must not search by display
name.

Organizations do not sign in. No organization row causes an `auth.users` row to
be created.

### 2. Memberships

Add `public.partner_organization_memberships`.

Proposed columns:

| Column | Contract |
| --- | --- |
| `organization_id` | Organization foreign key |
| `user_id` | Profile foreign key |
| `role` | `primary_owner`, `owner`, `manager`, or `editor` |
| `status` | `invited`, `active`, `suspended`, or `revoked` |
| `granted_by` | Nullable admin/owner profile ID |
| `granted_at` | Access grant timestamp |
| `revoked_at` | Nullable revocation timestamp |
| `created_at` / `updated_at` | Audit timestamps |

The pair `(organization_id, user_id)` is unique. A partial unique index allows
only one active `primary_owner` per organization.

A user may belong to multiple organizations. An organization may have multiple
members. The partner portal will eventually require an organization selector
when a user has more than one active membership.

### 3. Partner applications

`partner_applications` remains during migration but changes meaning:

- it records a user's request to create or join the partner ecosystem;
- it is not the long-term authorization source;
- it gains a nullable `organization_id` during the additive migration;
- an approved new-business application creates/activates an organization and
  primary-owner membership;
- an approved claim links the claimant through membership rather than changing
  the application user ID.

After cutover, organization status/type plus active membership determine portal
capability. A user's historical application status alone does not grant access.

### 4. Listing ownership and provenance

Add to `venues`:

- `operator_organization_id` nullable FK to `partner_organizations`;
- `created_by` nullable FK to `profiles`;
- `source` constrained to `d8_admin`, `partner`, `import`, or `community`.

Add to `events`:

- `organizer_organization_id` nullable FK to `partner_organizations`;
- `created_by` nullable FK to `profiles`;
- `source` constrained to `d8_admin`, `partner`, `import`, or `community`.

The organization link identifies the represented operator/organizer. It does
not identify the row author. `created_by` and `source` are immutable to normal
partners.

`partner_id` remains nullable and unchanged during compatibility phases. It is
removed only after reconciliation proves every read/write path uses
organizations.

### 5. D8Advisr publishing modes

The admin create flow must distinguish two cases:

1. **Official D8 content**: the relevant organization FK points to the stable
   D8Advisr platform organization.
2. **D8-curated third-party content**: `source = d8_admin`, while the operator or
   organizer organization is null or an unclaimed organization.

The UI must not label curated third-party events as “organized by D8Advisr.”
Authorship and representation remain separate.

For a named venue added before onboarding, the preferred admin flow creates an
unclaimed venue-operator organization and links the venue to it. An admin may
leave the organization null when the real operator is genuinely unknown.

### 6. Events and venues

An event may have both:

- an `organizer_organization_id`; and
- a `venue_id`.

These relationships are independent. The event organizer does not gain venue
management rights, and the venue operator does not gain event editing rights.
Existing venue-page placement approval remains a separate permission.

### 7. Claims

Add `public.partner_organization_claims`. Claims target organizations rather
than rewriting individual venue/event rows.

Proposed columns:

| Column | Contract |
| --- | --- |
| `id` | UUID primary key |
| `organization_id` | Required target organization |
| `claimant_user_id` | Required profile ID |
| `source_venue_id` | Optional venue from which the claim started |
| `requested_role` | Initially `primary_owner` or `manager` |
| `status` | `pending`, `approved`, `rejected`, `cancelled`, or `disputed` |
| `evidence` | Private structured metadata, minimized and access-controlled |
| `review_notes` | Private admin notes |
| `reviewed_by` / `reviewed_at` | Admin decision audit |
| `created_at` / `updated_at` | Audit timestamps |

Only one active claim per claimant/organization is allowed. Approval does not
change listing IDs or `created_by`.

Claim approval is an admin-only transactional RPC that:

1. locks and validates the pending claim;
2. validates that the organization is claimable or records a dispute;
3. creates or activates membership;
4. activates/verifies the organization when appropriate;
5. links a historical partner application if needed;
6. records immutable audit entries;
7. emits a notification after the state change.

Claimants cannot update organization ownership or membership directly.

## Authorization Contract

### Organization capability

Organization type supplies product capability:

- `venue_operator`: venue management;
- `event_organizer`: event management;
- `both`: both;
- `platform`: admin-operated D8 content only.

An active membership plus an active organization is required. User-level
`partner_type` becomes compatibility data during cutover.

### Member roles

| Action | Editor | Manager | Owner | Primary owner | Admin |
| --- | ---: | ---: | ---: | ---: | ---: |
| View own drafts | Yes | Yes | Yes | Yes | Yes |
| Edit listing content | Yes | Yes | Yes | Yes | Yes |
| Publish/pause within capability | No initially | Yes | Yes | Yes | Yes |
| Manage members | No | No | Yes | Yes | Yes |
| Transfer primary ownership | No | No | No | Yes | Yes, audited |
| Archive organization | No | No | No | Request | Yes |
| Approve claims | No | No | No | No | Yes |

The first release may expose only `primary_owner` and `manager` in the UI while
retaining the full database model.

### RLS helpers

The additive/cutover migrations should introduce stable security-definer
helpers with fixed `search_path`, tentatively:

- `is_active_organization_member(organization_id, user_id)`;
- `organization_member_role(organization_id, user_id)`;
- `organization_can(organization_id, capability)`;
- `can_manage_venue(venue_id, user_id)`;
- `can_manage_event(event_id, user_id)`.

Exact signatures are finalized during migration discovery to avoid overloading
conflicts.

### Direct table access

- Public reads remain limited to current live/active visibility rules.
- Admins retain audited management access.
- Active members read their organization's non-public listings.
- Partners write ordinary content fields only when membership, organization
  status, role, and capability permit it.
- Organization IDs, `created_by`, `source`, verification, tier, featured state,
  and ownership roles are protected columns.
- Claims are insert/select-own for claimants and reviewable by admins.
- Membership grants, ownership transfer, and claim approval occur through
  guarded RPCs, not direct client updates.

## State Transitions

### Organization

```text
unclaimed → pending → active → suspended → active
     └──────────────────────────────→ archived
```

Admins control transitions to `active`, `suspended`, and `archived`.

### Claim

```text
pending → approved
        → rejected
        → cancelled
        → disputed → approved/rejected
```

A decision is immutable except through a new audited review action. A rejected
claim does not grant membership.

### Membership

```text
invited → active → suspended → active
                 → revoked
```

Revocation removes access immediately but preserves authorship and audit rows.

## Migration and Compatibility Strategy

### Additive foundation

1. Add new tables and nullable organization/provenance columns.
2. Add read-only helpers and indexes without changing existing policies.
3. Create the stable D8Advisr organization.
4. Extend shared TypeScript types.

### Backfill

For each existing live partner application:

1. create one organization using the application name/type;
2. add its user as primary owner;
3. attach rows whose `partner_id` matches the application user;
4. retain `partner_id` for compatibility;
5. report owned rows whose user has no matching live application.

The current production orphan is not auto-assigned. It enters an exception
report for explicit admin resolution.

Unowned venues/events remain valid. Where enough data exists, later admin tools
may group them into unclaimed organizations; this is not guessed during the
first backfill.

### Dual-read period

- Writes populate both organization ownership and legacy `partner_id` only for
  migrated organizations where this is unambiguous.
- Authorization compares legacy and organization-derived access sets.
- Any mismatch blocks legacy removal and produces a reconciliation report.
- Clients switch to organization reads only after the database contract is
  proven.

### Cutover

Update every impacted policy, function, trigger, notification, query, mapper,
and TypeScript type. Remove legacy ownership only in a later forward migration.

Applied historical migrations are never edited.

## Acceptance Scenarios for Database Tests

These scenarios must become executable SQL/pgTAP tests alongside the migration.

### ORG-01: admin creates unclaimed venue

Given an authenticated admin, when an unclaimed venue and organization are
created, then no fake auth user exists, `created_by` is the admin, source is
`d8_admin`, and public visibility follows listing status.

### ORG-02: consumer cannot self-assign ownership

Given an authenticated consumer, direct updates to organization IDs,
memberships, verification, or claim decision fields fail.

### ORG-03: consumer submits one claim

Given an unclaimed organization, a consumer may create and read their pending
claim, but a duplicate active claim for the same organization fails.

### ORG-04: admin approves claim atomically

Approving a valid pending claim creates active membership, updates organization
state, records reviewer/audit data, and leaves all venue/event IDs and
`created_by` unchanged.

### ORG-05: rejected claim grants no access

After rejection, the claimant cannot read drafts, edit, or publish organization
content.

### ORG-06: active manager edits within capability

An active manager of an active venue-operator organization may edit allowed
venue content but cannot create events, change protected ownership fields, or
manage members.

### ORG-07: organizer and venue permissions remain separate

An event organizer may edit its event but cannot edit the linked venue. A venue
operator may approve venue-page placement but cannot edit the organizer's event.

### ORG-08: D8 official event attribution

An admin-created event assigned to the D8 platform organization is displayed as
D8-organized and retains the admin creator in audit data.

### ORG-09: D8-curated third-party event attribution

An admin-created third-party event with no active organizer is not displayed as
D8-organized even though its source is `d8_admin`.

### ORG-10: membership revocation

Revoking a membership immediately removes draft visibility and writes while
preserving prior content and audit authorship.

### ORG-11: multiple organizations

One user with memberships in two organizations can access both and cannot
cross-write organization IDs or content.

### ORG-12: non-member isolation

An active partner cannot read drafts or mutate listings belonging to another
active organization.

### ORG-13: primary ownership transfer

Only the primary owner or admin may transfer primary ownership; exactly one
active primary owner remains, and listing IDs are unchanged.

### ORG-14: legacy reconciliation

Before legacy removal, organization-derived access equals legacy access for all
reviewed migrated rows. Known orphan exceptions are explicit and never silently
assigned.

### ORG-15: anonymous visibility

Anonymous users read only live events and active/live venues regardless of
claim, membership, or source state.

## Consequences

### Benefits

- admins can create useful content without fake users;
- claims and handovers do not migrate listing rows;
- multiple managers and multiple businesses per user are supported;
- D8 authorship is distinguishable from business representation;
- RLS models the domain instead of relying on client routing;
- orphan detection and transfer become explicit workflows.

### Costs

- partner UI needs organization context and eventually a selector;
- current user-level partner application logic must be migrated;
- analytics and notifications require organization-aware recipients;
- claim verification and disputes create an operational support process;
- compatibility temporarily increases schema and policy complexity.

## Alternatives Rejected

### Create seeded/fake partner users for admin-created listings

Rejected because credentials, identity ownership, email changes, and later
handover create security and orphaning problems.

### Keep `partner_id` and replace it during claims

Rejected because it conflates authorship with ownership, supports only one
manager, and makes transfer appear to rewrite history.

### Give ownership directly to an email address

Rejected because email is mutable, may be shared, and is not a durable access
or authorization model.

### Treat every admin-created listing as D8-owned

Rejected because D8 may curate an event without being its organizer or owning
the venue. This would misrepresent attribution.

### Implement cross-subdomain SSO first

Rejected as a prerequisite. Session convenience does not solve listing identity
or authorization and can be evaluated independently later.

## Phase 2 Handoff

Before any schema migration, Phase 2 should extract the current admin and
partner data layers without behavior changes. That refactor must use this ADR's
terminology but must not simulate organization authorization in client code.

The first migration remains Phase 3 and requires fresh discovery plus explicit
approval before remote application.
