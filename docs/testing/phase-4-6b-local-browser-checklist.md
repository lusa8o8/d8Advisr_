# Phase 4.6B High-Level Browser Acceptance Test Suite

Date: 19 August 2026  
Status: Ready for staging execution  
Environment: Staging Supabase (`bntxnjfftikmaqnbskkq`) + Local Staging Clients

---

## Test Execution Setup

Run the two staging client servers in separate terminals:

```powershell
# Terminal 1 - Consumer & Admin Portal
Set-Location H:\d8Advisr_
pnpm run dev:consumer:staging

# Terminal 2 - Partner Portal
Set-Location H:\d8Advisr_
pnpm run dev:partner:staging
```

---

## High-Level Journey 1: Low-Risk Edits (Instant Discovery Reflection)

> **Objective:** Verify that non-sensitive metadata updates immediately apply to public discovery without requiring admin intervention or stalling the partner, while preserving full audit history.

### Starting State
- Signed into **Partner Portal** (`http://localhost:5174`) as an approved partner with an active live event.
- Consumer discovery (`http://localhost:5173`) open in an incognito window showing the current live event details.

### High-Level Actions
1. Open the live event in **Partner Event Editor** (`/dashboard` -> Edit event).
2. Update **only low-risk fields**:
   - Change description text.
   - Toggle a couple of vibe tags.
   - Change event category.
   - Switch the emoji icon.
   - Add/reorder gallery images.
   - *(Optional)* Apply a price discount (e.g. K150 -> K120) or increase attendance capacity (e.g. 50 -> 80).
3. Click **Save changes**.

### Granular Checks & Expected Outcomes
- [ ] **Instant Feedback:** Partner sees `"Event saved"` and returns to dashboard without being routed to review.
- [ ] **No Pending Banner:** Reopening the event editor confirms no "Revision in review" alert is displayed.
- [ ] **Instant Public Discovery:** Refreshing the consumer discovery page (`http://localhost:5173`) immediately shows the new description, vibes, emoji, and discounted price/capacity.
- [ ] **Audit Trail:** Database table `event_revisions` records a single row with `status = 'applied'`, `risk_level = 'low'`, `enforcement_code = 'A'`.

---

## High-Level Journey 2: Sensitive Material Edits & Admin Approval Flow

> **Objective:** Verify that sensitive changes (dates, schedules, venues/locations, titles, capacity reductions) enter the review queue safely without disrupting the active public listing, and apply atomically once approved by an admin.

### Starting State
- Signed into **Partner Portal** (`http://localhost:5174`) with an active live event (e.g., "Friday Night Jazz" at 20:00).
- Signed into **Admin Portal** (`http://localhost:5173/admin?section=submissions`) in a separate browser profile.
- Consumer app viewing the live event.

### High-Level Actions
1. In the **Partner Event Editor**, modify **sensitive fields**:
   - Change event title to `"Friday All-Star Jazz Spectacular"`.
   - Shift start time by 2 hours (e.g. 20:00 -> 22:00).
   - Change venue/location or reduce capacity (e.g. 100 -> 50).
2. Click **Save changes**.

### Granular Checks & Expected Outcomes
- [ ] **Partner Submission Screen:** Shows `"Changes submitted for review"` with subtitle *"Sensitive changes were sent to D8 admins for review before taking public effect."*
- [ ] **Public Listing Unmodified:** Consumer discovery STILL displays the original title ("Friday Night Jazz") and original start time (20:00). No disruption to current discovery.
- [ ] **Partner Editor Banner:** Reopening the event in Partner Portal displays the amber banner: `"Sensitive revision in review: You previously submitted changes (title, starts_at, capacity) that require D8 admin review."`
- [ ] **Admin Submissions Queue:** 
  - Admin Submissions tab badge count increases.
  - An **Event Sensitive Revision Card** appears showing:
    - Event Title, City, and Category.
    - Clear field-level before/after diff: `title: "Friday Night Jazz" -> "Friday All-Star Jazz Spectacular"`, `starts_at: 20:00 -> 22:00`.
- [ ] **Admin Approval Action:**
  - Admin clicks **Approve revision** and enters an optional note.
  - Revision card disappears from Submissions queue.
  - Public consumer discovery updates immediately to the new title and time upon refresh.
  - Partner's editor banner clears on next visit.

---

## High-Level Journey 3: Policy Violations & Admin Rejection Flow

> **Objective:** Verify that hard commercial invariant violations (price increases, free-to-paid) are deterministically blocked at submission, and sensitive edits that are rejected by admins leave the live event intact with clear partner audit notes.

### Part A: Commercial Violation Rejection (Hard Rule)
1. In the **Partner Event Editor**, open a published Free event.
2. Attempt to uncheck "Free entry" and enter a paid price (e.g. K50).
3. Confirm UI blocks or submission immediately throws `published_free_event_cannot_become_paid`.
4. Open a published Paid event (e.g. K100) and attempt to raise the price to K150.
5. Confirm UI caps price at K100 and backend rejects higher price submissions (`published_event_price_cannot_increase`).

### Part B: Administrative Rejection with Feedback
1. Partner submits a sensitive change (e.g. relocating event from Lusaka to an unverified location).
2. Admin opens **Submissions** tab, inspects the revision card, and clicks **Reject**.
3. Admin enters reason in dialog: `"Location cannot be verified; please use an approved partner venue."`
4. Confirm:
   - Revision status transitions to `'rejected'` in `event_revisions`.
   - `listing_admin_audit_log` records the rejection with the admin note.
   - Public event remains live in its original approved state.
   - Partner editor clears pending lock so the partner can make fresh adjustments.

---

## High-Level Journey 4: Concurrency & Multi-Client Session Isolation

> **Objective:** Verify optimistic concurrency control when multiple tabs or admins interact with the same live event, preventing race conditions or dirty writes.

### Actions & Checks
- [ ] **Optimistic Concurrency:** If Partner tab A loads event, Partner tab B saves a revision, and Partner tab A attempts to save without refreshing, the system rejects with `"Event changed after it was loaded; refresh before saving"`.
- [ ] **Single Pending Revision Limit:** If an event already has a pending revision under review, attempting to submit a second sensitive revision is blocked until the active one is resolved.
- [ ] **Admin Live Edit Concurrency:** Admins editing admin-sourced live events in `AdminEventLiveEdit.tsx` adhere to the same commercial constraints (price increases locked) and update the live listing immediately with audit logging.

---

## Summary Status Signoff

| Journey | Description | Status |
|---|---|---|
| **Journey 1** | Low-Risk Edits (Instant auto-apply + discovery) | ⏳ Ready to execute |
| **Journey 2** | Sensitive Material Edits (Pending review + Approval) | ⏳ Ready to execute |
| **Journey 3** | Commercial Integrity Violations & Admin Rejection | ⏳ Ready to execute |
| **Journey 4** | Concurrency, Session Isolation & Audit Trails | ⏳ Ready to execute |