# Phase 4.6C High-Level Browser Acceptance Test Suite

Date: 19 August 2026  
Status: Ready for staging execution  
Environment: Staging Supabase (`bntxnjfftikmaqnbskkq`) + Local Staging Clients

---

## Test Execution Setup

Run the two staging client servers:

```powershell
# Terminal 1 - Consumer & Admin Portal
Set-Location H:\d8Advisr_
pnpm run dev:consumer:staging

# Terminal 2 - Partner Portal
Set-Location H:\d8Advisr_
pnpm run dev:partner:staging
```

---

## High-Level Journey 1: Consumer Event Interest & Reminder Persistence

> **Objective:** Verify that consumers can toggle event reminders and add events to date plans, and that their interest state is durably persisted in PostgreSQL.

### Starting State
- Signed into **Consumer App** (`http://localhost:3000`) with an authenticated consumer account.
- An active live event exists in the catalog (e.g., "Lusaka Comic Con II" or "Jazz & Wine Night").

### High-Level Actions
1. Navigate to the event details page (`/event/:id`).
2. Scroll to the **Remind me** card and toggle the switch to **ON**.
3. Refresh the browser page or navigate to `/home` and return to the event.
4. Click **Add to Plan** at the bottom action bar.

### Granular Checks & Expected Outcomes
- [ ] **Instant UI State:** Switch turns pink/primary and icon shows active Bell.
- [ ] **Durable Persistence:** Upon page refresh, the switch remains **ON** (read directly from `public.event_interests`).
- [ ] **Plan Interest Recorded:** Clicking "Add to Plan" inserts/updates an `event_interests` row with `interest_type = 'plan'`.
- [ ] **Toggle Off:** Switching the toggle OFF updates `active = false` in `event_interests` and preserves user choice on reload.

---

## High-Level Journey 2: Sensitive Material Revision & Consumer Notification Dispatch

> **Objective:** Verify that when an admin approves a schedule shift or venue relocation for a live event, all consumers who follow that event receive a durable in-app change notification.

### Starting State
- Consumer A has toggled **Remind me** ON for Event X.
- Signed into **Partner Portal** (`http://localhost:3001`) in a separate browser/window.
- Signed into **Admin Portal** (`http://localhost:3000/admin?section=submissions`).

### High-Level Actions
1. In **Partner Event Editor**, open Event X.
2. Change the **start time** (e.g. shift by 2 hours) or **relocate venue**.
3. Click **Save changes** (queues as sensitive pending revision).
4. In **Admin Panel -> Submissions**, open the revision card and click **Approve revision**.
5. Switch back to Consumer A's window.

### Granular Checks & Expected Outcomes
- [ ] **Unread Notification Badge:** The Bell icon in the TopBar / Desktop sidebar displays a red badge count (`1`).
- [ ] **Notifications Feed:** Navigating to `/notifications` displays a new card:
  - **Schedule change:** *"Schedule update: [Event Title] — [Event Title] has updated its schedule or start time."* (Calendar icon).
  - **Location change:** *"Location update: [Event Title] — [Event Title] has moved to a new location or venue."* (Map pin icon).
  - Relative timestamp displayed (e.g. *"Just now"*).
  - Unread pink indicator dot present.
- [ ] **Action Link:** Clicking **View Event** on the notification card navigates directly to `/event/:id` showing the updated schedule/venue.
- [ ] **Mark Read:** Clicking **Mark read** (or clicking on the card) clears the pink unread dot and decrements the top bell badge count.

---

## High-Level Journey 3: Low-Risk Price Drop Auto-Dispatch

> **Objective:** Verify that when a partner reduces the price on a live paid event, the discount applies immediately and automatically generates price-drop notifications to interested consumers without waiting for admin review.

### Starting State
- Consumer A follows a paid live event (e.g. K150).
- Partner owns that live event in **Partner Portal**.

### High-Level Actions
1. In **Partner Event Editor**, lower the price (e.g. K150 -> K100).
2. Click **Save changes**.

### Granular Checks & Expected Outcomes
- [ ] **Instant Partner Success:** Partner sees `"Event saved"` immediately (auto-applied).
- [ ] **Consumer Notification:** Consumer A receives an in-app notification in `/notifications`:
  - **Title:** *"Price drop: [Event Title]"*
  - **Body:** *"[Event Title] has reduced its entry price."*
  - **Icon:** Green price tag icon.
- [ ] **Discovery Updated:** Consumer browsing the event or feed sees the discounted price (K100).

---

## High-Level Journey 4: Partner Free Price Usability (QoL)

> **Objective:** Verify that entering `0` or leaving the price empty without toggling "Free entry" is gracefully interpreted as Free Entry, removing creation friction.

### High-Level Actions
1. In **Partner Portal**, click **New event** (`/events/new`).
2. Fill required fields (Name, Category, Time, Location).
3. In the Price field, type `0` or leave it empty, and **leave the "Free entry" switch unchecked**.
4. Click **Review & Publish** (or Save draft).

### Granular Checks & Expected Outcomes
- [ ] **No Validation Error:** The form does NOT throw *"Price must be greater than zero"*.
- [ ] **Clean Free Event:** Event saves successfully with `is_free = true` and `price_pp = 0`.