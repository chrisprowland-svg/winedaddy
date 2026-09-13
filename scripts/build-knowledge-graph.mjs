import fs from 'node:fs';
import path from 'node:path';
import {cardTitle, sections} from '../site/site.mjs';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/articles.json'), 'utf8'));
const geographies = ['australian-geography.json', 'france-geography.json', 'italy-geography.json', 'spain-geography.json', 'germany-austria-geography.json', 'portugal-geography.json', 'new-zealand-geography.json', 'south-africa-geography.json', 'argentina-chile-geography.json', 'united-states-geography.json', 'emerging-europe-geography.json', 'canada-brazil-geography.json'].map(file => JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge', file), 'utf8')));
const regionTopics = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/region-topics.json'), 'utf8'));
const fundamentalsNavigation = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/fundamentals-navigation.json'), 'utf8'));
const grapeNavigation = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/grape-navigation.json'), 'utf8'));
const geography = {places: geographies.flatMap(item => item.places)};
const grapeRegionSets = ['australian-grape-regions.json', 'french-grape-regions.json', 'italian-grape-regions.json', 'spanish-grape-regions.json', 'german-austrian-grape-regions.json', 'portuguese-grape-regions.json', 'new-zealand-grape-regions.json', 'south-african-grape-regions.json', 'argentine-chilean-grape-regions.json', 'united-states-grape-regions.json', 'emerging-europe-grape-regions.json', 'canada-brazil-grape-regions.json'].map(file => JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge', file), 'utf8')));
const typeBySection = {
  fundamentals: 'wine_concept',
  grapes: 'grape_variety',
  regions: 'wine_place',
  winemaking: 'winemaking_concept'
};
const articleByRoute = new Map();
for (const article of manifest.articles) {
  articleByRoute.set(article.route, article);
  if (article.route.endsWith('/')) articleByRoute.set(article.route.slice(0, -1), article);
}

const collectionEntities = Object.entries(sections).map(([section, value]) => ({
  id: `wd:knowledge_collection:${section}`,
  type: 'knowledge_collection',
  name: value.name,
  description: value.description,
  canonicalArticle: `/${section}/`,
  section
}));
const learningPathEntities = fundamentalsNavigation.groups.map(group => ({
  id: `wd:learning_path:${group.id}`,
  type: 'knowledge_collection',
  name: group.name,
  description: group.description,
  canonicalArticle: `/fundamentals/#${group.id}`,
  section: 'fundamentals'
}));
const grapePathEntities = grapeNavigation.groups.map(group => ({
  id: `wd:grape_path:${group.id}`,
  type: 'knowledge_collection',
  name: group.name,
  description: group.description,
  canonicalArticle: `/grapes/#${group.id}`,
  section: 'grapes'
}));
const grapeAliasByCanonicalSlug = new Map(grapeNavigation.aliases.map(alias => [alias.canonicalSlug, alias]));
const geographyBySlug = new Map(geography.places.map(place => [place.slug, place]));
const topicEntities = manifest.articles.map(article => {
  const place = geographyBySlug.get(article.slug);
  const grapeAlias = grapeAliasByCanonicalSlug.get(article.slug);
  return {
    id: entityId(article),
    type: typeBySection[article.section],
    name: place?.label || cardTitle(article),
    description: article.description,
    canonicalArticle: article.route,
    section: article.section,
    ...(place ? {geographyKind: place.kind} : {}),
    ...(grapeAlias ? {alternateName: grapeAlias.aliases} : {})
  };
});
const articleByEntityId = new Map(manifest.articles.map(article => [entityId(article), article]));
const articleBySlug = new Map(manifest.articles.map(article => [article.slug, article]));
const entities = [...collectionEntities, ...learningPathEntities, ...grapePathEntities, ...topicEntities].sort((a, b) => a.id.localeCompare(b.id));
const stopwords = new Set('a an and are as at australia australian be beginner beginners by can context does dry explained for from grape grapes guide how in into is it its known learn made of on or principal red region regions style styles taste tastes the their this to variety varieties vs what when where which white why wine wines with without your'.split(' '));
const documentFrequency = new Map();
const termsBySlug = new Map();
for (const article of manifest.articles) {
  const terms = new Set(tokenise(`${cardTitle(article)} ${article.description}`));
  termsBySlug.set(article.slug, terms);
  for (const term of terms) documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
}
const relationshipKeys = new Set();
const relationships = [];
for (const article of manifest.articles) {
  addRelationship({
    from: entityId(article),
    predicate: 'member_of',
    to: `wd:knowledge_collection:${article.section}`,
    evidence: 'canonical_section'
  });
  const source = fs.readFileSync(path.join(root, article.source), 'utf8');
  for (const route of sourceInternalRoutes(source)) {
    const target = articleByRoute.get(route);
    if (!target || target.slug === article.slug) continue;
    const from = entityId(article);
    const to = entityId(target);
    addRelationship({from, predicate: 'editorially_related_to', to, evidence: 'editorial_link'});
  }
}
for (const group of fundamentalsNavigation.groups) for (const slug of group.slugs) {
  const article = articleBySlug.get(slug);
  if (!article || article.section !== 'fundamentals') throw new Error(`Fundamentals learning path contains a missing or misclassified guide: ${group.id} -> ${slug}`);
  addRelationship({from: entityId(article), predicate: 'member_of_path', to: `wd:learning_path:${group.id}`, evidence: fundamentalsNavigation.evidence});
  addRelationship({from: `wd:learning_path:${group.id}`, predicate: 'has_learning_guide', to: entityId(article), evidence: fundamentalsNavigation.evidence});
}
for (const group of grapeNavigation.groups) for (const slug of group.slugs) {
  const article = articleBySlug.get(slug);
  if (!article || article.section !== 'grapes') throw new Error(`Grape pathway contains a missing or misclassified guide: ${group.id} -> ${slug}`);
  addRelationship({from: entityId(article), predicate: 'member_of_grape_path', to: `wd:grape_path:${group.id}`, evidence: grapeNavigation.evidence});
  addRelationship({from: `wd:grape_path:${group.id}`, predicate: 'has_grape_guide', to: entityId(article), evidence: grapeNavigation.evidence});
}
for (const alias of grapeNavigation.aliases) {
  const canonical = articleBySlug.get(alias.canonicalSlug);
  if (!canonical || canonical.section !== 'grapes') throw new Error(`Canonical grape alias target missing: ${alias.canonicalSlug}`);
  for (const relatedSlug of alias.relatedSlugs) {
    const related = articleBySlug.get(relatedSlug);
    if (!related || related.section !== 'grapes') throw new Error(`Related grape alias guide missing: ${relatedSlug}`);
    const predicate = relatedSlug.includes('-vs-') ? 'about_grape' : 'same_as_grape';
    addRelationship({from: entityId(related), predicate, to: entityId(canonical), evidence: grapeNavigation.evidence});
  }
}
for (const geographySet of geographies) for (const place of geographySet.places) {
  const article = manifest.articles.find(candidate => candidate.slug === place.slug);
  if (!article) throw new Error(`Australian geography entity has no canonical article: ${place.slug}`);
  if (!place.parent) continue;
  const parent = manifest.articles.find(candidate => candidate.slug === place.parent);
  if (!parent) throw new Error(`Australian geography parent has no canonical article: ${place.parent}`);
  const evidence = place.evidence || Object.keys(geographySet.evidenceCatalog)[0];
  addRelationship({from: entityId(article), predicate: 'located_in', to: entityId(parent), evidence});
  addRelationship({from: entityId(parent), predicate: 'contains', to: entityId(article), evidence});
}
for (const topic of regionTopics.topics) {
  const article = articleBySlug.get(topic.slug);
  const parent = articleBySlug.get(topic.parent);
  if (!article || article.section !== 'regions') throw new Error(`Regional topic missing or misclassified: ${topic.slug}`);
  if (!parent || !geographyBySlug.has(topic.parent)) throw new Error(`Regional topic parent is not a governed place: ${topic.slug} -> ${topic.parent}`);
  addRelationship({from: entityId(article), predicate: 'about_place', to: entityId(parent), evidence: regionTopics.evidence});
  addRelationship({from: entityId(parent), predicate: 'has_regional_guide', to: entityId(article), evidence: regionTopics.evidence});
}
for (const grapeRegions of grapeRegionSets) for (const grape of grapeRegions.grapes) {
  const grapeArticle = articleBySlug.get(grape.slug);
  if (!grapeArticle || grapeArticle.section !== 'grapes') throw new Error(`Australian grape entity missing: ${grape.slug}`);
  for (const regionSlug of grape.regions) {
    const regionArticle = articleBySlug.get(regionSlug);
    if (!regionArticle || regionArticle.section !== 'regions') throw new Error(`Australian grape-region target missing: ${regionSlug}`);
    addRelationship({from: entityId(grapeArticle), predicate: 'grown_in', to: entityId(regionArticle), evidence: grapeRegions.evidence});
    addRelationship({from: entityId(regionArticle), predicate: 'known_for', to: entityId(grapeArticle), evidence: grapeRegions.evidence});
  }
}
const editorialDegree = new Map(topicEntities.map(entity => [entity.id, 0]));
const editorialNeighbourScores = new Map(topicEntities.map(entity => [entity.id, new Map()]));
for (const relationship of relationships) {
  if (relationship.predicate !== 'editorially_related_to') continue;
  editorialDegree.set(relationship.from, (editorialDegree.get(relationship.from) || 0) + 1);
  editorialDegree.set(relationship.to, (editorialDegree.get(relationship.to) || 0) + 1);
  editorialNeighbourScores.get(relationship.from).set(relationship.to, 2);
  editorialNeighbourScores.get(relationship.to).set(relationship.from, Math.max(editorialNeighbourScores.get(relationship.to).get(relationship.from) || 0, 1));
}
const recommendations = [];
for (const article of manifest.articles) {
  const from = entityId(article);
  const priorityItems = (geographyBySlug.get(article.slug)?.recommendationPriority || []).map(slug => articleBySlug.get(slug)).filter(Boolean).slice(0,2).map(target => ({entityId: entityId(target), route: target.route, title: cardTitle(target), description: target.description, score: 0, evidence: 'reviewed_priority'}));
  const priorityIds = new Set(priorityItems.map(item => item.entityId));
  const editorialItems = [...editorialNeighbourScores.get(from)].map(([targetId, directionScore]) => ({article: articleByEntityId.get(targetId), directionScore})).filter(candidate => candidate.article && !priorityIds.has(entityId(candidate.article))).sort((a, b) => b.directionScore - a.directionScore || cardTitle(a.article).localeCompare(cardTitle(b.article))).slice(0, 2 - priorityItems.length).map(({article: target}) => ({entityId: entityId(target), route: target.route, title: cardTitle(target), description: target.description, score: 0, evidence: 'editorial_link'}));
  const items = [...priorityItems, ...editorialItems];
  if (!items.length) items.push(...rankedNeighbours(article).filter(candidate => candidate.titleOverlap ? candidate.score >= 5 : candidate.score >= 25).slice(0, 2).map(({article: target, score}) => ({entityId: entityId(target), route: target.route, title: cardTitle(target), description: target.description, score: Number(score.toFixed(4)), evidence: 'lexical_cluster'})));
  const collection = collectionEntities.find(entity => entity.section === article.section);
  items.push({entityId: collection.id, route: collection.canonicalArticle, title: `Explore ${collection.name}`, description: collection.description, score: 0, evidence: 'canonical_section'});
  recommendations.push({entityId: from, article: article.route, items});
  for (const item of items) addRelationship({from, predicate: 'recommended_next', to: item.entityId, evidence: item.evidence});
}
relationships.sort((a, b) => `${a.from}|${a.to}`.localeCompare(`${b.from}|${b.to}`));

const entityRegistry = {version: 2, entities};
const relationshipRegistry = {version: 2, relationships};
const publicGraph = {
  '@context': {
    name: 'https://schema.org/name',
    description: 'https://schema.org/description',
    canonicalArticle: 'https://schema.org/mainEntityOfPage',
    editorially_related_to: 'https://schema.org/relatedLink',
    member_of: 'https://schema.org/isPartOf',
    recommended_next: 'https://schema.org/relatedLink',
    located_in: 'https://schema.org/containedInPlace',
    contains: 'https://schema.org/containsPlace',
    grown_in: 'https://schema.org/location',
    known_for: 'https://schema.org/knowsAbout',
    about_place: 'https://schema.org/about',
    has_regional_guide: 'https://schema.org/subjectOf',
    member_of_path: 'https://schema.org/isPartOf',
    has_learning_guide: 'https://schema.org/hasPart'
    ,member_of_grape_path: 'https://schema.org/isPartOf'
    ,has_grape_guide: 'https://schema.org/hasPart'
    ,same_as_grape: 'https://schema.org/sameAs'
    ,about_grape: 'https://schema.org/about'
  },
  version: 2,
  entities,
  relationships
};

writeJson('content/knowledge/entities.json', entityRegistry);
writeJson('content/knowledge/relationships.json', relationshipRegistry);
writeJson('content/knowledge/recommendations.json', {version: 1, recommendations});
writeJson('knowledge-graph.json', publicGraph);
console.log(`Built knowledge graph: ${entities.length} entities, ${relationships.length} relationships and ${recommendations.length} recommendation sets.`);

function entityId(article) {
  return `wd:${typeBySection[article.section]}:${article.slug}`;
}

function addRelationship(relationship) {
  const key = `${relationship.from}|${relationship.predicate}|${relationship.to}`;
  if (relationshipKeys.has(key)) return;
  relationshipKeys.add(key);
  relationships.push(relationship);
}

function rankedNeighbours(article) {
  const sourceTerms = termsBySlug.get(article.slug);
  const sourceTitleTerms = new Set(tokenise(cardTitle(article)));
  return manifest.articles.filter(candidate => candidate.section === article.section && candidate.slug !== article.slug).map(candidate => {
    const candidateTerms = termsBySlug.get(candidate.slug);
    const candidateTitleTerms = new Set(tokenise(cardTitle(candidate)));
    let score = 0;
    for (const term of sourceTerms) {
      if (!candidateTerms.has(term)) continue;
      const rarity = Math.log((manifest.articles.length + 1) / ((documentFrequency.get(term) || 0) + 1));
      score += rarity * (sourceTitleTerms.has(term) && candidateTitleTerms.has(term) ? 3 : 1);
    }
    score += Math.log1p(editorialDegree.get(entityId(candidate)) || 0) * 0.05;
    const titleOverlap = [...sourceTitleTerms].some(term => candidateTitleTerms.has(term));
    return {article: candidate, score, titleOverlap};
  }).sort((a, b) => b.score - a.score || a.article.route.localeCompare(b.article.route));
}

function tokenise(value) {
  return String(value).toLocaleLowerCase('en-AU').normalize('NFKD').replace(/\p{Diacritic}/gu, '').match(/[a-z0-9]+/g)?.filter(term => term.length > 2 && !stopwords.has(term)) || [];
}

function sourceInternalRoutes(source) {
  const routes = [];
  const patterns = [
    /\[[^\]]*\]\((\/[^)#?\s]+)(?:#[^)]*)?\)/g,
    /href=["'](\/[^"'#?\s]+)/g,
    /(?:https?:\/\/)?(?:www\.)?winedaddy\.com\.au(\/[^)#?\s"']+)/g
  ];
  for (const pattern of patterns) for (const match of source.matchAll(pattern)) routes.push(match[1]);
  return [...new Set(routes.map(route => route.replace(/\/$/, '') || '/'))];
}

function writeJson(relativePath, value) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, `${JSON.stringify(value)}\n`);
}
