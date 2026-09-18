# WineDaddy visual audit — post-1,000 corpus

Audit date: 18 September 2026  
Scope: 1,002 article sources and the governed `VIS-###` component system

## Baseline

- 1,002 article sources.
- 200 pages contained at least one governed visual.
- 802 pages contained no governed visual.
- 229 total placements used 53 registered visual concepts.
- The 300-article and final 248-article expansions did not add new governed visual concepts.

Absence of a visual is not automatically a defect. The gap is inconsistent coverage of cornerstone learning pages and newer pages that were never assessed against the registry.

## Decision

Resume Visual Learning as a reusable teaching-component programme. Do not add decorative stock photography or create an image for every article.

Production order remains:

1. reuse a suitable governed component;
2. adapt an existing family;
3. create a new semantic HTML/CSS component;
4. use verified SVG for maps or complex technical relationships;
5. use photography only when the photograph itself teaches something the component cannot.

The active-asset ceiling remains 100. This is a governance alarm, not a target.

## Batch 1 — protected-preview proposal

| ID | Concept | Canary page | Format |
|---|---|---|---|
| VIS-054 | Pinot Noir at a glance | What is Pinot Noir? | Semantic profile |
| VIS-055 | Chardonnay at a glance | What is Chardonnay? | Semantic profile |
| VIS-056 | Shiraz at a glance | What is Shiraz? | Semantic profile |
| VIS-057 | Sauvignon Blanc at a glance | What is Sauvignon Blanc? | Semantic profile |
| VIS-058 | Riesling at a glance | What is Riesling? | Semantic profile |
| VIS-059 | A simple wine-tasting sequence | How to taste wine | Semantic process |
| VIS-060 | The building blocks of wine structure | Wine structure | Semantic comparison |
| VIS-061 | Wine serving temperatures | Wine serving temperature explained | Semantic reference |
| VIS-062 | Decanting decision | When should wine be decanted? | Semantic decision aid |
| VIS-063 | Protecting wine in storage | How to cellar wine | Semantic checklist |

After this branch, the preview corpus contains 239 placements across 209 pages using 63 concepts. Wine structure already contained an earlier governed visual, so the ten new placements add nine newly visualised pages.

## Ranked queue after Batch 1

The next audit pass should rank reuse and new concepts by learning value, reuse potential, cornerstone-page importance and source certainty. Current priority themes are:

1. reuse VIS-021 on the fermentation foundation pages;
2. reuse VIS-023 across aroma foundation pages;
3. reuse VIS-012 on glassware and serving pages;
4. reuse VIS-022 on red-wine colour and skin-contact pages;
5. build a Merlot profile;
6. build a Grenache profile;
7. build a Nebbiolo profile;
8. build a Sangiovese profile;
9. build a Tempranillo profile;
10. build a sparkling-wine style comparison;
11. build a sweetness-level reference;
12. build a wine-fault triage guide;
13. build a closure comparison;
14. build a bottle-ageing timeline;
15. build a food-pairing intensity framework.

Every proposed placement remains subject to contextual review. Batch insertion must not be based on keyword matching alone.

## Release gate

- Build and QA must pass.
- Desktop and mobile preview must be reviewed.
- No placeholder, unsupported map or production-only note may appear publicly.
- PROD requires Chris's explicit approval.
