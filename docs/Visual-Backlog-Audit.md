# WineDaddy visual backlog audit

Audit date: 25 August 2026  
Scope: 47 live WDOS visual concepts, six proposed hierarchy-map additions and 452 published Learn pages

## Current position

- 47 active visual concepts are registered in WDOS.
- VIS-002 and VIS-009 were already implemented as semantic HTML/CSS on the website.
- The first batch implemented eight further reusable HTML/CSS components: VIS-003, VIS-005, VIS-006, VIS-008, VIS-013, VIS-014, VIS-021 and VIS-023.
- The second batch implements VIS-022, VIS-028, VIS-029, VIS-030, VIS-032, VIS-033, VIS-042 and VIS-044.
- The third batch implements all 12 remaining semantic concepts: VIS-001, VIS-010, VIS-011, VIS-012, VIS-016, VIS-026, VIS-027, VIS-035, VIS-036, VIS-037, VIS-039 and VIS-041.
- Map batch 1 implements eight Australian maps from Wine Australia GIS geometry: VIS-004, VIS-007, VIS-015, VIS-017, VIS-018, VIS-019, VIS-020 and VIS-025.
- The hierarchy extension adds six governed overview maps: VIS-048 Australia, VIS-049 Western Australia, VIS-050 South Australia, VIS-051 New South Wales, VIS-052 Queensland and VIS-053 ACT/Canberra District.
- The hierarchy now supports the learning path Australia → state or territory → regional GI.
- After this extension, 44 concepts have website implementations and nine authoritative international maps remain.
- The eight-component batch represents 98 registered article requests before deduplication.
- No raster image is required for these components. Their text remains indexable, selectable, responsive and accessible.

## Consolidated production backlog

### Semantic HTML/CSS — implemented in this batch

| ID | Concept | Registered requests | First governed placement |
|---|---|---:|---|
| VIS-003 | Why Cabernet varies | 12 | What is Cabernet Sauvignon? |
| VIS-005 | Elevation, terrain and site variation | 20 | Adelaide Hills wine region |
| VIS-006 | Regional tendencies vs label guarantees | 15 | Adelaide Hills wine region |
| VIS-008 | How oxidation develops | 15 | What is oxidation in wine? |
| VIS-013 | Wine and seafood pairing | 6 | Wine and seafood pairing |
| VIS-014 | Whole-bunch pathway comparison | 11 | Whole-bunch fermentation |
| VIS-021 | Alcoholic fermentation | 13 | Alcoholic fermentation |
| VIS-023 | Primary, secondary and tertiary aromas | 6 | What is wine aroma? |

The first placement is the design and factual canary. Reuse across other registered pages should follow after preview approval, using contextual placement rather than blind bulk insertion.

### Semantic HTML/CSS — implemented in batch 2

VIS-022, VIS-028, VIS-029, VIS-030, VIS-032, VIS-033, VIS-042 and VIS-044.

### Semantic HTML/CSS — implemented in batch 3

VIS-001, VIS-010, VIS-011, VIS-012, VIS-016, VIS-026, VIS-027, VIS-035, VIS-036, VIS-037, VIS-039 and VIS-041.

These collapse into shared component families: profile/spectrum, comparison, process flow, anatomy, relationship hierarchy and production pathway.

### Australian orientation maps — implemented in map batch 1

VIS-004, VIS-007, VIS-015, VIS-017, VIS-018, VIS-019, VIS-020 and VIS-025.

These are responsive SVG maps generated from Wine Australia Open Data Hub geometry, with textual-GI legal-definition disclosures and distinct city/local reference markers.

### Australian hierarchy maps — implemented in the hierarchy extension

VIS-048, VIS-049, VIS-050, VIS-051, VIS-052 and VIS-053.

These components are placed on existing overview articles; no article-generation rerun is required. Tasmania already serves as both a state overview and a single regional GI, while VIS-025 serves the Victorian overview.

### Authoritative maps — remaining 9

VIS-024, VIS-031, VIS-034, VIS-038, VIS-040, VIS-043, VIS-045, VIS-046 and VIS-047.

Maps remain separate because they require verified geographic data, source attribution and an explicit boundary/orientation treatment. They must not be generated from prose or AI artwork.

## Drift found

- Website: VIS-002 and VIS-009 are implemented.
- WDOS registry: VIS-009 has a published component specification; VIS-002 is still recorded only as a proposed asset.
- Both legacy assets still have incomplete registry metadata such as canonical alt text and file/component locations.

The WDOS registry should be reconciled after the website preview is approved so its status reflects all implemented components and maps. This is a metadata update only; it must not be used to imply that all registered reuse placements have already been reviewed.

## Production order after this batch

1. Review the national, state and regional Australian map hierarchy on desktop and mobile.
2. Roll approved components into their contextually suitable registered pages.
3. Produce the nine remaining international maps from authoritative geographic sources.
4. Retire or merge a concept only after confirming that its learning objective is fully covered by another canonical component.
