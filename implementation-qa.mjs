import fs from 'node:fs';
import path from 'node:path';

const slugs = [
  'what-is-natural-wine', 'what-is-organic-wine', 'what-is-biodynamic-wine',
  'what-is-merlot', 'what-is-grenache', 'what-is-sangiovese', 'what-is-nebbiolo',
  'what-is-tempranillo', 'how-to-taste-wine', 'what-is-fermentation',
  'what-does-oak-do-to-wine', 'what-is-terroir', 'how-climate-affects-wine',
  'wine-serving-temperature-explained', 'when-to-decant-wine',
  'how-to-store-open-wine', 'how-to-cellar-wine', 'what-is-cork-taint',
  'what-is-oxidation-in-wine', 'how-to-read-a-wine-label',
];

const errors = [];
const existsForRoute = route => {
  const clean = route.split(/[?#]/)[0];
  if (clean === '/') return fs.existsSync('index.html');
  if (/\.[a-z]+$/i.test(clean)) return fs.existsSync(clean.slice(1));
  return fs.existsSync(path.join(clean.slice(1), 'index.html'));
};

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
  if (/INTERNAL EDITORIAL APPENDIX|NOT FOR PUBLICATION|BEGIN READER ARTICLE|END READER ARTICLE|Canonical URL:/i.test(html)) {
    errors.push(`${slug}: internal material leaked`);
  }
  for (const match of html.matchAll(/href="(\/[^"]+)"/g)) {
    if (!existsForRoute(match[1])) errors.push(`${slug}: broken internal link ${match[1]}`);
  }
}

const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
for (const slug of slugs) if (!sitemap.includes(`https://winedaddy.com.au/${slug}/`)) errors.push(`${slug}: sitemap entry missing`);
const headers = fs.readFileSync('_headers', 'utf8');
if (!/X-Robots-Tag:\s*noindex,\s*nofollow/i.test(headers)) errors.push('preview noindex header missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Implementation QA passed for ${slugs.length} articles.`);
