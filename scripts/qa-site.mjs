import fs from 'node:fs';
import path from 'node:path';
import {cardTitle, escapeHtml, faviconHead, siteHeader} from '../site/site.mjs';
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/articles.json'), 'utf8'));
const entityRegistry = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/entities.json'), 'utf8'));
const relationshipRegistry = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/relationships.json'), 'utf8'));
const recommendationRegistry = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/recommendations.json'), 'utf8'));
const errors = [];
const header = siteHeader();
for (const route of ['/fundamentals/', '/grapes/', '/regions/', '/winemaking/', '/search.html']) if (!header.includes(`href="${route}"`)) errors.push(`header navigation missing ${route}`);
if (header.includes('href="/about.html"')) errors.push('About must remain footer-only');
for (const file of ['index.html', 'about.html', 'contact.html', 'privacy.html', 'search.html']) { const html = fs.readFileSync(path.join(root, file), 'utf8'); if (!html.includes(header)) errors.push(`${file}: shared header is stale`); if (!html.includes(faviconHead())) errors.push(`${file}: favicon metadata is stale`); }
for (const file of ['favicon.ico', 'favicon.svg', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png', 'site.webmanifest']) if (!fs.existsSync(path.join(root, file))) errors.push(`favicon asset missing: ${file}`);
const servingWorker = fs.readFileSync(path.join(root, '_worker.js'), 'utf8');
if (/const primaryNav = '[^']*\/about\.html/.test(servingWorker)) errors.push('serving Worker reintroduces About into the primary navigation');
if (!servingWorker.includes('<aside class="geography-panel"')) errors.push('serving Worker can strip the Knowledge Graph v2 geography panel');
const staticRoutes = ['/', '/fundamentals/', '/grapes/', '/regions/', '/winemaking/', '/about.html', '/contact.html', '/privacy.html', '/search.html'];
const expectedRoutes = new Set([...staticRoutes, ...manifest.articles.map(article => article.route)]);
const entityIds = new Set(entityRegistry.entities.map(entity => entity.id));
const allowedPredicates = new Set(['editorially_related_to', 'member_of', 'recommended_next', 'located_in', 'contains']);
if (entityIds.size !== entityRegistry.entities.length) errors.push('entity registry contains duplicate IDs');
const expectedEntityCount = manifest.articles.length + 4;
if (entityRegistry.entities.length !== expectedEntityCount) errors.push(`entity registry expected ${expectedEntityCount}; found ${entityRegistry.entities.length}`);
for (const article of manifest.articles) {
  const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === article.route);
  if (!entity) errors.push(`${article.slug}: canonical entity missing`);
}
for (const relationship of relationshipRegistry.relationships) {
  if (!entityIds.has(relationship.from)) errors.push(`relationship source missing: ${relationship.from}`);
  if (!entityIds.has(relationship.to)) errors.push(`relationship target missing: ${relationship.to}`);
  if (relationship.from === relationship.to) errors.push(`self relationship is not allowed: ${relationship.from}`);
  if (!allowedPredicates.has(relationship.predicate)) errors.push(`relationship predicate is not governed: ${relationship.predicate}`);
  if (!relationship.evidence) errors.push(`relationship evidence missing: ${relationship.from} -> ${relationship.to}`);
}
const geography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/australian-geography.json'), 'utf8'));
const geographySlugs = new Set();
if (geography.places.length < 50 || geography.places.length > 100) errors.push(`geography pilot expected 50-100 places; found ${geography.places.length}`);
for (const place of geography.places) {
  if (geographySlugs.has(place.slug)) errors.push(`duplicate geography slug: ${place.slug}`);
  geographySlugs.add(place.slug);
  const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.slug}/`);
  if (!entity) { errors.push(`geography entity missing: ${place.slug}`); continue; }
  if (entity.geographyKind !== place.kind) errors.push(`geography kind missing: ${place.slug}`);
  const renderedPage = fs.readFileSync(path.join(root, place.slug, 'index.html'), 'utf8');
  if (!renderedPage.includes('data-geography-hierarchy')) errors.push(`geography hierarchy not rendered: ${place.slug}`);
  if (!renderedPage.includes(`<strong>${escapeHtml(place.label)}</strong>`)) errors.push(`geography label not rendered: ${place.slug}`);
  if (!renderedPage.includes(`"@type":"Place","name":"${place.label.replaceAll('"', '\\"')}"`)) errors.push(`geography Place schema missing: ${place.slug}`);
  if (place.kind === 'informal_growing_area' && !renderedPage.includes('not shown here as a separately registered Australian GI')) errors.push(`informal geography qualifier missing: ${place.slug}`);
  if (!place.parent) continue;
  const parent = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.parent}/`);
  if (!parent) { errors.push(`geography parent missing: ${place.parent}`); continue; }
  const forward = relationshipRegistry.relationships.some(item => item.from === entity.id && item.predicate === 'located_in' && item.to === parent.id);
  const inverse = relationshipRegistry.relationships.some(item => item.from === parent.id && item.predicate === 'contains' && item.to === entity.id);
  if (!forward || !inverse) errors.push(`geography relationship pair missing: ${place.slug} -> ${place.parent}`);
  const evidence = place.evidence || 'wine_australia_gi_hierarchy';
  if (!geography.evidenceCatalog[evidence]) errors.push(`geography evidence is not governed: ${place.slug} (${evidence})`);
}
const editorialDegree = new Map(entityRegistry.entities.map(entity => [entity.id, 0]));
for (const relationship of relationshipRegistry.relationships) {
  if (relationship.predicate !== 'editorially_related_to') continue;
  editorialDegree.set(relationship.from, (editorialDegree.get(relationship.from) || 0) + 1);
  editorialDegree.set(relationship.to, (editorialDegree.get(relationship.to) || 0) + 1);
}
const topicEntities = entityRegistry.entities.filter(entity => entity.type !== 'knowledge_collection');
if (recommendationRegistry.recommendations.length !== topicEntities.length) errors.push(`recommendation coverage expected ${topicEntities.length}; found ${recommendationRegistry.recommendations.length}`);
for (const recommendation of recommendationRegistry.recommendations) {
  if (!entityIds.has(recommendation.entityId)) errors.push(`recommendation source missing: ${recommendation.entityId}`);
  if (recommendation.items.length < 1 || recommendation.items.length > 3) errors.push(`recommendation set expected 1-3 items: ${recommendation.entityId}`);
  if (new Set(recommendation.items.map(item => item.entityId)).size !== recommendation.items.length) errors.push(`recommendation set contains duplicates: ${recommendation.entityId}`);
  const page = recommendation.article.endsWith('/') ? path.join(root, recommendation.article.slice(1), 'index.html') : path.join(root, recommendation.article.slice(1));
  const html = fs.readFileSync(page, 'utf8');
  if ((html.match(/data-graph-related/g) || []).length !== recommendation.items.length) errors.push(`recommendation cards missing: ${recommendation.article}`);
  for (const item of recommendation.items) if (!entityIds.has(item.entityId) || !expectedRoutes.has(item.route)) errors.push(`recommendation target invalid: ${item.entityId}`);
}
for (const article of manifest.articles) {
  const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === article.route);
  const collectionId = `wd:knowledge_collection:${article.section}`;
  if (entity && !relationshipRegistry.relationships.some(relationship => relationship.from === entity.id && relationship.predicate === 'member_of' && relationship.to === collectionId)) errors.push(`${article.slug}: collection membership missing`);
}
const publicGraph = JSON.parse(fs.readFileSync(path.join(root, 'knowledge-graph.json'), 'utf8'));
if (entityRegistry.version !== 2 || relationshipRegistry.version !== 2 || publicGraph.version !== 2) errors.push('Knowledge Graph v2 version marker missing');
if (!publicGraph['@context'].located_in || !publicGraph['@context'].contains) errors.push('Knowledge Graph v2 predicate context missing');
if (publicGraph.entities.length !== entityRegistry.entities.length) errors.push('public knowledge graph entity count is stale');
if (publicGraph.relationships.length !== relationshipRegistry.relationships.length) errors.push('public knowledge graph relationship count is stale');
for (const article of manifest.articles) {
  const source = fs.readFileSync(path.join(root, article.source), 'utf8');
  for (const route of sourceInternalRoutes(source)) {
    if (!routeExists(route)) errors.push(`${article.slug}: broken source link ${route}`);
  }
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
if (Buffer.byteLength(JSON.stringify(search)) > 500_000) errors.push('search index exceeds its 500 KB delivery budget');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Site QA passed: ${manifest.articles.length} articles, 4 hubs, ${sitemapUrls.length} unique sitemap URLs.`);
function routeExists(route) { if (expectedRoutes.has(route)) return true; return route.endsWith('/') ? fs.existsSync(path.join(root, route.slice(1), 'index.html')) : fs.existsSync(path.join(root, route.slice(1))); }
function sourceInternalRoutes(source) {
  const routes = [];
  const patterns = [
    /\[[^\]]*\]\((\/[^)#?\s]+)(?:#[^)]*)?\)/g,
    /href=["'](\/[^"'#?\s]+)/g,
    /(?:https?:\/\/)?(?:www\.)?winedaddy\.com\.au(\/[^)#?\s"']+)/g
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const route = match[1];
      if (!route.startsWith('/assets/')) routes.push(route);
    }
  }
  return [...new Set(routes)];
}
function check(html, pattern, slug, message) { if (!pattern.test(html)) errors.push(`${slug}: ${message}`); }
