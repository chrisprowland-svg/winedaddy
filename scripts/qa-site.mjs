import fs from 'node:fs';
import path from 'node:path';
import {cardTitle, escapeHtml, faviconHead, siteHeader} from '../site/site.mjs';
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/articles.json'), 'utf8'));
const errors = [];
const header = siteHeader();
for (const route of ['/fundamentals/', '/grapes/', '/regions/', '/winemaking/', '/search.html']) if (!header.includes(`href="${route}"`)) errors.push(`header navigation missing ${route}`);
if (header.includes('href="/about.html"')) errors.push('About must remain footer-only');
for (const file of ['index.html', 'about.html', 'contact.html', 'privacy.html', 'search.html']) { const html = fs.readFileSync(path.join(root, file), 'utf8'); if (!html.includes(header)) errors.push(`${file}: shared header is stale`); if (!html.includes(faviconHead())) errors.push(`${file}: favicon metadata is stale`); }
for (const file of ['favicon.ico', 'favicon.svg', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png', 'site.webmanifest']) if (!fs.existsSync(path.join(root, file))) errors.push(`favicon asset missing: ${file}`);
const servingWorker = fs.readFileSync(path.join(root, '_worker.js'), 'utf8');
if (/const primaryNav = '[^']*\/about\.html/.test(servingWorker)) errors.push('serving Worker reintroduces About into the primary navigation');
const staticRoutes = ['/', '/fundamentals/', '/grapes/', '/regions/', '/winemaking/', '/about.html', '/contact.html', '/privacy.html', '/search.html'];
const expectedRoutes = new Set([...staticRoutes, ...manifest.articles.map(article => article.route)]);
for (const article of manifest.articles) {
  const file = article.route.endsWith('/') ? path.join(root, article.route.slice(1), 'index.html') : path.join(root, article.route.slice(1));
  if (!fs.existsSync(file)) { errors.push(`${article.slug}: page missing`); continue; }
  const html = fs.readFileSync(file, 'utf8');
  check(html, /<meta name="viewport"/i, article.slug, 'viewport missing');
  check(html, /<link rel="icon" href="\/favicon\.ico" sizes="any">/i, article.slug, 'favicon metadata missing');
  if (!html.includes(`<link rel="canonical" href="https://winedaddy.com.au${article.route}"`)) errors.push(`${article.slug}: canonical incorrect`);
  check(html, /<script type="application\/ld\+json">/i, article.slug, 'JSON-LD missing');
  check(html, /G-M281DG8YTP/i, article.slug, 'GA missing'); check(html, /1085436810811087/i, article.slug, 'Meta Pixel missing');
  check(html, /<section class="highlights"><h2>Highlights<\/h2>/i, article.slug, 'Highlights component missing');
  if ((html.match(/<h1(?:\s|>)/gi) || []).length !== 1) errors.push(`${article.slug}: expected one H1`);
  if (/INTERNAL EDITORIAL APPENDIX|NOT FOR PUBLICATION|BEGIN READER ARTICLE|END READER ARTICLE|IMPLEMENTATION NOTE|\[Visual:\s*VIS-/i.test(html)) errors.push(`${article.slug}: internal content leaked`);
  for (const match of html.matchAll(/href="(\/[^"#?]+)[^"]*"/g)) if (!routeExists(match[1])) errors.push(`${article.slug}: broken internal link ${match[1]}`);
}
const groups = new Map();
for (const article of manifest.articles) groups.set(article.section, [...(groups.get(article.section) || []), article]);
for (const [section, articles] of groups) { const hub = fs.readFileSync(path.join(root, section, 'index.html'), 'utf8'); for (const article of articles) { if (!hub.includes(`href="${article.route}"`)) errors.push(`${article.slug}: missing from ${section} hub`); if (!hub.includes(`<h2>${escapeHtml(cardTitle(article))}</h2>`)) errors.push(`${article.slug}: concise card title missing from ${section} hub`); if (cardTitle(article) !== article.title && hub.includes(`<h2>${escapeHtml(article.title)}</h2>`)) errors.push(`${article.slug}: SEO title leaked into ${section} card`); } }
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>https:\/\/winedaddy\.com\.au([^<]+)<\/loc>/g)].map(match => match[1]);
if (new Set(sitemapUrls).size !== sitemapUrls.length) errors.push('sitemap contains duplicate URLs');
for (const route of expectedRoutes) if (!sitemapUrls.includes(route)) errors.push(`sitemap missing ${route}`);
const search = JSON.parse(fs.readFileSync(path.join(root, 'search-index.json'), 'utf8'));
if (search.length !== manifest.articles.length) errors.push(`search index expected ${manifest.articles.length}; found ${search.length}`);
for (const query of ['gris', 'chardonnay', 'mudgee', 'fermentation']) if (!search.some(item => `${item.title} ${item.description} ${item.text}`.toLowerCase().includes(query))) errors.push(`search index cannot find ${query}`);
if (Buffer.byteLength(JSON.stringify(search)) > 200_000) errors.push('search index exceeds its 200 KB delivery budget');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Site QA passed: ${manifest.articles.length} articles, 4 hubs, ${sitemapUrls.length} unique sitemap URLs.`);
function routeExists(route) { if (expectedRoutes.has(route)) return true; return route.endsWith('/') ? fs.existsSync(path.join(root, route.slice(1), 'index.html')) : fs.existsSync(path.join(root, route.slice(1))); }
function check(html, pattern, slug, message) { if (!pattern.test(html)) errors.push(`${slug}: ${message}`); }
