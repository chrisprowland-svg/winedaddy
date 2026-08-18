# WineDaddy website

WineDaddy is a static Cloudflare Pages site generated from one content manifest and one shared design shell.

## Architecture

- `content/articles.json` is the article catalogue and routing authority.
- `article-source/` contains reader-facing source content.
- `site/site.mjs` owns shared navigation, footer, metadata, analytics, and page chrome.
- `scripts/build-site.mjs` generates every article, hub, search index, sitemap, and QA manifest.
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
