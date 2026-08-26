# Reviewed event imports

This directory is a review boundary, not a scrape dump. A record may enter a
manifest only when its date, market, location, commercial state, category and
stable event-specific source have been checked. Missing facts are not inferred.

`lusaka-launch-v1.json` currently contains two taxonomy-compatible records:

- Feier & Ice, verified against its [TicketHost event page](https://tickethost.co.zm/events/feier-ice);
- AFRO SUNSETS: SUMMER 26 FESTIVAL, verified against its [TicketHost event page](https://tickethost.co.zm/events/afro-sunsetssummer-26-festival).

The manifest records the ticket price visible at the review timestamp and does
not include TicketHost's booking fee in `price_pp`. Price, action availability
and event status must be checked again immediately before publication.

The hold list is intentional. Verified conferences and trade exhibitions remain
held while the product taxonomy cannot represent them honestly; conflicting or
aggregate-only research remains held until an event-specific source resolves it.

## Validation and import

The default command validates the manifest and performs no writes:

```powershell
Set-Location H:\d8Advisr_
pnpm run events:import:reviewed
```

Applying is an explicit main-project admin operation. It creates only drafts,
uses stable request keys, refuses to overwrite evidence outside the manifest,
marks each event as an import, and verifies the saved child-row counts. Use a
temporary shell variable for the admin password; do not save it in an env file:

```powershell
Set-Location H:\d8Advisr_
$env:D8_ADMIN_EMAIL = "your-admin-email@example.com"
$adminSecret = Read-Host "Admin password" -AsSecureString
$adminCredential = [System.Management.Automation.PSCredential]::new($env:D8_ADMIN_EMAIL, $adminSecret)
$env:D8_ADMIN_PASSWORD = $adminCredential.GetNetworkCredential().Password
pnpm run events:import:reviewed -- --apply --confirm-main
Remove-Item Env:D8_ADMIN_PASSWORD
Remove-Item Env:D8_ADMIN_EMAIL
Remove-Variable adminSecret, adminCredential
```

Do not run `--apply` merely to test the script. The dry run and Phase 4.8A
checks cover the local contract without creating main-project rows.
