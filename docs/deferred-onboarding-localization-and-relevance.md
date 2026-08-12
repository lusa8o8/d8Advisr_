# Deferred: Onboarding Localization and Relevance Foundation

Status: observed during Phase 4 local browser testing; intentionally deferred

Observed: 2026-08-12

## Observation and confirmed cause

Onboarding asks for vibes and budget before region. Step 2 therefore uses the
hard-coded Lagos/NGN fallback from useRegion. A user who later chooses Lusaka
sees the wrong currency while setting a budget.

The review also confirmed:

- profiles.budget_pref is a bare number without capture region/currency;
- Step 1 plan types exist only in component state and are discarded at finish;
- only city, budget_pref, and vibe_prefs are currently persisted;
- there is no explicit versioned relevance score using all onboarding signals.

This is intentionally deferred beyond Phase 4 browser acceptance.

## Recommended dependency order

1. Select home/discovery region.
2. Resolve currency, IANA timezone, locale hints, and supported content area.
3. Select plan intent and vibes.
4. Set budget with region-specific ranges, presets, copy, and currency.
5. Persist the complete preference set atomically.

Browser locale may format values, but selected region must govern inventory,
currency, and event-time display. Event instants remain timestamptz and render
in the selected region timezone.

## Preference contract to design

Budget should store local amount plus capture region/currency, with a documented
normalization strategy for cross-region ranking. A bare 150 cannot represent
equal purchasing power in Lagos and Lusaka, and a city change must explicitly
convert or reset the budget.

Plan intent needs a persisted constrained field before it can affect results.

## Relevance model boundary

Apply eligibility gates before ranking:

- live and visible content only;
- selected region or allowed radius;
- event has not ended in the governing timezone;
- capacity, availability, and safety rules permit recommendation.

Then use a versioned, inspectable score combining plan intent, vibes, budget,
distance, local time, quality, freshness, diversity, and learned feedback from
saves, plans, attendance, and reviews.

Popularity must not dominate. Preserve component scores for debugging and
evaluation, and diversify final results.

## Later implementation sequence

1. Freshly audit onboarding, profile schema, regions, discovery, plan
   generation, demand signals, and review feedback.
2. Write an ADR for region, currency, timezone, budget, and intent persistence.
3. Add an additive migration and compatibility reads.
4. Reorder onboarding and localize budget controls.
5. Add a deterministic relevance service with versioned weights.
6. Build Lagos/Lusaka fixtures covering currencies, time boundaries, budget,
   intent, vibes, distance, and event expiry.
7. Evaluate ranking quality offline before learning from live behavior.

## Acceptance criteria

- No currency appears before its region is known.
- Lagos renders NGN/Lagos time; Lusaka renders ZMW/K/Lusaka time.
- Region changes explicitly convert or reset budget.
- Plan intent, vibes, budget, and region persist and reload.
- Private, ineligible, or expired content cannot rank.
- Fixtures prove each signal changes ordering in the expected direction.
- Results are reproducible for a scoring version and input set.
