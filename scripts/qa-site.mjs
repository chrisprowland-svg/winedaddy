import fs from 'node:fs';
import path from 'node:path';
import {cardTitle, escapeHtml, faviconHead, siteHeader} from '../site/site.mjs';
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/articles.json'), 'utf8'));
const entityRegistry = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/entities.json'), 'utf8'));
const relationshipRegistry = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/relationships.json'), 'utf8'));
const recommendationRegistry = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/recommendations.json'), 'utf8'));
const fundamentalsNavigation = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/fundamentals-navigation.json'), 'utf8'));
const grapeNavigation = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/grape-navigation.json'), 'utf8'));
const errors = [];
const alphabetical = new Intl.Collator('en-AU', {sensitivity: 'base', ignorePunctuation: true, numeric: true});
function expectAlphabetical(items, label) {
  for (let index = 1; index < items.length; index += 1) if (alphabetical.compare(items[index - 1], items[index]) > 0) errors.push(`${label} is not alphabetical: ${items[index - 1]} before ${items[index]}`);
}
function textMatches(html, pattern) { return [...html.matchAll(pattern)].map(match => match[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')); }
function capitaliseDisplayTitle(value) { return value.replace(/^(\P{L}*)(\p{L})/u, (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase('en-AU')}`); }
function expectInitialCapital(items, label) { for (const item of items) if (item !== capitaliseDisplayTitle(item)) errors.push(`${label} starts lowercase: ${item}`); }
const header = siteHeader();
for (const route of ['/fundamentals/', '/grapes/', '/regions/', '/winemaking/', '/search.html']) if (!header.includes(`href="${route}"`)) errors.push(`header navigation missing ${route}`);
for (const anchor of ['classic-grapes','red-grape-varieties','white-grape-varieties','grapes-in-australia','compare-grapes','grapes-by-country','all-grape-guides']) if (!header.includes(`href="/grapes/#${anchor}"`)) errors.push(`grape submenu missing #${anchor}`);
for (const route of ['/australian-wine-regions/', '/new-south-wales-wine-regions/', '/victorian-wine-regions/', '/south-australian-wine-regions/', '/western-australian-wine-regions/', '/queensland-wine-regions/', '/tasmania-wine-region/', '/australian-capital-territory-wine-regions/']) if (!header.includes(`href="${route}"`)) errors.push(`region submenu missing ${route}`);
for (const route of ['/france/', '/burgundy/', '/bordeaux/', '/champagne/', '/rhone-valley/', '/loire-valley/', '/alsace/']) if (!header.includes(`href="${route}"`)) errors.push(`French region submenu missing ${route}`);
for (const route of ['/italy/', '/piedmont/', '/tuscany/', '/veneto/', '/sicily/', '/campania/', '/puglia/']) if (!header.includes(`href="${route}"`)) errors.push(`Italian region submenu missing ${route}`);
for (const route of ['/spain/', '/rioja/', '/ribera-del-duero/', '/priorat/', '/rias-baixas/', '/rueda/', '/jerez/']) if (!header.includes(`href="${route}"`)) errors.push(`Spanish region submenu missing ${route}`);
for (const route of ['/germany/', '/mosel/', '/rheingau/', '/pfalz/', '/baden/', '/ahr-wine-region/', '/austria/', '/wachau/', '/kamptal/', '/burgenland/', '/styria-wine-region/']) if (!header.includes(`href="${route}"`)) errors.push(`German/Austrian region submenu missing ${route}`);
for (const route of ['/portugal/', '/douro-valley/', '/vinho-verde/', '/alentejo-wine-region/', '/dao-wine-region/', '/bairrada-wine-region/', '/lisboa-wine-region/']) if (!header.includes(`href="${route}"`)) errors.push(`Portuguese region submenu missing ${route}`);
for (const route of ['/new-zealand/', '/marlborough/', '/central-otago/', '/hawkes-bay/', '/martinborough/', '/south-africa/', '/stellenbosch/', '/swartland/', '/walker-bay/', '/argentina/', '/salta-wine-region/', '/uco-valley/', '/cafayate-wine-region/', '/chile/', '/maipo-valley/', '/colchagua-valley/', '/casablanca-valley/', '/leyda-valley/']) if (!header.includes(`href="${route}"`)) errors.push(`Southern Hemisphere region submenu missing ${route}`);
for (const route of ['/united-states/', '/napa-valley/', '/sonoma-coast/', '/santa-barbara-county-wine/', '/paso-robles/', '/willamette-valley/', '/finger-lakes-wine-region/', '/greece/', '/santorini-wine-region/', '/nemea-wine-region/', '/naoussa-wine-region/', '/hungary/', '/tokaj-wine-region/', '/eger-wine-region/', '/georgia/', '/england/']) if (!header.includes(`href="${route}"`)) errors.push(`North American/emerging European region submenu missing ${route}`);
if ((header.match(/class="nav-region-group"/g) || []).length !== 18 || !header.includes('class="nav-dropdown nav-mega"')) errors.push('desktop Regions mega-menu structure missing');
const regionMenu = header.match(/<div class="nav-mega-grid">([\s\S]*?)<\/div><\/div><\/details>/)?.[1] || '';
const regionMenuCountries = textMatches(regionMenu, /class="nav-feature"[^>]*>(.*?)<\/a>/g);
expectAlphabetical(regionMenuCountries, 'Regions menu countries');
expectInitialCapital(regionMenuCountries, 'Regions menu country');
for (const group of regionMenu.matchAll(/<section class="nav-region-group">([\s\S]*?)<\/section>/g)) { const links = textMatches(group[1].replace(/<a class="nav-feature"[\s\S]*?<\/a><span>[\s\S]*?<\/span>/, ''), /<a[^>]*>(.*?)<\/a>/g); expectAlphabetical(links, 'Regions menu links'); expectInitialCapital(links, 'Regions menu link'); }
if (header.includes('href="/about.html"')) errors.push('About must remain footer-only');
for (const file of ['index.html', 'about.html', 'contact.html', 'privacy.html', 'search.html']) { const html = fs.readFileSync(path.join(root, file), 'utf8'); if (!html.includes(header)) errors.push(`${file}: shared header is stale`); if (!html.includes(faviconHead())) errors.push(`${file}: favicon metadata is stale`); }
for (const file of ['favicon.ico', 'favicon.svg', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png', 'site.webmanifest']) if (!fs.existsSync(path.join(root, file))) errors.push(`favicon asset missing: ${file}`);
const servingWorker = fs.readFileSync(path.join(root, '_worker.js'), 'utf8');
if (/const primaryNav = '[^']*\/about\.html/.test(servingWorker)) errors.push('serving Worker reintroduces About into the primary navigation');
if (!servingWorker.includes('geography-panel|entity-links|learning-path-panel|grape-path-panel')) errors.push('serving Worker can strip knowledge-graph relationship panels');
if (servingWorker.includes('expandedPrimaryNav') || servingWorker.includes('const primaryNav')) errors.push('serving Worker must not override build-generated navigation');
const staticRoutes = ['/', '/fundamentals/', '/grapes/', '/regions/', '/winemaking/', '/about.html', '/contact.html', '/privacy.html', '/search.html'];
const expectedRoutes = new Set([...staticRoutes, ...manifest.articles.map(article => article.route)]);
const entityIds = new Set(entityRegistry.entities.map(entity => entity.id));
const allowedPredicates = new Set(['editorially_related_to', 'member_of', 'member_of_path', 'has_learning_guide', 'member_of_grape_path', 'has_grape_guide', 'same_as_grape', 'about_grape', 'recommended_next', 'located_in', 'contains', 'grown_in', 'known_for', 'about_place', 'has_regional_guide']);
if (entityIds.size !== entityRegistry.entities.length) errors.push('entity registry contains duplicate IDs');
const expectedEntityCount = manifest.articles.length + 4 + fundamentalsNavigation.groups.length + grapeNavigation.groups.length;
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
const fundamentalsArticles = manifest.articles.filter(article => article.section === 'fundamentals');
const fundamentalsBySlug = new Map(fundamentalsArticles.map(article => [article.slug, article]));
const classifiedFundamentals = fundamentalsNavigation.groups.flatMap(group => group.slugs);
if (fundamentalsNavigation.groups.length !== 10) errors.push(`fundamentals taxonomy expected 10 learning paths; found ${fundamentalsNavigation.groups.length}`);
if (classifiedFundamentals.length !== fundamentalsArticles.length || new Set(classifiedFundamentals).size !== fundamentalsArticles.length) errors.push(`fundamentals taxonomy expected exactly one classification for ${fundamentalsArticles.length} guides`);
const fundamentalsHub = fs.readFileSync(path.join(root, 'fundamentals', 'index.html'), 'utf8');
if (!fundamentalsHub.includes('data-fundamentals-directory')) errors.push('fundamentals hub is not using the learning-path directory');
if ((fundamentalsHub.match(/data-fundamentals-group/g) || []).length !== fundamentalsNavigation.groups.length || /data-fundamentals-group open/.test(fundamentalsHub)) errors.push('fundamentals learning paths must all load collapsed');
for (const group of fundamentalsNavigation.groups) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(group.id) || !group.name || !group.description || !group.start) errors.push(`fundamentals learning path metadata is incomplete: ${group.id}`);
  if (!group.slugs.includes(group.start)) errors.push(`fundamentals learning path start guide is not a member: ${group.id} -> ${group.start}`);
  const pathEntity = entityRegistry.entities.find(entity => entity.id === `wd:learning_path:${group.id}`);
  if (!pathEntity || pathEntity.canonicalArticle !== `/fundamentals/#${group.id}`) errors.push(`fundamentals learning path entity missing: ${group.id}`);
  const groupHtml = fundamentalsHub.match(new RegExp(`<details class="fundamentals-group" id="${group.id}"[\\s\\S]*?<div class="fundamentals-links">([\\s\\S]*?)<\\/div><\\/details>`))?.[1] || '';
  const titles = textMatches(groupHtml, /data-fundamentals-item>(.*?)<\/a>/g);
  for (const slug of group.slugs) {
    const article = fundamentalsBySlug.get(slug);
    if (!article) { errors.push(`fundamentals learning path guide missing: ${group.id} -> ${slug}`); continue; }
    const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === article.route);
    if (!relationshipRegistry.relationships.some(item => item.from === entity?.id && item.predicate === 'member_of_path' && item.to === pathEntity?.id)) errors.push(`fundamentals learning-path relationship missing: ${slug} -> ${group.id}`);
    if (!relationshipRegistry.relationships.some(item => item.from === pathEntity?.id && item.predicate === 'has_learning_guide' && item.to === entity?.id)) errors.push(`fundamentals learning-path inverse missing: ${group.id} -> ${slug}`);
    if (!fundamentalsHub.includes(`href="${article.route}" data-fundamentals-item`)) errors.push(`fundamentals guide missing from directory: ${slug}`);
    const page = fs.readFileSync(path.join(root, slug, 'index.html'), 'utf8');
    if (!page.includes('data-learning-path') || !page.includes(`/fundamentals/#${group.id}`)) errors.push(`fundamentals learning-path context missing: ${slug}`);
  }
  expectAlphabetical(titles, `${group.name} guides`);
  expectInitialCapital(titles, `${group.name} guide`);
}
const unclassifiedFundamentals = fundamentalsArticles.filter(article => !classifiedFundamentals.includes(article.slug));
if (unclassifiedFundamentals.length) errors.push(`unclassified fundamentals guides: ${unclassifiedFundamentals.map(article => article.slug).join(', ')}`);
const clientFundamentalsScript = fs.readFileSync(path.join(root, 'assets', 'script.js'), 'utf8');
if (!clientFundamentalsScript.includes("querySelector('[data-fundamentals-filter]')") || !clientFundamentalsScript.includes('group.open = Boolean(query) ? hasMatch')) errors.push('fundamentals learning-path search behaviour missing');
const governedGrapeArticles = manifest.articles.filter(article => article.section === 'grapes');
const grapeBySlug = new Map(governedGrapeArticles.map(article => [article.slug, article]));
const classifiedGrapes = grapeNavigation.groups.flatMap(group => group.slugs);
if (grapeNavigation.groups.length !== 6) errors.push(`grape taxonomy expected 6 pathways; found ${grapeNavigation.groups.length}`);
if (classifiedGrapes.length !== governedGrapeArticles.length || new Set(classifiedGrapes).size !== governedGrapeArticles.length) errors.push(`grape taxonomy expected exactly one classification for ${governedGrapeArticles.length} guides`);
const grapeHub = fs.readFileSync(path.join(root, 'grapes', 'index.html'), 'utf8');
if (!grapeHub.includes('data-grape-directory')) errors.push('grape hub is not using the governed directory');
if ((grapeHub.match(/data-grape-path/g) || []).length !== grapeNavigation.groups.length || /data-grape-path open/.test(grapeHub)) errors.push('grape pathways must all load collapsed');
if (/data-grape-directory-section open/.test(grapeHub) || /data-grape-country open/.test(grapeHub)) errors.push('secondary grape directories must load collapsed');
for (const group of grapeNavigation.groups) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(group.id) || !group.name || !group.description || !group.start) errors.push(`grape pathway metadata is incomplete: ${group.id}`);
  if (!group.slugs.includes(group.start)) errors.push(`grape pathway start guide is not a member: ${group.id} -> ${group.start}`);
  const pathEntity = entityRegistry.entities.find(entity => entity.id === `wd:grape_path:${group.id}`);
  if (!pathEntity || pathEntity.canonicalArticle !== `/grapes/#${group.id}`) errors.push(`grape pathway entity missing: ${group.id}`);
  const groupHtml = grapeHub.match(new RegExp(`<details class="grape-path" id="${group.id}"[\\s\\S]*?<div class="grape-path-links">([\\s\\S]*?)<\\/div><\\/details>`))?.[1] || '';
  const titles = textMatches(groupHtml, /data-grape-item>(.*?)<\/a>/g);
  for (const slug of group.slugs) {
    const article = grapeBySlug.get(slug);
    if (!article) { errors.push(`grape pathway guide missing: ${group.id} -> ${slug}`); continue; }
    const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === article.route);
    if (!relationshipRegistry.relationships.some(item => item.from === entity?.id && item.predicate === 'member_of_grape_path' && item.to === pathEntity?.id)) errors.push(`grape-path relationship missing: ${slug} -> ${group.id}`);
    if (!relationshipRegistry.relationships.some(item => item.from === pathEntity?.id && item.predicate === 'has_grape_guide' && item.to === entity?.id)) errors.push(`grape-path inverse missing: ${group.id} -> ${slug}`);
    if (!grapeHub.includes(`href="${article.route}" data-grape-item`)) errors.push(`grape guide missing from directory: ${slug}`);
    const page = fs.readFileSync(path.join(root, slug, 'index.html'), 'utf8');
    if (!page.includes('data-grape-path-context') || !page.includes(`/grapes/#${group.id}`)) errors.push(`grape pathway context missing: ${slug}`);
  }
  expectAlphabetical(titles, `${group.name} guides`);
  expectInitialCapital(titles, `${group.name} guide`);
}
for (const alias of grapeNavigation.aliases) {
  const canonical = grapeBySlug.get(alias.canonicalSlug);
  const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === canonical?.route);
  if (!canonical || !entity || JSON.stringify(entity.alternateName) !== JSON.stringify(alias.aliases)) errors.push(`grape alias metadata missing: ${alias.canonicalSlug}`);
  for (const relatedSlug of alias.relatedSlugs) {
    const related = grapeBySlug.get(relatedSlug);
    const relatedEntity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === related?.route);
    const expectedPredicate = relatedSlug.includes('-vs-') ? 'about_grape' : 'same_as_grape';
    if (!relationshipRegistry.relationships.some(item => item.from === relatedEntity?.id && item.predicate === expectedPredicate && item.to === entity?.id)) errors.push(`grape alias relationship missing: ${relatedSlug} -> ${alias.canonicalSlug}`);
    if (relatedSlug.includes('-vs-') && relationshipRegistry.relationships.some(item => item.from === relatedEntity?.id && item.predicate === 'same_as_grape')) errors.push(`comparison article must not be equated with a grape profile: ${relatedSlug}`);
  }
}
for (const facet of ['pinkSkinned','aromatic','sparkling','fortified','blendingFamilies']) if (!grapeNavigation.facets?.[facet]?.length) errors.push(`grape facet missing: ${facet}`);
const clientGrapeScript = fs.readFileSync(path.join(root, 'assets', 'script.js'), 'utf8');
if (!clientGrapeScript.includes("querySelector('[data-grape-filter]')") || !clientGrapeScript.includes('path.open = Boolean(query) ? hasMatch')) errors.push('grape pathway search behaviour missing');
const geography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/australian-geography.json'), 'utf8'));
const franceGeography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/france-geography.json'), 'utf8'));
const italyGeography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/italy-geography.json'), 'utf8'));
const spainGeography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/spain-geography.json'), 'utf8'));
const germanAustrianGeography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/germany-austria-geography.json'), 'utf8'));
const portugalGeography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/portugal-geography.json'), 'utf8'));
const newZealandGeography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/new-zealand-geography.json'), 'utf8'));
const southAfricaGeography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/south-africa-geography.json'), 'utf8'));
const argentinaChileGeography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/argentina-chile-geography.json'), 'utf8'));
const unitedStatesGeography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/united-states-geography.json'), 'utf8'));
const emergingEuropeGeography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/emerging-europe-geography.json'), 'utf8'));
const canadaBrazilGeography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/canada-brazil-geography.json'), 'utf8'));
const regionTopics = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/region-topics.json'), 'utf8'));
const regionTaxonomyMigrations = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/region-taxonomy-migrations.json'), 'utf8'));
const geographySlugs = new Set();
if (geography.places.length < 80) errors.push(`Australian geography hierarchy expected at least 80 places; found ${geography.places.length}`);
for (const place of geography.places) {
  if (geographySlugs.has(place.slug)) errors.push(`duplicate geography slug: ${place.slug}`);
  geographySlugs.add(place.slug);
  const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.slug}/`);
  if (!entity) { errors.push(`geography entity missing: ${place.slug}`); continue; }
  if (entity.geographyKind !== place.kind) errors.push(`geography kind missing: ${place.slug}`);
  const renderedPage = fs.readFileSync(path.join(root, place.slug, 'index.html'), 'utf8');
  if (!renderedPage.includes('data-geography-hierarchy')) errors.push(`geography hierarchy not rendered: ${place.slug}`);
  if (renderedPage.includes('Knowledge Graph v2')) errors.push(`internal Knowledge Graph version leaked to reader: ${place.slug}`);
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
if (franceGeography.places.length < 50) errors.push(`French geography hierarchy expected at least 50 places; found ${franceGeography.places.length}`);
const franceSlugs = new Set();
for (const place of franceGeography.places) {
  if (franceSlugs.has(place.slug)) errors.push(`duplicate French geography slug: ${place.slug}`);
  franceSlugs.add(place.slug);
  const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.slug}/`);
  if (!entity) { errors.push(`French geography entity missing: ${place.slug}`); continue; }
  if (entity.geographyKind !== place.kind) errors.push(`French geography kind missing: ${place.slug}`);
  const renderedPage = fs.readFileSync(path.join(root, place.slug, 'index.html'), 'utf8');
  if (!renderedPage.includes('data-geography-hierarchy')) errors.push(`French geography hierarchy not rendered: ${place.slug}`);
  if (renderedPage.includes('Knowledge Graph v2')) errors.push(`internal Knowledge Graph version leaked to reader: ${place.slug}`);
  if (!place.parent) continue;
  const parent = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.parent}/`);
  const forward = relationshipRegistry.relationships.some(item => item.from === entity.id && item.predicate === 'located_in' && item.to === parent?.id);
  const inverse = relationshipRegistry.relationships.some(item => item.from === parent?.id && item.predicate === 'contains' && item.to === entity.id);
  if (!forward || !inverse) errors.push(`French geography relationship pair missing: ${place.slug} -> ${place.parent}`);
}
if (italyGeography.places.length < 50) errors.push(`Italian geography hierarchy expected at least 50 places; found ${italyGeography.places.length}`);
const italySlugs = new Set();
for (const place of italyGeography.places) {
  if (italySlugs.has(place.slug)) errors.push(`duplicate Italian geography slug: ${place.slug}`);
  italySlugs.add(place.slug);
  const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.slug}/`);
  if (!entity) { errors.push(`Italian geography entity missing: ${place.slug}`); continue; }
  if (entity.geographyKind !== place.kind) errors.push(`Italian geography kind missing: ${place.slug}`);
  const renderedPage = fs.readFileSync(path.join(root, place.slug, 'index.html'), 'utf8');
  if (!renderedPage.includes('data-geography-hierarchy')) errors.push(`Italian geography hierarchy not rendered: ${place.slug}`);
  if (renderedPage.includes('Knowledge Graph v2')) errors.push(`internal Knowledge Graph version leaked to reader: ${place.slug}`);
  if (!place.parent) continue;
  const parent = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.parent}/`);
  const forward = relationshipRegistry.relationships.some(item => item.from === entity.id && item.predicate === 'located_in' && item.to === parent?.id);
  const inverse = relationshipRegistry.relationships.some(item => item.from === parent?.id && item.predicate === 'contains' && item.to === entity.id);
  if (!forward || !inverse) errors.push(`Italian geography relationship pair missing: ${place.slug} -> ${place.parent}`);
}
if (spainGeography.places.length < 25) errors.push(`Spanish geography hierarchy expected at least 25 places; found ${spainGeography.places.length}`);
const spainSlugs = new Set();
for (const place of spainGeography.places) {
  if (spainSlugs.has(place.slug)) errors.push(`duplicate Spanish geography slug: ${place.slug}`);
  spainSlugs.add(place.slug);
  const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.slug}/`);
  if (!entity) { errors.push(`Spanish geography entity missing: ${place.slug}`); continue; }
  if (entity.geographyKind !== place.kind) errors.push(`Spanish geography kind missing: ${place.slug}`);
  const renderedPage = fs.readFileSync(path.join(root, place.slug, 'index.html'), 'utf8');
  if (!renderedPage.includes('data-geography-hierarchy')) errors.push(`Spanish geography hierarchy not rendered: ${place.slug}`);
  if (renderedPage.includes('Knowledge Graph v2')) errors.push(`internal Knowledge Graph version leaked to reader: ${place.slug}`);
  if (!place.parent) continue;
  const parent = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.parent}/`);
  const forward = relationshipRegistry.relationships.some(item => item.from === entity.id && item.predicate === 'located_in' && item.to === parent?.id);
  const inverse = relationshipRegistry.relationships.some(item => item.from === parent?.id && item.predicate === 'contains' && item.to === entity.id);
  if (!forward || !inverse) errors.push(`Spanish geography relationship pair missing: ${place.slug} -> ${place.parent}`);
}
if (germanAustrianGeography.places.length < 19) errors.push(`German/Austrian geography hierarchy expected at least 19 places; found ${germanAustrianGeography.places.length}`);
const germanAustrianSlugs = new Set();
for (const place of germanAustrianGeography.places) {
  if (germanAustrianSlugs.has(place.slug)) errors.push(`duplicate German/Austrian geography slug: ${place.slug}`);
  germanAustrianSlugs.add(place.slug);
  const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.slug}/`);
  if (!entity) { errors.push(`German/Austrian geography entity missing: ${place.slug}`); continue; }
  if (entity.geographyKind !== place.kind) errors.push(`German/Austrian geography kind missing: ${place.slug}`);
  const renderedPage = fs.readFileSync(path.join(root, place.slug, 'index.html'), 'utf8');
  if (!renderedPage.includes('data-geography-hierarchy')) errors.push(`German/Austrian geography hierarchy not rendered: ${place.slug}`);
  if (renderedPage.includes('Knowledge Graph v2')) errors.push(`internal Knowledge Graph version leaked to reader: ${place.slug}`);
  if (!place.parent) continue;
  const parent = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.parent}/`);
  const forward = relationshipRegistry.relationships.some(item => item.from === entity.id && item.predicate === 'located_in' && item.to === parent?.id);
  const inverse = relationshipRegistry.relationships.some(item => item.from === parent?.id && item.predicate === 'contains' && item.to === entity.id);
  if (!forward || !inverse) errors.push(`German/Austrian geography relationship pair missing: ${place.slug} -> ${place.parent}`);
}
if (portugalGeography.places.length < 8) errors.push(`Portuguese geography hierarchy expected at least 8 places; found ${portugalGeography.places.length}`);
const portugalSlugs = new Set();
for (const place of portugalGeography.places) {
  if (portugalSlugs.has(place.slug)) errors.push(`duplicate Portuguese geography slug: ${place.slug}`);
  portugalSlugs.add(place.slug);
  const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.slug}/`);
  if (!entity) { errors.push(`Portuguese geography entity missing: ${place.slug}`); continue; }
  if (entity.geographyKind !== place.kind) errors.push(`Portuguese geography kind missing: ${place.slug}`);
  const renderedPage = fs.readFileSync(path.join(root, place.slug, 'index.html'), 'utf8');
  if (!renderedPage.includes('data-geography-hierarchy')) errors.push(`Portuguese geography hierarchy not rendered: ${place.slug}`);
  if (renderedPage.includes('Knowledge Graph v2')) errors.push(`internal Knowledge Graph version leaked to reader: ${place.slug}`);
  if (!place.parent) continue;
  const parent = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.parent}/`);
  const forward = relationshipRegistry.relationships.some(item => item.from === entity.id && item.predicate === 'located_in' && item.to === parent?.id);
  const inverse = relationshipRegistry.relationships.some(item => item.from === parent?.id && item.predicate === 'contains' && item.to === entity.id);
  if (!forward || !inverse) errors.push(`Portuguese geography relationship pair missing: ${place.slug} -> ${place.parent}`);
}
for (const [label, geographySet, minimum] of [['New Zealand', newZealandGeography, 12], ['South African', southAfricaGeography, 7], ['Argentine/Chilean', argentinaChileGeography, 12], ['United States', unitedStatesGeography, 17], ['Emerging European', emergingEuropeGeography, 9], ['Canadian/Brazilian', canadaBrazilGeography, 5]]) {
  const slugs = new Set();
  for (const place of geographySet.places) {
    if (slugs.has(place.slug)) errors.push(`duplicate ${label} geography slug: ${place.slug}`);
    slugs.add(place.slug);
    const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.slug}/`);
    if (!entity) { errors.push(`${label} geography entity missing: ${place.slug}`); continue; }
    if (entity.geographyKind !== place.kind) errors.push(`${label} geography kind missing: ${place.slug}`);
    const renderedPage = fs.readFileSync(path.join(root, place.slug, 'index.html'), 'utf8');
    if (!renderedPage.includes('data-geography-hierarchy')) errors.push(`${label} geography hierarchy not rendered: ${place.slug}`);
    if (renderedPage.includes('Knowledge Graph v2')) errors.push(`internal Knowledge Graph version leaked to reader: ${place.slug}`);
    if (!place.parent) continue;
    const parent = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${place.parent}/`);
    const forward = relationshipRegistry.relationships.some(item => item.from === entity.id && item.predicate === 'located_in' && item.to === parent?.id);
    const inverse = relationshipRegistry.relationships.some(item => item.from === parent?.id && item.predicate === 'contains' && item.to === entity.id);
    if (!forward || !inverse) errors.push(`${label} geography relationship pair missing: ${place.slug} -> ${place.parent}`);
  }
}
const allGeographyPlaces = [geography, franceGeography, italyGeography, spainGeography, germanAustrianGeography, portugalGeography, newZealandGeography, southAfricaGeography, argentinaChileGeography, unitedStatesGeography, emergingEuropeGeography, canadaBrazilGeography].flatMap(set => set.places);
const geographyPlaceBySlug = new Map(allGeographyPlaces.map(place => [place.slug, place]));
for (const place of allGeographyPlaces) {
  const chain = [];
  const seen = new Set();
  let current = place;
  while (current) {
    if (seen.has(current.slug)) { errors.push(`geography breadcrumb cycle: ${place.slug}`); break; }
    seen.add(current.slug);
    chain.unshift(current);
    current = current.parent ? geographyPlaceBySlug.get(current.parent) : null;
  }
  const renderedPage = fs.readFileSync(path.join(root, place.slug, 'index.html'), 'utf8');
  let previousIndex = -1;
  for (const item of chain) {
    const marker = `"item":"https://winedaddy.com.au/${item.slug}/"`;
    const index = renderedPage.indexOf(marker, previousIndex + 1);
    if (index < 0) errors.push(`geographic BreadcrumbList item missing: ${place.slug} -> ${item.slug}`);
    else if (index < previousIndex) errors.push(`geographic BreadcrumbList order incorrect: ${place.slug}`);
    previousIndex = index;
  }
}
const regionsHub = fs.readFileSync(path.join(root, 'regions', 'index.html'), 'utf8');
if (/await reviewed classification|geographic relationships await/i.test(regionsHub)) errors.push('regions hub leaks internal classification workflow');
if (!regionsHub.includes('data-region-directory')) errors.push('regions hub is not using the governed directory');
const geographicCountryCount = allGeographyPlaces.filter(place => place.kind === 'country' && !place.parent).length;
if ((regionsHub.match(/data-region-country/g) || []).length !== geographicCountryCount) errors.push(`regions directory expected ${geographicCountryCount} country groups`);
if ((regionsHub.match(/<details class="region-country" data-region-country>/g) || []).length !== geographicCountryCount || /data-region-country open/.test(regionsHub)) errors.push('regions directory country groups must load collapsed');
const governedRegionRoutes = new Set(allGeographyPlaces.map(place => `/${place.slug}/`));
for (const topic of regionTopics.topics) {
  governedRegionRoutes.add(`/${topic.slug}/`);
  const entity = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${topic.slug}/`);
  const parent = entityRegistry.entities.find(candidate => candidate.canonicalArticle === `/${topic.parent}/`);
  if (!entity || entity.geographyKind) errors.push(`regional topic must be a non-place entity: ${topic.slug}`);
  if (!parent?.geographyKind) errors.push(`regional topic parent missing: ${topic.slug} -> ${topic.parent}`);
  if (!relationshipRegistry.relationships.some(item => item.from === entity?.id && item.predicate === 'about_place' && item.to === parent?.id)) errors.push(`regional topic relationship missing: ${topic.slug} -> ${topic.parent}`);
  if (!relationshipRegistry.relationships.some(item => item.from === parent?.id && item.predicate === 'has_regional_guide' && item.to === entity?.id)) errors.push(`regional topic inverse relationship missing: ${topic.parent} -> ${topic.slug}`);
  if (!regionsHub.includes(`href="/${topic.slug}/" data-region-item`)) errors.push(`regional topic missing from directory: ${topic.slug}`);
  const topicPage = fs.readFileSync(path.join(root, topic.slug, 'index.html'), 'utf8');
  if (!topicPage.includes('data-geography-hierarchy')) errors.push(`regional topic geography context missing: ${topic.slug}`);
  if (!topicPage.includes(`"item":"https://winedaddy.com.au/${topic.parent}/"`)) errors.push(`regional topic breadcrumb parent missing: ${topic.slug} -> ${topic.parent}`);
}
if (regionTopics.topics.length !== 41) errors.push(`regional topic audit expected 41 guides; found ${regionTopics.topics.length}`);
if (regionTaxonomyMigrations.migrations.length !== 35) errors.push(`regional taxonomy migration audit expected 35 guides; found ${regionTaxonomyMigrations.migrations.length}`);
const migrationSlugs = new Set();
for (const migration of regionTaxonomyMigrations.migrations) {
  if (migrationSlugs.has(migration.slug)) errors.push(`duplicate regional taxonomy migration: ${migration.slug}`);
  migrationSlugs.add(migration.slug);
  const article = manifest.articles.find(candidate => candidate.slug === migration.slug);
  if (!article) errors.push(`regional taxonomy migration article missing: ${migration.slug}`);
  else if (article.section !== migration.to) errors.push(`regional taxonomy migration target mismatch: ${migration.slug} expected ${migration.to}, found ${article.section}`);
}
const ungroupedRegionCount = manifest.articles.filter(article => article.section === 'regions' && !governedRegionRoutes.has(article.route)).length;
if (ungroupedRegionCount !== 0 || /data-region-ungrouped/.test(regionsHub) || /More regional guides/.test(regionsHub)) errors.push(`regions directory has ${ungroupedRegionCount} unclassified guides`);
const clientScript = fs.readFileSync(path.join(root, 'assets', 'script.js'), 'utf8');
if (!clientScript.includes('group.open = Boolean(query) && !group.hidden')) errors.push('regions directory search expansion behaviour missing');
const grapesHub = fs.readFileSync(path.join(root, 'grapes', 'index.html'), 'utf8');
if (!grapesHub.includes('data-grape-directory')) errors.push('grapes hub is not using the relationship-led directory');
const grapeArticles = manifest.articles.filter(article => article.section === 'grapes');
if ((grapesHub.match(/data-grape-az/g) || []).length !== grapeArticles.length) errors.push(`grape A-Z expected ${grapeArticles.length} guides`);
if ((grapesHub.match(/data-grape-country/g) || []).length !== geographicCountryCount) errors.push(`grape directory expected ${geographicCountryCount} country groups`);
for (const article of grapeArticles) if (!grapesHub.includes(`data-grape-az>${escapeHtml(capitaliseDisplayTitle(cardTitle(article).replace(/^What is\s+/i, '').replace(/\?$/, '')))}</a>`)) errors.push(`${article.slug}: missing from grape A-Z`);
expectInitialCapital(textMatches(grapesHub, /data-grape-az>(.*?)<\/a>/g), 'grape guide');
if (!clientScript.includes("querySelector('[data-grape-filter]')") || !clientScript.includes("querySelectorAll('[data-grape-item]')")) errors.push('grape directory search behaviour missing');
const winemakingNavigation = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/winemaking-navigation.json'), 'utf8'));
const winemakingHub = fs.readFileSync(path.join(root, 'winemaking', 'index.html'), 'utf8');
const winemakingArticles = manifest.articles.filter(article => article.section === 'winemaking');
const winemakingBySlug = new Map(winemakingArticles.map(article => [article.slug, article]));
if (!winemakingHub.includes('data-winemaking-directory')) errors.push('winemaking hub is not using the process-led directory');
if ((winemakingHub.match(/data-process-az/g) || []).length !== winemakingArticles.length) errors.push(`winemaking A-Z expected ${winemakingArticles.length} guides`);
if ((winemakingHub.match(/data-process-group/g) || []).length !== winemakingNavigation.groups.length) errors.push(`winemaking directory expected ${winemakingNavigation.groups.length} process groups`);
if ((winemakingHub.match(/process-feature-card/g) || []).length !== winemakingNavigation.featured.length) errors.push(`winemaking directory expected ${winemakingNavigation.featured.length} featured guides`);
for (const slug of winemakingNavigation.featured) if (!winemakingBySlug.has(slug)) errors.push(`winemaking featured guide missing: ${slug}`);
const groupedWinemakingSlugs = new Set();
for (const group of winemakingNavigation.groups) for (const slug of group.slugs) {
  if (!winemakingBySlug.has(slug)) errors.push(`winemaking process guide missing: ${slug}`);
  if (groupedWinemakingSlugs.has(slug)) errors.push(`winemaking guide assigned to multiple process groups: ${slug}`);
  groupedWinemakingSlugs.add(slug);
}
for (const article of winemakingArticles) if (!winemakingHub.includes(`href="${article.route}" data-process-item data-process-az`)) errors.push(`${article.slug}: missing from winemaking A-Z`);
expectInitialCapital(textMatches(winemakingHub, /data-process-az>(.*?)<\/a>/g), 'winemaking guide');
expectAlphabetical(textMatches(winemakingHub.match(/process-feature-grid">([\s\S]*?)<\/div><\/section><section class="process-stages"/)?.[1] || '', /<h3>(.*?)<\/h3>/g), 'featured winemaking guides');
for (const links of winemakingHub.matchAll(/<div class="process-links">([\s\S]*?)<\/div>/g)) expectAlphabetical(textMatches(links[1], /data-process-item>(.*?)<\/a>/g), 'winemaking process guides');
if (/data-process-group open/.test(winemakingHub) || !clientScript.includes("querySelector('[data-process-filter]')") || !clientScript.includes('group.open = Boolean(query) && hasMatch')) errors.push('winemaking directory collapsed/search behaviour missing');
const tasmaniaPage = fs.readFileSync(path.join(root, 'tasmania-wine-region', 'index.html'), 'utf8');
if (!tasmaniaPage.includes('<h1>Tasmania</h1>')) errors.push('Tasmania must use its concise canonical place name as the visible H1');
if (!tasmaniaPage.includes('Explore selected WineDaddy growing-area guides')) errors.push('Tasmania must label its linked informal places as selected growing-area guides');
if (/<h2[^>]*>Related (?:learning|reading)<\/h2>/i.test(tasmaniaPage)) errors.push('Tasmania still renders the legacy Related learning list');
const tasmaniaRecommendations = recommendationRegistry.recommendations.find(item => item.article === '/tasmania-wine-region/');
const expectedTasmaniaNext = ['/what-is-sparkling-wine/', '/what-is-pinot-noir/', '/regions/'];
if (JSON.stringify(tasmaniaRecommendations?.items.map(item => item.route)) !== JSON.stringify(expectedTasmaniaNext)) errors.push('Tasmania recommendation cards are not the reviewed priority set');
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
if (!publicGraph['@context'].grown_in || !publicGraph['@context'].known_for) errors.push('grape-region predicate context missing');
if (!publicGraph['@context'].about_place || !publicGraph['@context'].has_regional_guide) errors.push('regional-topic predicate context missing');
if (!publicGraph['@context'].member_of_path || !publicGraph['@context'].has_learning_guide) errors.push('fundamentals learning-path predicate context missing');
if (!publicGraph['@context'].member_of_grape_path || !publicGraph['@context'].has_grape_guide || !publicGraph['@context'].same_as_grape) errors.push('grape-path predicate context missing');
const grapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/australian-grape-regions.json'), 'utf8'));
const frenchGrapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/french-grape-regions.json'), 'utf8'));
const italianGrapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/italian-grape-regions.json'), 'utf8'));
const spanishGrapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/spanish-grape-regions.json'), 'utf8'));
const germanAustrianGrapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/german-austrian-grape-regions.json'), 'utf8'));
const portugueseGrapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/portuguese-grape-regions.json'), 'utf8'));
const newZealandGrapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/new-zealand-grape-regions.json'), 'utf8'));
const southAfricanGrapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/south-african-grape-regions.json'), 'utf8'));
const argentineChileanGrapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/argentine-chilean-grape-regions.json'), 'utf8'));
const unitedStatesGrapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/united-states-grape-regions.json'), 'utf8'));
const emergingEuropeGrapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/emerging-europe-grape-regions.json'), 'utf8'));
const canadaBrazilGrapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/canada-brazil-grape-regions.json'), 'utf8'));
for (const grape of [...grapeRegions.grapes, ...frenchGrapeRegions.grapes, ...italianGrapeRegions.grapes, ...spanishGrapeRegions.grapes, ...germanAustrianGrapeRegions.grapes, ...portugueseGrapeRegions.grapes, ...newZealandGrapeRegions.grapes, ...southAfricanGrapeRegions.grapes, ...argentineChileanGrapeRegions.grapes, ...unitedStatesGrapeRegions.grapes, ...emergingEuropeGrapeRegions.grapes, ...canadaBrazilGrapeRegions.grapes]) {
  const grapeEntity = entityRegistry.entities.find(entity => entity.canonicalArticle === `/${grape.slug}/`);
  const grapePage = fs.readFileSync(path.join(root, grape.slug, 'index.html'), 'utf8');
  if (!grapePage.includes('Wine regions for this grape')) errors.push(`grape-region panel missing: ${grape.slug}`);
  for (const regionSlug of grape.regions) {
    const regionEntity = entityRegistry.entities.find(entity => entity.canonicalArticle === `/${regionSlug}/`);
    if (!relationshipRegistry.relationships.some(item => item.from === grapeEntity?.id && item.predicate === 'grown_in' && item.to === regionEntity?.id)) errors.push(`grown_in missing: ${grape.slug} -> ${regionSlug}`);
    if (!relationshipRegistry.relationships.some(item => item.from === regionEntity?.id && item.predicate === 'known_for' && item.to === grapeEntity?.id)) errors.push(`known_for missing: ${regionSlug} -> ${grape.slug}`);
  }
}
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
  if (/<h2[^>]*>Related (?:learning|reading)<\/h2>/i.test(html)) errors.push(`${article.slug}: legacy Related learning list remains`);
  check(html, /<meta name="viewport"/i, article.slug, 'viewport missing');
  check(html, /<link rel="icon" href="\/favicon\.ico" sizes="any">/i, article.slug, 'favicon metadata missing');
  if (!html.includes(`<link rel="canonical" href="https://winedaddy.com.au${article.route}"`)) errors.push(`${article.slug}: canonical incorrect`);
  check(html, /<script type="application\/ld\+json">/i, article.slug, 'JSON-LD missing');
  check(html, /G-M281DG8YTP/i, article.slug, 'GA missing'); check(html, /1085436810811087/i, article.slug, 'Meta Pixel missing');
  check(html, /<section class="highlights"><h2>Highlights<\/h2>/i, article.slug, 'Highlights component missing');
  const highlightsStart = html.indexOf('<section class="highlights">'); const highlightsHeadingEnd = html.indexOf('</h2>', highlightsStart) + 5; const highlightsEnd = html.indexOf('</section>', highlightsHeadingEnd); const nextH2 = html.indexOf('<h2', highlightsHeadingEnd); if (nextH2 !== -1 && nextH2 < highlightsEnd) errors.push(`${article.slug}: Highlights panel swallows a later section`);
  if ((html.match(/<h1(?:\s|>)/gi) || []).length !== 1) errors.push(`${article.slug}: expected one H1`);
  if (/INTERNAL EDITORIAL APPENDIX|NOT FOR PUBLICATION|BEGIN READER ARTICLE|END READER ARTICLE|IMPLEMENTATION NOTE|\[Visual:\s*VIS-/i.test(html)) errors.push(`${article.slug}: internal content leaked`);
  for (const match of html.matchAll(/href="(\/[^"#?]+)[^"]*"/g)) if (!routeExists(match[1])) errors.push(`${article.slug}: broken internal link ${match[1]}`);
}
const groups = new Map();
for (const article of manifest.articles) groups.set(article.section, [...(groups.get(article.section) || []), article]);
for (const [section, articles] of groups) {
  const hub = fs.readFileSync(path.join(root, section, 'index.html'), 'utf8');
  for (const article of articles) {
    if (!hub.includes(`href="${article.route}"`)) errors.push(`${article.slug}: missing from ${section} hub`);
    if (!['fundamentals','regions','grapes','winemaking'].includes(section) && !hub.includes(`<h2>${escapeHtml(capitaliseDisplayTitle(cardTitle(article)))}</h2>`)) errors.push(`${article.slug}: concise card title missing from ${section} hub`);
    if (cardTitle(article) !== article.title && hub.includes(`<h2>${escapeHtml(article.title)}</h2>`)) errors.push(`${article.slug}: SEO title leaked into ${section} card`);
  }
  if (!['fundamentals','regions','grapes','winemaking'].includes(section)) { const titles = textMatches(hub, /class="card guide-card"[^>]*>[\s\S]*?<h2>(.*?)<\/h2>/g); expectAlphabetical(titles, `${section} guides`); expectInitialCapital(titles, `${section} guide`); }
}
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
