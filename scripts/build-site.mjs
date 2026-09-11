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
const winemakingNavigation = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/winemaking-navigation.json'), 'utf8'));
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
  const schema = {'@context':'https://schema.org','@graph':[articleSchema,breadcrumbSchema(article, section, geography)]};
  const heroTitle = geography?.entity.name || source.match(/^#\s+(.+)$/m)?.[1] || article.title;
  const html = pageDocument({title: article.title, description: article.description, canonicalPath, type: 'article', schema, body: `<main><section class="page-hero"><div class="section"><p class="breadcrumbs"><a href="/">Home</a> / <a href="/${article.section}/">${section.name}</a></p><p class="eyebrow">${section.name}</p><h1>${escapeHtml(heroTitle)}</h1><p class="lede">${escapeHtml(article.description)}</p><p class="article-meta">Foundation guide · Beginner friendly · Australian context</p></div></section><article class="article article-wide">${geographyPanel}${grapeRegionPanel}${body}${related}</article></main>`});
  const outputPath = canonicalPath.endsWith('/') ? path.join(root, canonicalPath.slice(1), 'index.html') : path.join(root, canonicalPath.slice(1));
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, html);
  searchEntries.push({title: article.title, description: article.description, url: canonicalPath, text: visibleText(body).slice(0, 100)});
}
for (const [key, section] of Object.entries(sections)) {
  const articles = manifest.articles.filter(article => article.section === key);
  if (key === 'regions') buildRegionsHub(section, articles);
  else if (key === 'grapes') buildGrapesHub(section, articles);
  else if (key === 'winemaking') buildWinemakingHub(section, articles);
  else buildHub(key, section, articles);
}
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
function buildRegionsHub(section, articles) {
  const articlesByRoute = new Map(articles.map(article => [article.route, article]));
  const governed = new Set([...entitiesByRoute.values()].filter(entity => entity.section === 'regions' && entity.geographyKind).map(entity => entity.canonicalArticle));
  const roots = [...entitiesByRoute.values()].filter(entity => entity.section === 'regions' && entity.geographyKind && !parentsById.has(entity.id)).sort((a,b) => a.name.localeCompare(b.name));
  const countryGroups = roots.map(rootEntity => {
    const descendants = geographyDescendants(rootEntity);
    const tree = renderDirectoryChildren(rootEntity) || '<p class="region-country-empty">Country guide available; regional guides are still being classified.</p>';
    return `<details class="region-country" data-region-country open><summary class="region-country-head"><span><span class="kicker">Country</span><strong>${escapeHtml(rootEntity.name)}</strong></span><span>${descendants.length + 1} guides</span></summary><a class="region-country-guide" href="${rootEntity.canonicalArticle}" data-region-item>View ${escapeHtml(rootEntity.name)} guide →</a>${tree}</details>`;
  }).join('');
  const ungrouped = articles.filter(article => !governed.has(article.route)).sort((a,b) => cardTitle(a).localeCompare(cardTitle(b)));
  const otherCards = ungrouped.map(article => `<a class="card guide-card region-more-card" data-region-item data-region-ungrouped href="${article.route}"><div><h2>${escapeHtml(cardTitle(article))}</h2><p>${escapeHtml(article.description)}</p></div><b>Read guide →</b></a>`).join('');
  const body = `<main data-region-directory><section class="page-hero hub-hero"><div class="section"><p class="eyebrow">WineDaddy knowledge base</p><h1>${section.name}</h1><p class="lede">Browse wine geography from country to region, subregion and appellation—or search every regional guide directly.</p><p class="article-count">${articles.length} guides</p></div></section><section class="section region-directory"><label class="guide-filter">Search all region guides<input type="search" data-region-filter placeholder="Try Burgundy, Barossa or Napa…"></label><div class="region-country-grid">${countryGroups}</div><p class="empty-state" data-region-empty hidden>No matching region guides found.</p><section class="region-more"><div class="section-head"><div><p class="eyebrow">Beyond the country trees</p><h2>More regional guides</h2></div><p>These guides remain fully searchable while their geographic relationships await reviewed classification.</p></div><div class="grid guide-grid" data-guide-grid>${otherCards}</div></section></section></main>`;
  const schema = {'@context':'https://schema.org','@type':'CollectionPage',name:section.name,url:`${SITE_URL}/regions/`,description:section.description,hasPart:roots.map(entity => ({'@type':'CollectionPage',name:entity.name,url:`${SITE_URL}${entity.canonicalArticle}`}))};
  fs.mkdirSync(path.join(root, 'regions'), {recursive: true});
  fs.writeFileSync(path.join(root, 'regions', 'index.html'), pageDocument({title: section.name, description: section.description, canonicalPath:'/regions/', schema, body}));
}
function buildGrapesHub(section, articles) {
  const articlesByRoute = new Map(articles.map(article => [article.route, article]));
  const classics = ['what-is-pinot-noir','what-is-shiraz','what-is-chardonnay','what-is-cabernet-sauvignon','what-is-riesling','what-is-sauvignon-blanc'].map(slug => articles.find(article => article.slug === slug)).filter(Boolean);
  const classicCards = classics.map(article => grapeCard(article, 'grape-classic-card')).join('');
  const countryRoots = [...entitiesByRoute.values()].filter(entity => entity.section === 'regions' && entity.geographyKind === 'country' && !parentsById.has(entity.id)).sort((a,b) => a.name.localeCompare(b.name));
  const countryGroups = countryRoots.map(country => {
    const placeIds = new Set([country.id, ...geographyDescendants(country).map(entity => entity.id)]);
    const grapeIds = new Set();
    for (const placeId of placeIds) for (const grapeId of grapesByRegionId.get(placeId) || []) grapeIds.add(grapeId);
    const grapes = [...grapeIds].map(id => entitiesById.get(id)).filter(Boolean).sort((a,b) => grapeEntityName(a).localeCompare(grapeEntityName(b)));
    if (!grapes.length) return '';
    const links = grapes.map(grape => `<a href="${grape.canonicalArticle}" data-grape-item>${escapeHtml(grapeEntityName(grape))}</a>`).join('');
    return `<section class="grape-country" data-grape-country><div class="grape-country-head"><h3><a href="${country.canonicalArticle}">${escapeHtml(country.name)}</a></h3><span>${grapes.length} grapes</span></div><div class="grape-country-links">${links}</div></section>`;
  }).join('');
  const comparisons = articles.filter(article => article.slug.includes('-vs-')).sort((a,b) => grapeDisplayTitle(a).localeCompare(grapeDisplayTitle(b)));
  const comparisonCards = comparisons.map(article => grapeCard(article, 'grape-comparison-card')).join('');
  const alphabet = new Map();
  for (const article of [...articles].sort((a,b) => grapeDisplayTitle(a).localeCompare(grapeDisplayTitle(b)))) {
    const letter = grapeDisplayTitle(article).charAt(0).toLocaleUpperCase('en-AU');
    alphabet.set(letter, [...(alphabet.get(letter) || []), article]);
  }
  const azGroups = [...alphabet].map(([letter, items]) => `<section class="grape-letter" data-grape-letter><h3>${escapeHtml(letter)}</h3><div>${items.map(article => `<a href="${article.route}" data-grape-item data-grape-az>${escapeHtml(grapeDisplayTitle(article))}</a>`).join('')}</div></section>`).join('');
  const body = `<main data-grape-directory><section class="page-hero hub-hero"><div class="section"><p class="eyebrow">WineDaddy knowledge base</p><h1>${section.name}</h1><p class="lede">Start with familiar varieties, explore the grapes associated with major wine countries, compare similar styles, or browse every guide A–Z.</p><p class="article-count">${articles.length} guides</p></div></section><section class="section grape-directory"><label class="guide-filter">Search all grape guides<input type="search" data-grape-filter placeholder="Try Pinot Noir, Furmint or Grenache…"></label><section class="grape-feature"><div class="section-head"><div><p class="eyebrow">Start here</p><h2>Classic grapes</h2></div><p>Six useful reference points for understanding how grape variety shapes wine style.</p></div><div class="grid grape-feature-grid">${classicCards}</div></section><section class="grape-by-country"><div class="section-head"><div><p class="eyebrow">Grape and place</p><h2>Explore by country</h2></div><p>These groupings come from WineDaddy’s reviewed grape–region relationships.</p></div><div class="grape-country-grid">${countryGroups}</div></section><section class="grape-comparisons"><div class="section-head"><div><p class="eyebrow">Side by side</p><h2>Compare grapes</h2></div><p>Direct guides for varieties and styles that are commonly confused.</p></div><div class="grid guide-grid">${comparisonCards}</div></section><section class="grape-az"><div class="section-head"><div><p class="eyebrow">Complete directory</p><h2>All grape guides A–Z</h2></div><p>Every WineDaddy grape guide remains available here.</p></div><div class="grape-alphabet">${azGroups}</div></section><p class="empty-state" data-grape-empty hidden>No matching grape guides found.</p></section></main>`;
  const schema = {'@context':'https://schema.org','@type':'CollectionPage',name:section.name,url:`${SITE_URL}/grapes/`,description:section.description,hasPart:classics.map(article => ({'@type':'Article',name:grapeDisplayTitle(article),url:`${SITE_URL}${article.route}`}))};
  fs.mkdirSync(path.join(root, 'grapes'), {recursive: true});
  fs.writeFileSync(path.join(root, 'grapes', 'index.html'), pageDocument({title:section.name,description:section.description,canonicalPath:'/grapes/',schema,body}));
}
function grapeCard(article, className) { return `<a class="card guide-card ${className}" data-grape-item href="${article.route}"><div><h3>${escapeHtml(grapeDisplayTitle(article))}</h3><p>${escapeHtml(article.description)}</p></div><b>Read guide →</b></a>`; }
function grapeDisplayTitle(article) { return cardTitle(article).replace(/^What is\s+/i, '').replace(/\?$/, ''); }
function grapeEntityName(entity) { return entity.name.replace(/^What is\s+/i, '').replace(/\?$/, ''); }
function buildWinemakingHub(section, articles) {
  const articlesBySlug = new Map(articles.map(article => [article.slug, article]));
  const featured = winemakingNavigation.featured.map(slug => articlesBySlug.get(slug)).filter(Boolean);
  const featuredCards = featured.map(article => processCard(article, 'process-feature-card')).join('');
  const processGroups = winemakingNavigation.groups.map(group => {
    const guides = group.slugs.map(slug => articlesBySlug.get(slug)).filter(Boolean).sort((a,b) => processDisplayTitle(a).localeCompare(processDisplayTitle(b)));
    return `<details class="process-group" data-process-group open><summary><span><span class="kicker">Production stage</span><strong>${escapeHtml(group.name)}</strong></span><span>${guides.length} guides</span></summary><p>${escapeHtml(group.description)}</p><div class="process-links">${guides.map(article => `<a href="${article.route}" data-process-item>${escapeHtml(processDisplayTitle(article))}</a>`).join('')}</div></details>`;
  }).join('');
  const alphabet = new Map();
  for (const article of [...articles].sort((a,b) => processDisplayTitle(a).localeCompare(processDisplayTitle(b)))) {
    const letter = processDisplayTitle(article).charAt(0).toLocaleUpperCase('en-AU');
    alphabet.set(letter, [...(alphabet.get(letter) || []), article]);
  }
  const azGroups = [...alphabet].map(([letter, items]) => `<section class="process-letter" data-process-letter><h3>${escapeHtml(letter)}</h3><div>${items.map(article => `<a href="${article.route}" data-process-item data-process-az>${escapeHtml(processDisplayTitle(article))}</a>`).join('')}</div></section>`).join('');
  const body = `<main data-winemaking-directory><section class="page-hero hub-hero"><div class="section"><p class="eyebrow">WineDaddy knowledge base</p><h1>${section.name}</h1><p class="lede">Follow wine from the vineyard through extraction, fermentation, maturation and finishing—or find any production guide directly.</p><p class="article-count">${articles.length} guides</p></div></section><section class="section process-directory"><label class="guide-filter">Search all winemaking guides<input type="search" data-process-filter placeholder="Try fermentation, oak or sparkling…"></label><section class="process-feature"><div class="section-head"><div><p class="eyebrow">Start here</p><h2>How wine takes shape</h2></div><p>Six foundation guides covering the decisions that most clearly change what ends up in the glass.</p></div><div class="grid process-feature-grid">${featuredCards}</div></section><section class="process-stages"><div class="section-head"><div><p class="eyebrow">From vine to bottle</p><h2>Explore by process</h2></div><p>Curated pathways through the major stages and techniques of wine production.</p></div><div class="process-group-grid">${processGroups}</div></section><section class="process-az"><div class="section-head"><div><p class="eyebrow">Complete directory</p><h2>All winemaking guides A–Z</h2></div><p>Every WineDaddy winemaking guide remains available here.</p></div><div class="process-alphabet">${azGroups}</div></section><p class="empty-state" data-process-empty hidden>No matching winemaking guides found.</p></section></main>`;
  const schema = {'@context':'https://schema.org','@type':'CollectionPage',name:section.name,url:`${SITE_URL}/winemaking/`,description:section.description,hasPart:winemakingNavigation.groups.map(group => ({'@type':'CollectionPage',name:group.name}))};
  fs.mkdirSync(path.join(root, 'winemaking'), {recursive: true});
  fs.writeFileSync(path.join(root, 'winemaking', 'index.html'), pageDocument({title:section.name,description:section.description,canonicalPath:'/winemaking/',schema,body}));
}
function processCard(article, className) { return `<a class="card guide-card ${className}" data-process-item href="${article.route}"><div><h3>${escapeHtml(processDisplayTitle(article))}</h3><p>${escapeHtml(article.description)}</p></div><b>Read guide →</b></a>`; }
function processDisplayTitle(article) { return cardTitle(article).replace(/^What (?:is|are|does)\s+/i, '').replace(/\?$/, ''); }
function geographyDescendants(entity) {
  const descendants = [];
  for (const childId of childrenById.get(entity.id) || []) {
    const child = entitiesById.get(childId);
    if (!child) continue;
    descendants.push(child, ...geographyDescendants(child));
  }
  return descendants;
}
function renderDirectoryChildren(entity) {
  const children = (childrenById.get(entity.id) || []).map(id => entitiesById.get(id)).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name));
  if (!children.length) return '';
  return `<ul class="region-tree">${children.map(child => `<li><a href="${child.canonicalArticle}" data-region-item>${escapeHtml(child.name)}</a>${renderDirectoryChildren(child)}</li>`).join('')}</ul>`;
}
function breadcrumbSchema(article, section, geography) {
  const entries = [{name:'Home',route:'/'},{name:section.name,route:`/${article.section}/`}];
  if (geography) for (const entity of geography.ancestors) entries.push({name:entity.name,route:entity.canonicalArticle});
  entries.push({name:geography?.entity.name || article.title,route:article.route});
  return {'@type':'BreadcrumbList',itemListElement:entries.map((entry,index) => ({'@type':'ListItem',position:index + 1,name:entry.name,item:`${SITE_URL}${entry.route}`}))};
}
function buildSitemap(articles) { const staticPaths = ['/', '/fundamentals/', '/grapes/', '/regions/', '/winemaking/', '/about.html', '/contact.html', '/privacy.html', '/search.html']; const urls = [...staticPaths, ...articles.map(article => article.route)]; const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(route => `  <url><loc>${SITE_URL}${route}</loc></url>`).join('\n')}\n</urlset>\n`; fs.writeFileSync(path.join(root, 'sitemap.xml'), xml); }
function refreshStaticHeaders() { for (const file of ['index.html', 'about.html', 'contact.html', 'privacy.html', 'search.html']) { const target = path.join(root, file); let html = fs.readFileSync(target, 'utf8'); if (!/<header class="site-header">[\s\S]*?<\/header>/.test(html)) throw new Error(`${file}: shared header missing`); html = html.replace(/<header class="site-header">[\s\S]*?<\/header>/, siteHeader()).replace(/\/assets\/styles\.css\?v=[^"]+/, '/assets/styles.css?v=20260911-3').replace(/\/assets\/script\.js\?v=[^"]+/, '/assets/script.js?v=20260911-3'); if (!html.includes('href="/favicon.ico"')) html = html.replace('<meta name="viewport" content="width=device-width,initial-scale=1">', `<meta name="viewport" content="width=device-width,initial-scale=1">${faviconHead()}`); if (file === 'search.html' && !/<script type="application\/ld\+json">/.test(html)) { const schema = JSON.stringify({'@context':'https://schema.org','@type':'SearchResultsPage',name:'Search WineDaddy',url:`${SITE_URL}/search.html`}); html = html.replace('</head>', `<script type="application/ld+json">${schema}</script></head>`); } fs.writeFileSync(target, html); } }
function visibleText(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
function renderRecommendations(items) { if (!items?.length) return ''; const cards = items.map(item => `<a class="graph-related-card" data-graph-related href="${item.route}"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><b>Read guide →</b></a>`).join(''); return `<aside class="graph-related" aria-labelledby="explore-next-title"><p class="kicker">Related WineDaddy guides</p><h2 id="explore-next-title">Explore next</h2><div class="graph-related-grid">${cards}</div></aside>`; }
function renderGrapeRegions(entity) {
  if (!entity) return '';
  const regionIds = regionsByGrapeId.get(entity.id) || [];
  const grapeIds = grapesByRegionId.get(entity.id) || [];
  const related = (regionIds.length ? regionIds : grapeIds).map(id => entitiesById.get(id)).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name));
  if (!related.length) return '';
  const title = regionIds.length ? 'Wine regions for this grape' : 'Grapes associated with this region';
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
  if (kinds.size === 1 && kinds.has('wine_subregion')) return 'Explore wine subregions';
  if (kinds.size === 1 && kinds.has('appellation')) return 'Explore appellations';
  if (kinds.size === 1 && kinds.has('state_or_territory')) return 'Explore states and territories';
  return 'Explore within this place';
}
function placeSchema(model) {
  let containedInPlace;
  for (const entity of model.ancestors) containedInPlace = {'@type':'Place',name:entity.name,url:`${SITE_URL}${entity.canonicalArticle}`,...(containedInPlace ? {containedInPlace} : {})};
  return {'@type':'Place',name:model.entity.name,url:`${SITE_URL}${model.entity.canonicalArticle}`,...(containedInPlace ? {containedInPlace} : {})};
}
