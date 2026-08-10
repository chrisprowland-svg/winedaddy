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

const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
for (const slug of slugs) if (!sitemap.includes(`https://winedaddy.com.au/${slug}/`)) errors.push(`${slug}: sitemap entry missing`);
const headers = fs.readFileSync('_headers', 'utf8');
if (!/X-Robots-Tag:\s*noindex,\s*nofollow/i.test(headers)) errors.push('preview noindex header missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Department 7 Deployment QA passed for ${slugs.length}/20 articles under WDOS runtime contract 1.6.`);
