# Partner Venue Parity Browser Checklist

Use the local partner staging server and the staging partner venue account.

Browser evidence recorded 2026-08-12:

- The staging partner changed the live venue to **D8 Cinema**, selected the
  Cinema category, updated its description, address and reviewed area, selected
  the Budget price level, entered an average cost of 100, and uploaded six
  1080x1350 photos.
- The low-risk description update applied immediately. The controlled fields
  and all six photos remained private in one pending partner revision.
- Admin displayed the current and proposed values, including all six photo
  previews and a named Budget price level. Approval succeeded.
- The approved venue and photo gallery appeared in the consumer feed. Stable
  venue identity was preserved throughout the revision.

- [x] Venue type is a dropdown populated from the shared venue catalog.
- [x] Area is a dropdown of reviewed areas.
- [x] Account region shows the approved partner region and its reviewed areas
  load even when the stored application uses a display name such as Lusaka.
- [ ] Choosing "Area not listed" reveals a manual area input.
- [x] Street address remains a normal factual text input.
- [x] Price level offers only Not set and levels 1 through 4.
- [ ] Average cost is numeric and shows the account region's currency symbol.
- [ ] Vibes render as shared selectable chips and retain multiple selections.
- [ ] Phone uses a telephone input and website rejects a non-HTTP(S) URL.
- [ ] Switch browser tabs and return; the current form remains mounted.
- [ ] Reload; category, area mode/value, price, cost, vibes, contact, hours, and
  existing image URLs recover.
- [x] Save changes to a live venue and confirm the dashboard reports a pending
  revision.
- [x] In Admin venue detail, confirm the pending partner review panel appears
  above the live listing tabs without requiring the venue to be D8-owned.
- [x] Confirm all proposed images render as previews in the review panel.
- [x] Confirm price levels use Budget/Moderate/Premium/Luxury labels rather
  than raw dollar signs in venue detail, proposals, and change history.
- [x] Before admin approval, confirm controlled changes are absent from
  the consumer venue while description/hours changes apply immediately.
- [x] Approve the revision as admin and confirm the consumer venue receives the
  approved name, category, address, area, price, average cost, and media changes.
