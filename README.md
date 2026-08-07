# WineDaddy Stage 1

Static Cloudflare Pages site.

## Deploy
Upload the contents of this folder to the root of the `winedaddy` GitHub repository. Cloudflare Pages will deploy automatically.

## Analytics requirement
Every public HTML page must include Google Analytics property `G-M281DG8YTP` and Meta Pixel `1085436810811087`. New generated articles include both automatically through `build-article.mjs`.

Before preview or deployment, run:

```sh
node analytics.mjs
node analytics.mjs --check
```

The first command adds the tags to newly created HTML pages. The second fails if either tag is missing or duplicated on any page.

## Current scope
- Homepage
- Grapes hub and 3 guides
- Regions hub and 3 guides
- Winemaking hub and 3 guides
- About, contact, privacy
- Schema.org JSON-LD
- robots.txt and sitemap.xml

## Before public launch
- Add a real email mailbox or alias for hello@winedaddy.com.au
- Keep the privacy notice current when analytics or advertising technology changes
- Review all educational copy and source links
- Add favicon and social preview artwork
