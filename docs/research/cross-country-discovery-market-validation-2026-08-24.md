# Cross-country discovery-market validation

Status: research complete; accepted into ADR 0002 and Phase 4.7 planning

Date: 24 August 2026

## Question

Can D8Advisr use one geography model across African countries without building
custom province/state/district/county/LGA logic for each country?

## Conclusion

Yes, if `regions` means product-defined **D8 discovery markets** rather than
government regions. Country is the hard operational boundary. Government
geography is optional generic metadata. Physical locality remains independent
from discovery-market membership.

## Zambia baseline

- Lusaka is both a city and a province name.
- Copperbelt Province contains multiple large, distinct urban markets,
  especially Kitwe and Ndola.
- Livingstone is a destination market, while Siavonga is a practical weekend
  destination from Lusaka.

Therefore Copperbelt must not be the default local feed for both Kitwe and
Ndola. It may later be a grouping or curated weekend collection.

Primary evidence:

- Zambia Tourism identifies Lusaka, Kitwe, Ndola, Livingstone, and Chipata as
  major cities and identifies Mfuwe and Siavonga as important destination
  centres: https://www.zambiatourism.com/towns/towns-cities/
- official tourism profiles support distinct Kitwe and Ndola supply:
  https://www.zambiatourism.com/towns/copperbelt/kitwe/ and
  https://www.zambiatourism.com/towns/copperbelt/ndola/
- Siavonga is described as a year-round weekend destination roughly 2.5 hours
  from Lusaka: https://www.zambiatourism.com/towns/siavonga/
- ZamStats reports large separate Kitwe and Ndola district populations:
  https://www.zamstats.gov.zm/wp-content/uploads/2023/12/2022-Census-of-Population-and-Housing-Preliminary.pdf

## Nigeria stress test

Nigeria has 36 states, the Federal Capital Territory, and 774 LGAs. Abuja's FCT
contains six area councils and is not an ordinary state. Lagos is used as a
state, city, and wider metropolitan identity.

A fixed `province -> city` product hierarchy would require Nigeria-specific
branches. The generic mapping does not:

```text
Nigeria
  administrative context: Lagos State
  D8 market: Lagos
  areas: Ikeja, Lekki, Victoria Island, Yaba, ...

Nigeria
  administrative context: Federal Capital Territory
  D8 market: Abuja
  areas: Wuse, Maitama, Garki, ...
```

Primary evidence:

- Nigeria National Bureau of Statistics administrative structure:
  https://www.nigerianstat.gov.ng/page/about-us
- FCT Administration's six area councils:
  https://www.fcta.gov.ng/faq/
- Nigerian Tourism Development Authority's national/domestic-tourism remit:
  https://ntda.gov.ng/

## South Africa stress test

South Africa has provinces plus metropolitan, district, and local
municipalities. Gauteng alone contains separate Johannesburg, Tshwane, and
Ekurhuleni metropolitan municipalities. Cape Town's practical visitor context
also reaches distinct Winelands towns beyond the city.

The generic mapping remains stable:

```text
South Africa
  administrative context: Gauteng
  D8 markets: Johannesburg, Pretoria/Tshwane, Ekurhuleni

South Africa
  administrative context: Western Cape
  D8 markets: Cape Town, Stellenbosch, Franschhoek
```

Primary evidence:

- South African Government lists 257 municipalities and eight metropolitan
  municipalities: https://www.gov.za/about-government/government-system/local-government
- Statistics South Africa's municipality codes distinguish Cape Town,
  Johannesburg, Ekurhuleni, and Tshwane:
  https://www.statssa.gov.za/?page_id=4542
- Cape Town Tourism treats Stellenbosch, Paarl, and Franschhoek as distinct
  Winelands destinations beyond the city:
  https://www.capetown.travel/areas/beyond-the-city/

## Country-neutral contract

1. A country is required and uses ISO 3166-1 alpha-2 codes.
2. A D8 market is the unit selected by consumers and used by feed queries.
3. Market identity is an opaque ID plus country-scoped slug; names never become
   identifiers.
4. Administrative context uses optional generic code/name/level metadata. No
   fixed `province`, `state`, `county`, or `LGA` columns are introduced.
5. Areas/neighbourhoods are reviewed and scoped to a D8 market.
6. A listing stores market membership separately from truthful physical
   locality/address and eventual coordinates.
7. A consumer selects the market they want to explore first, not a legally
   precise residence declaration.
8. Connections such as Lusaka-Siavonga, Kitwe-Ndola, or Cape
   Town-Stellenbosch are deferred market relationships, not merged feeds.

## Incremental boundary

Phase 4.7B adds only the country-aware market catalog, generic optional
administrative metadata, and inactive markets supported by current evidence.
It does not add routing, radii, PostGIS, a full administrative-area catalog, or
market connections. Phase 4.7C moves profile/listing contracts to canonical
market IDs and preserves physical locality independently.
