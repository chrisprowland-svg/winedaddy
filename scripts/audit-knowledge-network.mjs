import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/articles.json'), 'utf8'));
const articlesByRoute = new Map(manifest.articles.map(article => [article.route, article]));
const aliases = new Map();

for (const article of manifest.articles) {
  aliases.set(article.route, article.route);
  if (article.route.endsWith('/')) aliases.set(article.route.slice(0, -1), article.route);
}

const outgoing = new Map(manifest.articles.map(article => [article.route, new Set()]));
const incoming = new Map(manifest.articles.map(article => [article.route, new Set()]));
const broken = [];

for (const article of manifest.articles) {
  const source = fs.readFileSync(path.join(root, article.source), 'utf8');
  for (const rawRoute of sourceInternalRoutes(source)) {
    const route = aliases.get(rawRoute);
    if (!route) {
      if (!isStaticRoute(rawRoute)) broken.push({from: article.route, to: rawRoute});
      continue;
    }
    if (route === article.route) continue;
    outgoing.get(article.route).add(route);
    incoming.get(route).add(article.route);
  }
}

const nodes = manifest.articles.map(article => ({
  slug: article.slug,
  route: article.route,
  section: article.section,
  outbound: outgoing.get(article.route).size,
  inbound: incoming.get(article.route).size
}));
const bySection = Object.fromEntries(Object.keys(groupBy(nodes, 'section')).sort().map(section => {
  const group = nodes.filter(node => node.section === section);
  return [section, {
    articles: group.length,
    noOutbound: group.filter(node => node.outbound === 0).length,
    noInbound: group.filter(node => node.inbound === 0).length
  }];
}));
const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  totals: {
    articles: nodes.length,
    relationships: nodes.reduce((sum, node) => sum + node.outbound, 0),
    noOutbound: nodes.filter(node => node.outbound === 0).length,
    noInbound: nodes.filter(node => node.inbound === 0).length,
    fullyIsolated: nodes.filter(node => node.outbound === 0 && node.inbound === 0).length,
    broken: broken.length
  },
  bySection,
  weakest: nodes.sort((a, b) => (a.inbound + a.outbound) - (b.inbound + b.outbound) || a.route.localeCompare(b.route)).slice(0, 100),
  broken
};

if (process.argv.includes('--write')) {
  const target = path.join(root, 'reports/knowledge-network-baseline.json');
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, target)}.`);
}
console.log(JSON.stringify({totals: report.totals, bySection: report.bySection}, null, 2));
if (broken.length) process.exitCode = 1;

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

function isStaticRoute(route) {
  return route.startsWith('/assets/') || ['/', '/fundamentals', '/grapes', '/regions', '/winemaking', '/about.html', '/contact.html', '/privacy.html', '/search.html'].includes(route);
}

function groupBy(items, key) {
  return Object.groupBy(items, item => item[key]);
}
