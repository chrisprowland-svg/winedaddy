import fs from 'node:fs';
import path from 'node:path';
import {cardTitle, sections} from '../site/site.mjs';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/articles.json'), 'utf8'));
const geography = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/australian-geography.json'), 'utf8'));
const grapeRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/knowledge/australian-grape-regions.json'), 'utf8'));
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
const geographyBySlug = new Map(geography.places.map(place => [place.slug, place]));
const topicEntities = manifest.articles.map(article => {
  const place = geographyBySlug.get(article.slug);
  return {
    id: entityId(article),
    type: typeBySection[article.section],
    name: place?.label || cardTitle(article),
    description: article.description,
    canonicalArticle: article.route,
    section: article.section,
    ...(place ? {geographyKind: place.kind, geographyPilot: geography.scope} : {})
  };
});
const articleByEntityId = new Map(manifest.articles.map(article => [entityId(article), article]));
const articleBySlug = new Map(manifest.articles.map(article => [article.slug, article]));
const entities = [...collectionEntities, ...topicEntities].sort((a, b) => a.id.localeCompare(b.id));
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
for (const place of geography.places) {
  const article = manifest.articles.find(candidate => candidate.slug === place.slug);
  if (!article) throw new Error(`Australian geography entity has no canonical article: ${place.slug}`);
  if (!place.parent) continue;
  const parent = manifest.articles.find(candidate => candidate.slug === place.parent);
  if (!parent) throw new Error(`Australian geography parent has no canonical article: ${place.parent}`);
  const evidence = place.evidence || 'wine_australia_gi_hierarchy';
  addRelationship({from: entityId(article), predicate: 'located_in', to: entityId(parent), evidence});
  addRelationship({from: entityId(parent), predicate: 'contains', to: entityId(article), evidence});
}
for (const grape of grapeRegions.grapes) {
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
    contains: 'https://schema.org/containsPlace'
    ,grown_in: 'https://schema.org/location'
    ,known_for: 'https://schema.org/knowsAbout'
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
