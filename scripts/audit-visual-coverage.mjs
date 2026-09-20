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
  ['VIS-059','Pinot Noir at a glance','what-is-pinot-noir'],
  ['VIS-060','Chardonnay at a glance','what-is-chardonnay'],
  ['VIS-061','Shiraz at a glance','what-is-shiraz'],
  ['VIS-062','Sauvignon Blanc at a glance','what-is-sauvignon-blanc'],
  ['VIS-063','Riesling at a glance','what-is-riesling'],
  ['VIS-064','A simple wine-tasting sequence','how-to-taste-wine'],
  ['VIS-065','The building blocks of wine structure','wine-structure'],
  ['VIS-066','Wine serving temperatures','wine-serving-temperature-explained'],
  ['VIS-067','Decanting decision','when-to-decant-wine'],
  ['VIS-068','Protecting wine in storage','how-to-cellar-wine'],
].map(([visual_id,name,canary]) => ({visual_id,name,canary}));

const finalBatch = [
  ['VIS-081','Cabernet Franc at a glance','cabernet-franc'],
  ['VIS-082','Malbec at a glance','malbec'],
  ['VIS-083','Pinot Gris and Pinot Grigio at a glance','what-is-pinot-gris-pinot-grigio'],
  ['VIS-084','Chenin Blanc at a glance','chenin-blanc'],
  ['VIS-085','Muscat and Moscato at a glance','moscato-muscat'],
  ['VIS-086','Viognier at a glance','viognier'],
  ['VIS-087','Gamay at a glance','gamay'],
  ['VIS-088','Zinfandel and Primitivo at a glance','zinfandel-primitivo'],
  ['VIS-089','How acidity feels in wine','what-is-acidity-in-wine'],
  ['VIS-090','How tannin feels in wine','what-are-tannins'],
  ['VIS-091','Four choices that shape oak influence','what-does-oak-do-to-wine'],
  ['VIS-092','Three common paths to rosé','what-is-rose'],
  ['VIS-093','Champagne sweetness terms','champagne-sweetness-levels'],
  ['VIS-094','ABV, serving size and standard drinks','alcohol-in-wine'],
  ['VIS-095','Light, medium and full body','what-is-wine-body'],
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
  final_batch: finalBatch,
  asset_usage: Object.fromEntries([...assets].sort(([a],[b]) => a.localeCompare(b))),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
