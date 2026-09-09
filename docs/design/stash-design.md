# Stash real-money product design

Status: product and architecture decision; implementation not started
Last reviewed: 2026-09-09

## Decision

Stash is a real-money product. Users deposit money through D8Advisr and D8
maintains the user-facing Stash balance and contribution history. It is not a
progress tracker and the application must never display an unverified payment
as available money.

Lenco by BroadPay is the first payment integration for the MVP. Direct Airtel
Money, MTN MoMo, Zamtel Money and ZedWallet integrations remain possible future
payment adapters, not launch dependencies.

This document defines the intended contract. The existing Stash UI and database
tables are prototypes and are not approved for processing real money.

## Product principles

- Creating a Stash is optional. Planning an outing or event must not require a
  deposit.
- Manual contribution is the launch default. A user explicitly chooses an
  amount and approves every payment with the payment provider.
- Weekly and monthly choices are contribution schedules and reminders, not
  permission to debit an account.
- An event date and goal may produce a recommended contribution amount and an
  estimated completion date. They do not trigger a debit.
- The user may change, pause or remove a contribution schedule without changing
  money already held.
- Automatic debit is a separate future capability requiring an explicit,
  revocable provider mandate. A reminder schedule must never silently become a
  debit mandate.
- Product copy must distinguish `Goal`, `Available`, `Pending`, `Withdrawn` and
  `Failed`. It must not describe pending funds as saved or available.
- D8Advisr should collect only the operational data needed to move, reconcile
  and support money. Broader behavioural analytics are deferred until the MVP
  stabilises.

## Launch contribution journey

1. The user creates a personal or event-linked Stash with a name, currency and
   optional goal and target date.
2. D8 may recommend a weekly or monthly contribution based on the remaining
   goal and target date. The user can accept it, enter a custom amount, or use
   no schedule.
3. The user taps **Add money**, enters or selects an amount, reviews fees and
   selects an available Lenco channel.
4. The D8 server creates a unique pending payment attempt and provider
   reference. The browser opens the Lenco checkout using only the public key.
5. A browser success callback is treated as advisory. The server verifies the
   amount, currency, reference and final status with Lenco.
6. A signed webhook and the reconciliation worker can advance the payment
   state. Processing is idempotent; repeated callbacks cannot credit twice.
7. The ledger is credited only at the settlement state agreed with Lenco and
   BroadPay. Until then the UI shows the contribution as pending.
8. The user receives a durable receipt and sees the resulting ledger entry.

## Scheduling and event dates

Manual contribution is selected by default. The optional schedule supports:

- weekly reminders;
- monthly reminders;
- a custom contribution amount;
- a recommended amount calculated from `remaining goal / remaining periods`;
- an estimated completion date; and
- a warning when the selected contribution will not reach the goal by the
  linked event date.

Recommendations are guidance, not a promise and not a debit instruction. If an
event is rescheduled or cancelled, D8 must not move, refund or withdraw money
without a separate, explicit product rule and user-visible action.

## Financial system contract

### Source of truth

The financial source of truth must be an append-only, balanced ledger. A mutable
`saved` column must not be the only evidence of a user's money. Displayed
balances are derived from ledger postings or from a rebuildable, transactionally
maintained balance projection.

All monetary amounts are stored as integers in the currency's minor unit with an
explicit ISO currency code. Lenco currently accepts major-unit decimal amounts;
conversion happens only at the provider-adapter boundary.

At minimum, the future model must distinguish:

- Stash and its owner;
- contribution schedule, which contains no payment authority;
- provider-neutral payment intent;
- provider attempt and provider references;
- immutable journal transaction and balanced postings;
- webhook receipt/deduplication record;
- settlement and reconciliation status;
- withdrawal, refund and reversal; and
- operational adjustment with an actor, reason and audit record.

Provider payloads may be retained only when required for reconciliation or
support. Tokens and secrets must never be stored in browser-accessible tables or
logs.

### Required invariants

- A provider reference and webhook/event identifier are unique within a
  provider account.
- A successful attempt can produce at most one ledger credit.
- Amount and currency must match the server-created intent before posting.
- No client request can declare a payment successful, settled, refunded or
  withdrawn.
- Ledger entries cannot be edited or deleted. Corrections use reversing entries.
- A Stash cannot cross currencies. A new Stash is required for another currency.
- Withdrawals and refunds cannot exceed the user's withdrawable balance.
- Network timeouts produce an unknown or pending state, never an assumed
  success or failure.

### Security boundary

- Provider secrets live only in server-side secret storage.
- Payment creation, verification, webhook ingestion, reconciliation, refunds and
  payouts execute through trusted server functions.
- Webhook signatures are verified against the raw request body before any state
  change.
- The client may read only the user's own Stashes, schedules, receipts and
  permitted ledger projection.
- Users must not receive direct `insert`, `update` or `delete` grants on ledger,
  provider-attempt, webhook, settlement or balance-projection records.
- Service-role operations use narrowly scoped functions and retain an immutable
  actor/reason trail.

## Existing prototype is not a real-money foundation

The current schema permits an authenticated user to insert their own
`stash_transactions` row. It also permits owners to update `stash_funds`, whose
`saved` value acts as a mutable balance and whose `auto_save` value implies a
debit capability that does not exist. The tables also describe amounts as USD
cents despite the application's market currencies.

Before accepting money, a migration must replace or isolate this prototype. The
consumer must lose all direct financial writes, and demo rows must never be
promoted into authoritative financial records.

## Lenco MVP adapter

The public Lenco documentation confirms a checkout widget supporting card and
mobile-money collections, unique merchant references, server-side status
verification, signed webhooks and collection settlement status. The browser
callback is not authoritative. Lenco also recommends polling because webhook
delivery alone is not sufficient.

No public recurring-debit or customer-mandate API was found during the
2026-09-09 review. Consequently:

- launch contributions are one-time, user-approved collections;
- `weekly` and `monthly` mean reminder cadence only;
- the product must not use the label **Auto-save** at launch;
- a reconciliation worker polls unresolved attempts; and
- automatic debit remains blocked until Lenco/BroadPay supplies an approved
  mandate contract and technical documentation.

Official references:

- [Lenco: Accept Payments](https://lenco-api.readme.io/v2.0/reference/accept-payments)
- [Lenco: Webhooks](https://lenco-api.readme.io/v2.0/reference/webhooks)
- [BroadPay Zambia](https://broadpay.co.zm/)

## Direct mobile-money API research

Research date: 2026-09-09. Public documentation proves technical availability;
it does not prove that D8's stored-balance use case will be commercially or
regulatorily approved.

| Rail | Publicly confirmed | Production-access position | D8 decision |
| --- | --- | --- | --- |
| Airtel Money Zambia | Airtel has a Zambia developer portal. A business signs up, selects a product, registers an application and can test before going live. Airtel describes collection and disbursement APIs. | The portal says production access follows API compliance, legal compliance, onboarding and approval. Exact Zambia documents, fees, settlement and Stash eligibility are not public. | Technically viable future adapter. Open a commercial enquiry only after the Lenco MVP produces enough volume or reliability evidence. |
| MTN MoMo Zambia | Public sandbox and API documentation cover Request to Pay, status queries, callbacks, collections and disbursements. Zambia collections use an MTN-created collections account. | A product subscription and production onboarding are required. Zambia's published collection terms state fees are negotiated in a 1%-4% range and transactions remain subject to Bank of Zambia limits. Published disbursement terms describe a separate, pre-funded account. | Technically the clearest direct alternative. Do not implement until MTN confirms that D8's balance, refund and withdrawal model is permitted. |
| Zamtel Money | Zamtel publicly offers Zamtel Money, merchant/agent services and enterprise contact channels. Its historical procurement material requires open integration APIs. | No current official, public self-service payments API specification, sandbox, production checklist or merchant API pricing was found. Agent requirements must not be assumed to be API-merchant requirements. | Treat as commercial-contact-only. Request merchant collections, payout, webhook, reconciliation and sandbox documentation from Zamtel Business. |
| ZedWallet / ZedMobile | ZedWallet publicly supports customer wallets and merchant accounts. Merchant terms describe a merchant application, allocated business number and possible portal access. | No official public developer portal or payment API specification was found. Merchant onboarding, collections, payouts, settlement, webhooks and API credentials require confirmation from ZedWallet/Beeline Fintech. | Treat as commercial-contact-only and an emerging rail. Do not estimate delivery from the public consumer service alone. |

Official references:

- [Airtel Zambia Developer Portal](https://developers.airtel.co.zm/home)
- [Airtel Africa developer-portal announcement](https://www.airtel.africa/assets/pdf/press-release/Airtel-Africa-Developer-Portal_ENGLISH.pdf)
- [MTN MoMo API Portal](https://momoapi.mtn.com/)
- [MTN Zambia Collections product details](https://momoapi.mtn.com/Zambia_Collection_productDetails)
- [MTN Zambia Disbursement product details](https://momoapi.mtn.com/Zambia_Disbursement_productDetails)
- [Zamtel Business](https://zamtel.zm/business)
- [ZedWallet](https://zedwallet.zedmobile.co.zm/)
- [ZedWallet merchant terms](https://zedwallet.zedmobile.co.zm/merchant_terms/)

## Why Lenco precedes direct integrations

A direct operator connection is not merely another checkout button. Each rail
adds commercial onboarding, secrets and network restrictions, payment-state
mapping, callback behaviour, reconciliation, settlement accounts, refunds,
payouts, support escalation and separate failure modes. Four direct integrations
would multiply operational risk before D8 has payment-volume evidence.

Lenco gives the MVP one provider contract and one adapter while still exposing
mobile money. D8's internal payment and ledger model must nevertheless remain
provider-neutral so a direct rail can be added without migrating user balances.

Direct integration should be reconsidered when measured Lenco fees, outage
frequency, settlement delays, rejected payments, missing network coverage or
support constraints justify the additional operational burden.

## Commercial and regulatory gate

BroadPay states that it is licensed by the Bank of Zambia and that customer
funds are warehoused with a licensed commercial bank. This does not by itself
establish that D8 may market a savings product, maintain pooled customer
sub-ledgers or initiate user withdrawals under BroadPay's licence and contract.

Before production money is accepted, D8 needs written answers covering:

- whether the proposed Stash stored-balance/sub-ledger model is supported;
- legal roles of D8, BroadPay/Lenco, the safeguarding bank and the user;
- whether **Stash**, **save** and **balance** are approved product terms;
- required customer KYC and AML screening, account tiers and transaction limits;
- settlement timing and the exact point at which funds become withdrawable;
- withdrawals to mobile-money wallets and bank accounts;
- refunds, reversals, card chargebacks and negative-balance responsibility;
- cancelled events and unused balances;
- collection, payout and refund fees and who may bear them;
- reconciliation reports, webhook setup, incident support and service levels;
- privacy, retention and data-processing responsibilities; and
- dormant balances, account closure and customer dispute handling.

The Bank of Zambia regulates and licenses payment service providers and defines
e-money as a redeemable store of value issued on receipt of funds. Product and
legal review is therefore a launch gate, not a later cleanup.

Regulatory references:

- [Bank of Zambia: Overview of Payment Systems](https://www.boz.zm/payment-systems/overview-of-payment-systems-in-zambia)
- [Bank of Zambia: Electronic Money Issuance Directives, 2023](https://www.boz.zm/Directive202307ElectronicMoneyIssuance2023.pdf)

## Incremental delivery plan

### Gate 0: provider and product approval

- Obtain written confirmation for the Stash model and terminology.
- Confirm sandbox and production credentials, fees, limits, settlement,
  withdrawals, reconciliation and support contacts.
- Decide the launch rules for withdrawals, refunds, event cancellation and
  account closure.
- Complete legal/privacy review before collecting production money.

### Slice 1: financial foundation

- Introduce the provider-neutral intent, attempt, ledger, posting, webhook and
  reconciliation contracts.
- Remove consumer write access to all authoritative financial records.
- Isolate prototype Stash data and replace misleading `auto_save` terminology.
- Add invariant, RLS and migration tests before UI integration.

### Slice 2: Lenco sandbox manual contribution

- Implement server-side intent creation and provider verification.
- Integrate the sandbox checkout for one-time mobile-money/card deposits.
- Verify signed webhooks, deduplicate delivery and poll unresolved attempts.
- Expose pending, available and failed states plus receipts.
- Run automated provider-contract tests and controlled sandbox browser journeys.

### Slice 3: production operations

- Add reconciliation views, alerts and runbooks.
- Implement the contractually approved withdrawal/refund path.
- Test interrupted payments, delayed callbacks, duplicate webhooks, mismatched
  amounts, reversals and support recovery.
- Release behind a narrow allowlist and transaction limits.

### Later, evidence-driven work

- Direct operator adapters when actual cost or reliability data justifies them.
- Group Stashes only after ownership, contribution and withdrawal disputes are
  designed.
- Automatic debit only after a provider mandate, explicit consent, revocation,
  retries and missed-payment behaviour are contractually confirmed.
- Additional analytics only when a defined product or operational decision needs
  the data.

## Minimum operational data

Collect from day one only what is needed for correctness and support:

- internal intent, attempt, journal and posting identifiers;
- provider, merchant reference and provider transaction reference;
- user, Stash, amount, currency and fee allocation;
- payment method/network without prohibited credential data;
- provider and settlement status with timestamps;
- webhook receipt hash/event identifier and processing result;
- reconciliation result and last checked time;
- refund, withdrawal, reversal or adjustment relationship; and
- actor and reason for privileged actions.

Do not add speculative engagement counters to the ledger. Product analytics can
consume separate, versioned events later and must never be the financial source
of truth.
