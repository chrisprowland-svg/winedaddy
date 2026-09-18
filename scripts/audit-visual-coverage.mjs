import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const sourceDir = path.join(root, 'article-source');
const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.md')).sort();
const visualPattern = /<!--\s*VISUAL:(VIS-\d{3})\s*-->/g;
const assets = new Map();
const pages = [];

for (const file of files) {
  const source = fs.readFileSync(path.join(sourceDir, file), 'utf8');
  const visuals = [...source.matchAll(visualPattern)].map(match => match[1]);
  for (const visual of visuals) assets.set(visual, (assets.get(visual) || 0) + 1);
  pages.push({slug:file.replace(/\.md$/, ''), visuals});
}

const firstBatch = [
  ['VIS-054','Pinot Noir at a glance','what-is-pinot-noir'],
  ['VIS-055','Chardonnay at a glance','what-is-chardonnay'],
  ['VIS-056','Shiraz at a glance','what-is-shiraz'],
  ['VIS-057','Sauvignon Blanc at a glance','what-is-sauvignon-blanc'],
  ['VIS-058','Riesling at a glance','what-is-riesling'],
  ['VIS-059','A simple wine-tasting sequence','how-to-taste-wine'],
  ['VIS-060','The building blocks of wine structure','wine-structure'],
  ['VIS-061','Wine serving temperatures','wine-serving-temperature-explained'],
  ['VIS-062','Decanting decision','when-to-decant-wine'],
  ['VIS-063','Protecting wine in storage','how-to-cellar-wine'],
].map(([visual_id,name,canary]) => ({visual_id,name,canary}));

const report = {
  generated_at: new Date().toISOString(),
  corpus: {
    articles: pages.length,
    pages_with_visuals: pages.filter(page => page.visuals.length).length,
    pages_without_visuals: pages.filter(page => !page.visuals.length).length,
    placements: pages.reduce((total, page) => total + page.visuals.length, 0),
    registered_visuals_in_use: assets.size,
  },
  governance: {
    decorative_image_target: 0,
    active_asset_ceiling: 100,
    canonical_format: 'semantic HTML/CSS first; verified SVG for maps or complex technical relationships',
    publication: 'protected preview; explicit human approval required for PROD',
  },
  first_batch: firstBatch,
  asset_usage: Object.fromEntries([...assets].sort(([a],[b]) => a.localeCompare(b))),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
