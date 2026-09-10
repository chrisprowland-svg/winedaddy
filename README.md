# WineDaddy website

WineDaddy is a static Cloudflare Pages site generated from one content manifest and one shared design shell.

## Architecture

- `content/articles.json` is the article catalogue and routing authority.
- `content/knowledge/entities.json` assigns every canonical topic a stable WineDaddy entity ID and type.
- `content/knowledge/relationships.json` records the directed relationships between those entities.
- `knowledge-graph.json` publishes the current machine-readable graph for future discovery and API use.
- `article-source/` contains reader-facing source content.
- `site/site.mjs` owns shared navigation, footer, metadata, analytics, and page chrome.
- `scripts/build-site.mjs` generates every article, hub, search index, sitemap, and QA manifest.
- `scripts/build-knowledge-graph.mjs` deterministically rebuilds the entity and relationship registries from approved content.

Knowledge Graph v1 uses governed predicates: `member_of` for canonical collection membership and `editorially_related_to` for relationships evidenced by an approved reader-facing link. More specific factual predicates require explicit enrichment rather than automatic inference.

Knowledge Graph v2 begins with a controlled Australian geography pilot in `content/knowledge/australian-geography.json`. It adds reviewed `located_in` / `contains` pairs for 50–100 canonical place entities, records their evidence class, renders the hierarchy on affected articles, and publishes nested Schema.org `Place` data. Informal Tasmanian growing areas are explicitly labelled and are never represented as separately registered GIs. These factual relationships are curated; the build must not infer them from titles or descriptions.
- `scripts/qa-site.mjs` checks every generated route, canonical, link, heading, analytics tag, schema block, hub entry, search entry, and sitemap entry.
- `workers/page-qa/` contains the deployed remote QA Worker used against protected branch previews before human review.

Retired Department 7 renderers and workflows have been removed. Departments 1–6 produce approved article content; implementation is now deterministic.

## Local verification

```sh
npm ci
npm run check
npm test
npm run worker:check
```

GitHub Actions runs the same gates for every pull request. A branch preview is the review artefact; production is promoted only after explicit human approval.

## Adding an article

1. Add the reader article to `article-source/`.
2. Add its title, description, section, route, and source path to `content/articles.json`.
3. Run `npm run check` and `npm test`.
4. Push a branch and review the Cloudflare Pages preview plus the QA Worker report.

Every generated page receives the canonical URL, JSON-LD, Google Analytics `G-M281DG8YTP`, and Meta Pixel `1085436810811087` from the shared shell.
