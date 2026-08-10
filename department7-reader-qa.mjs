import fs from 'node:fs';
import path from 'node:path';
import { slugs } from './sanitize-reader-source.mjs';

const errors = [];
const existsForRoute = route => {
  const clean = route.split(/[?#]/)[0];
  if (clean === '/') return fs.existsSync('index.html');
  if (/\.[a-z]+$/i.test(clean)) return fs.existsSync(clean.slice(1));
  return fs.existsSync(path.join(clean.slice(1), 'index.html'));
};
const visibleText = html => html
  .replace(/<head[\s\S]*?<\/head>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim();

for (const slug of slugs) {
  const file = path.join(slug, 'index.html');
  if (!fs.existsSync(file)) {
    errors.push(`${slug}: generated page missing`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const checks = [
    [/<meta name="viewport"/i, 'mobile viewport missing'],
    [new RegExp(`<link rel="canonical" href="https://winedaddy\\.com\\.au/${slug}/"`, 'i'), 'canonical incorrect'],
    [/<script type="application\/ld\+json">/i, 'JSON-LD missing'],
    [/G-M281DG8YTP/i, 'Google Analytics missing'],
    [/1085436810811087/i, 'Meta Pixel missing'],
    [/<h2>Highlights<\/h2>/i, 'Highlights missing'],
  ];
  for (const [pattern, message] of checks) if (!pattern.test(html)) errors.push(`${slug}: ${message}`);
  if ((html.match(/<h1(?:\s|>)/gi) || []).length !== 1) errors.push(`${slug}: expected exactly one H1`);
  if (/<h[1-6][^>]*>\s*(?:Front matter|References|Source register|Claim-to-Source Notes|Unresolved Flags|Editorial Self-Review|Operator Summary|Handover Package)\s*<\/h[1-6]>/i.test(html)) {
    errors.push(`${slug}: internal evidence, metadata or workflow heading leaked`);
  }
  const text = visibleText(html);
  if (/(?:^|\s)(?:title|description|canonical|slug|route|primary entity|primary topic|primary question|parent cluster|audience|article type|article_type|status|reading time|suggested description)\s*:\s*/i.test(text)) {
    errors.push(`${slug}: front matter or raw metadata field leaked into visible content`);
  }
  if (/INTERNAL EDITORIAL APPENDIX|NOT FOR PUBLICATION|BEGIN READER ARTICLE|END READER ARTICLE|IMPLEMENTATION NOTE/i.test(text)) {
    errors.push(`${slug}: internal workflow material leaked into visible content`);
  }
  for (const match of html.matchAll(/href="(\/[^"]+)"/g)) {
    if (!existsForRoute(match[1])) errors.push(`${slug}: broken internal link ${match[1]}`);
  }
}

const inventory = {
  'fundamentals/index.html': [
    'what-is-wine','how-wine-is-made','red-wine-vs-white-wine','what-is-rose','what-is-sparkling-wine','what-is-sweet-wine','what-is-fortified-wine','what-is-natural-wine','what-is-organic-wine','what-is-biodynamic-wine','how-to-taste-wine','wine-serving-temperature-explained','when-to-decant-wine','how-to-store-open-wine','how-to-cellar-wine','what-is-cork-taint','what-is-oxidation-in-wine','how-to-read-a-wine-label'
  ],
  'grapes/index.html': [
    'what-is-pinot-noir','what-is-shiraz','what-is-chardonnay','what-is-pinot-gris-pinot-grigio','what-is-sauvignon-blanc','what-is-riesling','what-is-cabernet-sauvignon','what-is-merlot','what-is-grenache','what-is-sangiovese','what-is-nebbiolo','what-is-tempranillo'
  ],
  'regions/index.html': [
    'tasmania-wine-region','mornington-peninsula-wine-region','yarra-valley-wine-region','adelaide-hills-wine-region','barossa-valley-wine-region','mclaren-vale-wine-region','margaret-river-wine-region','hunter-valley-wine-region'
  ],
  'winemaking/index.html': [
    'what-is-fermentation','what-does-oak-do-to-wine','what-is-terroir','how-climate-affects-wine'
  ],
};

const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
let canonicalCount = 0;
for (const [hubFile, hubSlugs] of Object.entries(inventory)) {
  if (!fs.existsSync(hubFile)) {
    errors.push(`${hubFile}: hub missing`);
    continue;
  }
  const hub = fs.readFileSync(hubFile, 'utf8');
  for (const slug of hubSlugs) {
    canonicalCount += 1;
    if (!existsForRoute(`/${slug}/`)) errors.push(`${slug}: canonical article page missing`);
    if (!hub.includes(`href="/${slug}/"`)) errors.push(`${slug}: not discoverable from ${hubFile}`);
    if (!sitemap.includes(`https://winedaddy.com.au/${slug}/`)) errors.push(`${slug}: sitemap entry missing`);
  }
}
if (canonicalCount !== 42) errors.push(`canonical inventory expected 42 articles; found ${canonicalCount}`);
for (const hub of ['/fundamentals/','/grapes/','/regions/','/winemaking/']) {
  if (!sitemap.includes(`https://winedaddy.com.au${hub}`)) errors.push(`${hub}: hub sitemap entry missing`);
}
const homepage = fs.readFileSync('index.html', 'utf8');
for (const hub of ['/fundamentals/','/grapes/','/regions/','/winemaking/']) {
  if (!homepage.includes(`href="${hub}"`)) errors.push(`${hub}: not linked from homepage`);
}
const headers = fs.readFileSync('_headers', 'utf8');
if (!/X-Robots-Tag:\s*noindex,\s*nofollow/i.test(headers)) errors.push('preview noindex header missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Department 7 Deployment QA passed: ${slugs.length}/20 current-batch reader pages plus 42/42 canonical articles discoverable through site hubs.`);
