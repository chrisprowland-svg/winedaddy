# WineDaddy visual audit — post-1,000 corpus

Audit date: 19 September 2026
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
| VIS-059 | Pinot Noir at a glance | What is Pinot Noir? | Semantic profile |
| VIS-060 | Chardonnay at a glance | What is Chardonnay? | Semantic profile |
| VIS-061 | Shiraz at a glance | What is Shiraz? | Semantic profile |
| VIS-062 | Sauvignon Blanc at a glance | What is Sauvignon Blanc? | Semantic profile |
| VIS-063 | Riesling at a glance | What is Riesling? | Semantic profile |
| VIS-064 | A simple wine-tasting sequence | How to taste wine | Semantic process |
| VIS-065 | The building blocks of wine structure | Wine structure | Semantic comparison |
| VIS-066 | Wine serving temperatures | Wine serving temperature explained | Semantic reference |
| VIS-067 | Decanting decision | When should wine be decanted? | Semantic decision aid |
| VIS-068 | Protecting wine in storage | How to cellar wine | Semantic checklist |

After this branch, the preview corpus contains 239 placements across 209 pages using 63 concepts. Wine structure already contained an earlier governed visual, so the ten new placements add nine newly visualised pages.

## Batch 2 — protected-preview proposal

| ID | Concept | Canary page | Format |
|---|---|---|---|
| VIS-069 | Merlot at a glance | What is Merlot? | Semantic profile |
| VIS-070 | Grenache at a glance | What is Grenache? | Semantic profile |
| VIS-071 | Nebbiolo at a glance | What is Nebbiolo? | Semantic profile |
| VIS-072 | Sangiovese at a glance | What is Sangiovese? | Semantic profile |
| VIS-073 | Tempranillo at a glance | What is Tempranillo? | Semantic profile |
| VIS-074 | Sparkling-wine production methods | What is sparkling wine? | Semantic comparison |
| VIS-075 | Sweetness reference | What is sweetness in wine? | Semantic reference |
| VIS-076 | Wine-fault triage | How to tell if wine is still drinkable | Semantic decision aid |
| VIS-077 | Screw cap versus cork | Screw cap vs cork | Semantic comparison |
| VIS-078 | Bottle-ageing timeline | Bottle ageing | Semantic timeline |
| VIS-079 | Food-pairing intensity | How wine pairing works | Semantic framework |
| VIS-080 | Red versus white winemaking | Red wine vs white wine | Semantic process comparison |

Batch 2 also reuses VIS-021 on the fermentation foundation guide, VIS-023 on secondary aromas, VIS-022 on skin-contact white wine and VIS-012 on glass-cleaning guidance. The corpus contains 255 placements across 219 pages using 75 concepts.

## Final batch — protected-preview proposal

| ID | Concept | Canary page | Format |
|---|---|---|---|
| VIS-081 | Cabernet Franc at a glance | Cabernet Franc | Semantic profile |
| VIS-082 | Malbec at a glance | Malbec | Semantic profile |
| VIS-083 | Pinot Gris and Pinot Grigio at a glance | What is Pinot Gris / Pinot Grigio? | Semantic profile |
| VIS-084 | Chenin Blanc at a glance | Chenin Blanc | Semantic profile |
| VIS-085 | Muscat and Moscato at a glance | Moscato / Muscat | Semantic profile |
| VIS-086 | Viognier at a glance | Viognier | Semantic profile |
| VIS-087 | Gamay at a glance | Gamay | Semantic profile |
| VIS-088 | Zinfandel and Primitivo at a glance | Zinfandel / Primitivo | Semantic profile |
| VIS-089 | How acidity feels | What is acidity in wine? | Semantic sensory guide |
| VIS-090 | How tannin feels | What are tannins? | Semantic sensory guide |
| VIS-091 | Four choices that shape oak influence | What does oak do to wine? | Semantic framework |
| VIS-092 | Three common paths to rosé | What is rosé? | Semantic process comparison |
| VIS-093 | Champagne sweetness terms | Champagne sweetness levels | Semantic reference |
| VIS-094 | ABV, serving size and standard drinks | Alcohol in wine | Semantic reference |
| VIS-095 | Light, medium and full body | What is wine body? | Semantic sensory guide |

The final batch deliberately reuses VIS-089 through VIS-095 once each on closely related cornerstone pages. The protected-preview corpus therefore contains 277 placements across 234 pages using 90 site concepts.

The WDOS registry already reserves VIS-054 through VIS-058 for five earlier proposed assets. Site IDs introduced after the baseline are therefore reconciled as VIS-059 through VIS-095; no live visual is discarded or overwritten. With the five reserved registry records, the governed inventory reaches 95 concepts and remains below the 100-asset ceiling.

Every placement received contextual review. Batch insertion was not based on keyword matching alone.

## Release gate

- Build and QA must pass.
- Desktop and mobile preview must be reviewed.
- No placeholder, unsupported map or production-only note may appear publicly.
- PROD requires Chris's explicit approval.
