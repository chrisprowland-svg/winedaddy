import fs from 'node:fs';
import path from 'node:path';
import {cardTitle, sections} from '../site/site.mjs';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/articles.json'), 'utf8'));
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
const topicEntities = manifest.articles.map(article => ({
  id: entityId(article),
  type: typeBySection[article.section],
  name: cardTitle(article),
  description: article.description,
  canonicalArticle: article.route,
  section: article.section
}));
const entities = [...collectionEntities, ...topicEntities].sort((a, b) => a.id.localeCompare(b.id));

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
relationships.sort((a, b) => `${a.from}|${a.to}`.localeCompare(`${b.from}|${b.to}`));

const entityRegistry = {version: 1, entities};
const relationshipRegistry = {version: 1, relationships};
const publicGraph = {
  '@context': {
    name: 'https://schema.org/name',
    description: 'https://schema.org/description',
    canonicalArticle: 'https://schema.org/mainEntityOfPage',
    editorially_related_to: 'https://schema.org/relatedLink',
    member_of: 'https://schema.org/isPartOf'
  },
  version: 1,
  entities,
  relationships
};

writeJson('content/knowledge/entities.json', entityRegistry);
writeJson('content/knowledge/relationships.json', relationshipRegistry);
writeJson('knowledge-graph.json', publicGraph);
console.log(`Built knowledge graph: ${entities.length} entities and ${relationships.length} relationships.`);

function entityId(article) {
  return `wd:${typeBySection[article.section]}:${article.slug}`;
}

function addRelationship(relationship) {
  const key = `${relationship.from}|${relationship.predicate}|${relationship.to}`;
  if (relationshipKeys.has(key)) return;
  relationshipKeys.add(key);
  relationships.push(relationship);
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
