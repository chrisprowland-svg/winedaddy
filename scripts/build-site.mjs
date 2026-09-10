import fs from 'node:fs';
import path from 'node:path';
import {marked} from 'marked';
import {SITE_URL, cardTitle, escapeHtml, faviconHead, pageDocument, sections, siteHeader} from '../site/site.mjs';
import {renderVisualComponents} from '../site/visual-components.mjs';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/articles.json'), 'utf8'));
const recommendationRegistry = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/recommendations.json'), 'utf8'));
const entityRegistry = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/entities.json'), 'utf8'));
const relationshipRegistry = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/relationships.json'), 'utf8'));
const recommendationsByRoute = new Map(recommendationRegistry.recommendations.map(recommendation => [recommendation.article, recommendation.items]));
const entitiesById = new Map(entityRegistry.entities.map(entity => [entity.id, entity]));
const entitiesByRoute = new Map(entityRegistry.entities.map(entity => [entity.canonicalArticle, entity]));
const parentsById = new Map();
const childrenById = new Map();
const regionsByGrapeId = new Map();
const grapesByRegionId = new Map();
for (const relationship of relationshipRegistry.relationships) {
  if (relationship.predicate === 'located_in') parentsById.set(relationship.from, relationship.to);
  if (relationship.predicate === 'contains') childrenById.set(relationship.from, [...(childrenById.get(relationship.from) || []), relationship.to]);
  if (relationship.predicate === 'grown_in') regionsByGrapeId.set(relationship.from, [...(regionsByGrapeId.get(relationship.from) || []), relationship.to]);
  if (relationship.predicate === 'known_for') grapesByRegionId.set(relationship.from, [...(grapesByRegionId.get(relationship.from) || []), relationship.to]);
}
const seenSlugs = new Set();
const searchEntries = [];
for (const article of manifest.articles) {
  validateArticle(article);
  if (seenSlugs.has(article.slug)) throw new Error(`${article.slug}: duplicate slug`);
  seenSlugs.add(article.slug);
  const rawSource = fs.readFileSync(path.join(root, article.source), 'utf8');
  const source = article.source.endsWith('.md') ? normaliseReaderSource(rawSource) : rawSource;
  validateSource(article.slug, source);
  const renderedBody = article.source.endsWith('.md') ? renderMarkdown(source) : source;
  const body = stripLegacyRelatedLearning(renderedBody);
  const related = renderRecommendations(recommendationsByRoute.get(article.route));
  const geography = geographyModel(entitiesByRoute.get(article.route));
  const geographyPanel = renderGeography(geography);
  const grapeRegionPanel = renderGrapeRegions(entitiesByRoute.get(article.route));
  const section = sections[article.section];
  const canonicalPath = article.route;
  const articleSchema = {'@type':'Article',headline:article.title,description:article.description,mainEntityOfPage:`${SITE_URL}${canonicalPath}`,articleSection:section.name,inLanguage:'en-AU',author:{'@type':'Organization',name:'WineDaddy'},publisher:{'@type':'Organization',name:'WineDaddy'}};
  if (geography) articleSchema.about = placeSchema(geography);
  const schema = {'@context':'https://schema.org','@graph':[articleSchema,{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:`${SITE_URL}/`},{'@type':'ListItem',position:2,name:section.name,item:`${SITE_URL}/${article.section}/`},{'@type':'ListItem',position:3,name:article.title,item:`${SITE_URL}${canonicalPath}`}]}]};
  const heroTitle = geography?.entity.name || source.match(/^#\s+(.+)$/m)?.[1] || article.title;
  const html = pageDocument({title: article.title, description: article.description, canonicalPath, type: 'article', schema, body: `<main><section class="page-hero"><div class="section"><p class="breadcrumbs"><a href="/">Home</a> / <a href="/${article.section}/">${section.name}</a></p><p class="eyebrow">${section.name}</p><h1>${escapeHtml(heroTitle)}</h1><p class="lede">${escapeHtml(article.description)}</p><p class="article-meta">Foundation guide · Beginner friendly · Australian context</p></div></section><article class="article article-wide">${geographyPanel}${grapeRegionPanel}${body}${related}</article></main>`});
  const outputPath = canonicalPath.endsWith('/') ? path.join(root, canonicalPath.slice(1), 'index.html') : path.join(root, canonicalPath.slice(1));
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, html);
  searchEntries.push({title: article.title, description: article.description, url: canonicalPath, text: visibleText(body).slice(0, 100)});
}
for (const [key, section] of Object.entries(sections)) buildHub(key, section, manifest.articles.filter(article => article.section === key));
refreshStaticHeaders();
searchEntries.sort((a, b) => a.title.localeCompare(b.title));
fs.writeFileSync(path.join(root, 'search-index.json'), `${JSON.stringify(searchEntries)}\n`);
buildSitemap(manifest.articles);
fs.writeFileSync(path.join(root, 'qa-manifest.json'), `${JSON.stringify({version: 1, paths: manifest.articles.map(article => article.route)}, null, 2)}\n`);
console.log(`Built ${manifest.articles.length} articles and ${Object.keys(sections).length} hubs from one manifest.`);

function validateArticle(article) { if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug || '')) throw new Error(`invalid slug: ${article.slug}`); if (!/^\/(?:[a-z0-9-]+\/)*(?:[a-z0-9-]+\/|[a-z0-9-]+\.html)$/.test(article.route || '')) throw new Error(`${article.slug}: invalid route`); if (!sections[article.section]) throw new Error(`${article.slug}: invalid section`); if (!article.title || !article.description || !article.source) throw new Error(`${article.slug}: incomplete metadata`); }
function validateSource(slug, source) { if (/INTERNAL EDITORIAL APPENDIX|NOT FOR PUBLICATION|BEGIN READER ARTICLE|END READER ARTICLE|IMPLEMENTATION NOTE|\[Visual:\s*VIS-/i.test(source)) throw new Error(`${slug}: internal workflow material in reader source`); if (source.trimStart().startsWith('<')) { if (!/<h2>Highlights<\/h2>/i.test(source)) throw new Error(`${slug}: Highlights missing`); return; } if (!/^#\s+\S/m.test(source)) throw new Error(`${slug}: article title missing`); if (!/^##\s+Highlights\s*$/im.test(source)) throw new Error(`${slug}: Highlights missing`); }
function normaliseReaderSource(source) { return source.replace(/^##\s+(?:.+\s+)?(?:highlights?|(?:the\s+)?quick highlights|at a glance|quick facts|in brief|in short|in a nutshell)\s*$/im, '## Highlights'); }
function renderMarkdown(source) { let html = marked.parse(source).replace(/^<h1>.*?<\/h1>\s*/s, ''); html = html.replace(/<h1([^>]*)>/g, '<h2$1>').replace(/<\/h1>/g, '</h2>'); html = html.replace(/<h2>Highlights<\/h2>([\s\S]*?<\/ul>)/i, '<section class="highlights"><h2>Highlights</h2>$1</section>'); html = html.replace(/<table>/g, '<div class="table-scroll" tabindex="0"><table class="article-table">').replace(/<\/table>/g, '</table></div>'); return renderVisualComponents(html); }
function stripLegacyRelatedLearning(html) { return html.replace(/<h2[^>]*>Related (?:learning|reading)<\/h2>[\s\S]*?(?=<h2(?:\s|>)|$)/gi, ''); }
function buildHub(key, section, articles) { const cards = articles.sort((a,b) => cardTitle(a).localeCompare(cardTitle(b))).map(article => `<a class="card guide-card" href="${article.route}"><div><h2>${escapeHtml(cardTitle(article))}</h2><p>${escapeHtml(article.description)}</p></div><b>Read guide →</b></a>`).join(''); const body = `<main><section class="page-hero hub-hero"><div class="section"><p class="eyebrow">WineDaddy knowledge base</p><h1>${section.name}</h1><p class="lede">${section.description}</p><p class="article-count">${articles.length} guides</p></div></section><section class="section"><label class="guide-filter">Filter ${section.name.toLowerCase()} guides<input type="search" data-guide-filter placeholder="Search ${section.name.toLowerCase()}…"></label><div class="grid guide-grid" data-guide-grid>${cards}</div><p class="empty-state" data-empty-state hidden>No matching guides found.</p></section></main>`; const schema = {'@context':'https://schema.org','@type':'CollectionPage',name:section.name,url:`${SITE_URL}/${key}/`,description:section.description}; fs.mkdirSync(path.join(root, key), {recursive: true}); fs.writeFileSync(path.join(root, key, 'index.html'), pageDocument({title: section.name, description: section.description, canonicalPath:`/${key}/`, schema, body})); }
function buildSitemap(articles) { const staticPaths = ['/', '/fundamentals/', '/grapes/', '/regions/', '/winemaking/', '/about.html', '/contact.html', '/privacy.html', '/search.html']; const urls = [...staticPaths, ...articles.map(article => article.route)]; const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(route => `  <url><loc>${SITE_URL}${route}</loc></url>`).join('\n')}\n</urlset>\n`; fs.writeFileSync(path.join(root, 'sitemap.xml'), xml); }
function refreshStaticHeaders() { for (const file of ['index.html', 'about.html', 'contact.html', 'privacy.html', 'search.html']) { const target = path.join(root, file); let html = fs.readFileSync(target, 'utf8'); if (!/<header class="site-header">[\s\S]*?<\/header>/.test(html)) throw new Error(`${file}: shared header missing`); html = html.replace(/<header class="site-header">[\s\S]*?<\/header>/, siteHeader()).replace(/\/assets\/styles\.css\?v=[^"]+/, '/assets/styles.css?v=20260910-1').replace(/\/assets\/script\.js\?v=[^"]+/, '/assets/script.js?v=20260910-1'); if (!html.includes('href="/favicon.ico"')) html = html.replace('<meta name="viewport" content="width=device-width,initial-scale=1">', `<meta name="viewport" content="width=device-width,initial-scale=1">${faviconHead()}`); if (file === 'search.html' && !/<script type="application\/ld\+json">/.test(html)) { const schema = JSON.stringify({'@context':'https://schema.org','@type':'SearchResultsPage',name:'Search WineDaddy',url:`${SITE_URL}/search.html`}); html = html.replace('</head>', `<script type="application/ld+json">${schema}</script></head>`); } fs.writeFileSync(target, html); } }
function visibleText(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
function renderRecommendations(items) { if (!items?.length) return ''; const cards = items.map(item => `<a class="graph-related-card" data-graph-related href="${item.route}"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><b>Read guide →</b></a>`).join(''); return `<aside class="graph-related" aria-labelledby="explore-next-title"><p class="kicker">Related WineDaddy guides</p><h2 id="explore-next-title">Explore next</h2><div class="graph-related-grid">${cards}</div></aside>`; }
function renderGrapeRegions(entity) {
  if (!entity) return '';
  const regionIds = regionsByGrapeId.get(entity.id) || [];
  const grapeIds = grapesByRegionId.get(entity.id) || [];
  const related = (regionIds.length ? regionIds : grapeIds).map(id => entitiesById.get(id)).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name));
  if (!related.length) return '';
  const title = regionIds.length ? 'Australian regions for this grape' : 'Grapes associated with this region';
  const links = related.map(item => `<a href="${item.canonicalArticle}">${escapeHtml(item.name.replace(/^What Is /i, '').replace(/\?$/, ''))}</a>`).join('');
  return `<aside class="entity-links" data-grape-region-links><p class="kicker">Grape and place</p><h2>${title}</h2><div>${links}</div></aside>`;
}
function geographyModel(entity) {
  if (!entity?.geographyKind) return null;
  const ancestors = [];
  const seen = new Set([entity.id]);
  let parentId = parentsById.get(entity.id);
  while (parentId) {
    if (seen.has(parentId)) throw new Error(`geography cycle detected at ${entity.id}`);
    seen.add(parentId);
    const parent = entitiesById.get(parentId);
    if (!parent) throw new Error(`geography parent entity missing: ${parentId}`);
    ancestors.unshift(parent);
    parentId = parentsById.get(parentId);
  }
  const children = (childrenById.get(entity.id) || []).map(id => entitiesById.get(id)).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name));
  return {entity, ancestors, children};
}
function renderGeography(model) {
  if (!model) return '';
  const path = [...model.ancestors, model.entity].map((entity, index, all) => index === all.length - 1 ? `<strong>${escapeHtml(entity.name)}</strong>` : `<a href="${entity.canonicalArticle}">${escapeHtml(entity.name)}</a>`).join('<span aria-hidden="true">›</span>');
  const children = model.children.length ? `<div class="geography-children"><p>${childGroupLabel(model.children)}</p><div>${model.children.map(child => `<a href="${child.canonicalArticle}">${escapeHtml(child.name)}</a>`).join('')}</div></div>` : '';
  const qualifier = model.entity.geographyKind === 'informal_growing_area' ? '<p class="geography-note">Commonly used growing-area name; not shown here as a separately registered Australian GI.</p>' : '';
  return `<aside class="geography-panel" data-geography-hierarchy aria-labelledby="wine-geography-title"><p class="kicker">Where it fits</p><h2 id="wine-geography-title">Wine geography</h2><nav class="geography-path" aria-label="Wine geography hierarchy">${path}</nav>${children}${qualifier}</aside>`;
}
function childGroupLabel(children) {
  const kinds = new Set(children.map(child => child.geographyKind));
  if (kinds.size === 1 && kinds.has('informal_growing_area')) return 'Explore selected WineDaddy growing-area guides';
  if (kinds.size === 1 && kinds.has('wine_region')) return 'Explore wine regions';
  if (kinds.size === 1 && kinds.has('wine_zone')) return 'Explore wine zones';
  if (kinds.size === 1 && kinds.has('state_or_territory')) return 'Explore states and territories';
  return 'Explore within this place';
}
function placeSchema(model) {
  let containedInPlace;
  for (const entity of model.ancestors) containedInPlace = {'@type':'Place',name:entity.name,url:`${SITE_URL}${entity.canonicalArticle}`,...(containedInPlace ? {containedInPlace} : {})};
  return {'@type':'Place',name:model.entity.name,url:`${SITE_URL}${model.entity.canonicalArticle}`,...(containedInPlace ? {containedInPlace} : {})};
}
