# Partner and Admin Venue Form Parity

Status: discovery complete; implementation not started

Date: 2026-08-12

## Objective

Give admin and partner venue workflows one listing-data contract while retaining
their different permissions. Partners use the region assigned to their approved
account. Admins may select a region. Admin-only governance fields such as
attribution, publication status, tier, verification, and approval must not leak
into the partner editor.

## Discovery Findings

The shared reference foundation already exists, but the forms expose different
subsets of it.

| Listing fact | Admin | Partner | Required contract |
| --- | --- | --- | --- |
| Name | Text | Text | Text; real-world proper name |
| Region | Catalog select | Read-only account region | Stable region ID; never arbitrary text |
| Category | Shared catalog | Shared catalog | Stable category ID |
| Area | Catalog-assisted text fallback | Catalog-assisted text fallback | Reviewed area ID or explicit manual fallback |
| Address | Text | Text | Text until reliable address/geocoding support exists |
| Description | Text | Text | Text with shared length limits |
| Price level | Controlled 1-4 | Missing | Controlled ordinal 1-4 |
| Average cost/person | Numeric | Missing | Non-negative number; currency derived from region |
| Vibes | Shared catalog picker | Missing | Shared stable vibe IDs |
| Gallery | Validated upload | Validated upload | Same media limits and ordering |
| Opening hours | Missing | Structured controls | Shared structured day/time controls |
| Phone/WhatsApp | Missing | Text input | Validated contact field persisted on venue |
| Website | Missing | Text input | Normalized URL persisted on venue |

The partner phone and website inputs are currently deceptive: PartnerVenueInput
accepts them, but savePartnerVenue omits them, fetchOwnedVenue cannot load them,
and the venues table has no matching columns. Values entered in those controls
are discarded.

The partner event editor already reads the shared event category catalog. Its
unused hardcoded CATEGORIES constant should be removed during cleanup, but
event-form redesign is outside this venue-parity slice.

## Free Text Policy

Free text is correct for:

- venue name;
- factual description;
- street address while address-provider coverage is incomplete;
- a clearly marked manual area fallback;
- phone and website values, with semantic validation.

Free text is not acceptable for:

- region/city identity;
- category;
- price level;
- vibes;
- currency;
- opening-day identity.

Area must become a two-stage control: choose a reviewed area, or explicitly
choose "Area not listed" to reveal a manual fallback input. A datalist alone
does not clearly distinguish reviewed data from typed data.

## Recommended Contact Risk Policy

Treat venue phone and website changes as review-sensitive, not low-risk.
Changing either can redirect customers or introduce a phishing destination.
The existing partner copy calling these fields low-risk should be corrected.
Descriptions and opening hours can remain immediate low-risk changes.

## Ordered Implementation Plan

### 1. Shared contract and validation

- Define one typed venue-details draft shared by admin and partner clients.
- Add reusable price-level, vibe, area/fallback, hours, phone, and URL
  validation helpers.
- Use stable IDs in client state where catalogs provide them.
- Version the session draft envelope so obsolete partner drafts cannot hydrate
  the expanded shape.

Commit boundary: refactor(listings): define shared venue form contract

### 2. Additive venue contact migration

- Add nullable contact_phone and website_url venue columns with bounded
  lengths.
- Extend generated/local database types and venue select contracts.
- Extend partner live-revision payload validation, audit logs, approval, and
  conflict checks.
- Classify contact changes as high-risk pending admin approval.
- Preserve existing partner-application contact as an account contact; do not
  silently copy it into every venue.

Commit boundary: feat(db): persist reviewed venue contact details

### 3. Partner venue editor parity

- Add controlled price level, numeric average cost, and shared vibe picker.
- Replace the area datalist with reviewed-area selection plus explicit manual
  fallback.
- Persist stable category/area/vibe/price values and venue contact fields.
- Keep account region read-only and derive currency from it.
- Retain structured hours and the validated gallery flow.
- Update review-risk copy and inline validation.

Commit boundary: feat(partner): align venue editor with listing references

### 4. Admin venue workflow parity

- Add opening hours, contact phone, and website to admin creation, draft edit,
  and live revision forms.
- Reuse the same validation and reference controls as the partner editor.
- Keep admin-only attribution, publication, tier, verification, and approval
  controls separate.
- Ensure admin review surfaces previous and proposed contact values.

Commit boundary: feat(admin): complete shared venue detail controls

### 5. Verification

- Static tests assert both clients consume the same reference and validation
  contract.
- Migration tests cover contact payload validation and revision approval.
- Staging tests prove partner contact changes remain private until approval.
- Browser tests cover Lusaka/Lagos currency derivation, catalog/manual areas,
  price/vibe parity, hours, contact persistence, reload recovery, and consumer
  visibility after approval.
- Run role isolation, Phase 4.5, typecheck, and both staging builds.

Commit boundary: test(listings): verify admin partner venue parity

## Non-goals

- No PostGIS or external geocoder in this slice.
- No country input; country remains derived from region.
- No removal of the manual area fallback.
- No changes to claims or ownership handover.
- No production migration until staging and browser gates pass.
