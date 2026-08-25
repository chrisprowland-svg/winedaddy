# WineDaddy Visual Design Standard

Version 1.0 — educational diagram canary

## Purpose

WineDaddy visuals exist to make wine easier to understand. They are learning components, not decoration, advertising or social-media filler.

## Canonical format

- Comparisons, spectra, tables, timelines and simple processes are semantic HTML/CSS components on the website.
- Maps and complex technical illustrations use accessible SVG when HTML would not express the relationships cleanly.
- Photography uses an appropriately compressed modern raster format.
- Every reusable component may have a 1200 × 675 SVG or PNG derivative for Canva, social sharing and image discovery; the derivative is not the canonical article content.
- Components must reflow responsively. Do not shrink desktop text below 16 CSS px on mobile.
- Export derivatives use a 64 px desktop safe area and retain equivalent captions or alt text.

## Layout

- Use an 8 px spacing grid.
- Outer padding: 64 px.
- Major section gap: 32 px.
- Card padding: 28–32 px.
- Borders: 2 px for instructional structures; 1 px for secondary dividers.
- Corner radius: 18 px for learning cards; pill shapes only for short labels.
- Prefer one clear reading path from title to explanation to takeaway.

## Typography

- Headings: Georgia Bold.
- Body, labels and captions: Arial.
- Diagram title: 52 px desktop master.
- Section heading: 28–32 px.
- Body: 22–24 px.
- Labels: 18–20 px, bold where needed.
- Avoid all-capital paragraphs. Uppercase is reserved for short eyebrows and axis endpoints.

## Colour roles

- Ink `#171713`: primary text and dark background.
- Paper `#FFFDF8`: primary light surface.
- Cream `#F6F0E5`: secondary surface.
- Wine `#6D1831`: primary instructional emphasis.
- Gold `#C49348`: secondary emphasis and flavour track.
- Sage `#839276`: supporting information only.
- Muted `#66665E`: captions and non-critical secondary text.

Colour must never be the only carrier of meaning. Every coloured state requires a label, shape or pattern distinction.

## Accessibility

- Meet WCAG AA contrast for text and essential graphics.
- Keep essential explanatory information in semantic article HTML. Image derivatives must not be the only source of that information.
- Every visual requires concise alt text and an optional longer caption.
- The image must remain understandable when printed in greyscale.
- Do not encode meaning using red/green contrast.
- SVGs require a `<title>` and `<desc>`.
- Decorative elements should be hidden from assistive technology.

## Sources and accuracy

- Use only facts already supported by the approved article or registry brief.
- Maps must use authoritative geographic data and state whether boundaries are legal or orientational.
- Do not use generative imagery for maps, labels, measurements or technical processes.
- Avoid absolute claims where the article preserves uncertainty.

## Image and artwork rules

- No random stock photography.
- No inconsistent AI illustration styles.
- Prefer diagrams, tables, controlled vector icons and verified maps.
- Photography is permitted only when the photograph itself teaches something that a diagram cannot.
- Reuse a registered asset before creating a near-duplicate.

## Required asset record

Each published visual must record its canonical ID, title, template, design-standard version, alt text, caption, source facts, file path, verification date and page bindings.

## Review gates

1. Fact validation
2. Design consistency
3. Accessibility and mobile legibility
4. Desktop and mobile preview
5. Human approval
6. Production publication
