import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'content/articles.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const bySlug = new Map(manifest.articles.map(article => [article.slug, article]));
const requested = process.argv.slice(2);
const files = requested.length
  ? requested.map(jobId => `${normaliseJobId(jobId)}.json`)
  : JSON.parse(fs.readFileSync(path.join(root, '.wd7/current-batch.json'), 'utf8')).job_ids.map(jobId => `${normaliseJobId(jobId)}.json`);

for (const file of files) {
  const jobId = file.replace(/\.json$/, '');
  const payload = JSON.parse(fs.readFileSync(path.join(root, '.wd7/jobs', `${jobId}.json`), 'utf8'));
  const output = String(payload.editorial_output || '');
  const extractedReader = output.match(/BEGIN READER ARTICLE\s*([\s\S]*?)(?:\s*END READER ARTICLE|\s*BEGIN READER ARTICLE|\s*BEGIN INTERNAL EDITORIAL APPENDIX)/i)?.[1]?.trim();
  if (!extractedReader) throw new Error(`${jobId}: bounded reader article missing`);
  const reader = normaliseReader(extractedReader);
  const title = payload.metadata?.title || metadata(output, 'Title', false) || reader.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const description = payload.metadata?.description || metadata(output, 'Description', false) || readerDescription(reader);
  const rawSlug = payload.metadata?.slug || metadata(output, 'Slug', false) || payload.canonical_route || output.match(/Canonical route:\s*`?(\/[a-z0-9-]+\/)/i)?.[1];
  if (!title || !description || !rawSlug) throw new Error(`${jobId}: incomplete publication metadata`);
  const route = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}/`;
  if (!/^\/[a-z0-9-]+\/$/.test(route)) throw new Error(`${jobId}: invalid route ${route}`);
  const slug = route.slice(1, -1);
  const section = sectionFor(payload);
  const source = `article-source/${slug}.md`;
  fs.writeFileSync(path.join(root, source), `${reader}\n`);
  const article = {slug, route, title, description, section, source};
  bySlug.set(slug, article);
  console.log(`Imported ${jobId}: ${title}`);
}

function normaliseReader(reader) {
  reader = reader
    .replaceAll('/what-is-wine-acidity/', '/what-is-acidity-in-wine/')
    .replaceAll('/what-is-wine-balance/', '/what-is-balance-in-wine/')
    .replaceAll('/how-to-store-an-open-bottle-of-wine/', '/how-to-store-open-wine/')
    .replaceAll('/when-should-wine-be-decanted/', '/when-to-decant-wine/');
  if (/^##\s+Highlights\s*$/im.test(reader)) return reader;
  // Older approved packages used “in brief” or “in six ideas” for the same
  // opening summary block. Keep the copy but give the renderer its canonical
  // section name so every article has a consistent Highlights component.
  return reader.replace(/^##\s+[^\n]+$/m, '## Highlights');
}

function normaliseJobId(value) {
  if (/^WD-\d{4}$/i.test(value)) return value.toUpperCase();
  if (/^\d{1,4}$/.test(value)) return `WD-${value.padStart(4, '0')}`;
  throw new Error(`invalid job id: ${value}`);
}

function sectionFor(payload) {
  const family = String(payload.authority_family || '').toLowerCase();
  if (family.includes('geograph')) return 'regions';
  if (family.includes('grape')) return 'grapes';
  if (family.includes('winemaking')) return 'winemaking';
  if (family.includes('fundamental') || family.includes('tasting')) return 'fundamentals';
  const topic = String(payload.topic || '').toLowerCase();
  if (/wine region|wine regions|appellation|geographic indication/.test(topic)) return 'regions';
  if (/ferment|macerat|pressing|destemm|crushing|lees|yeast|oak|barrel|bottl|fining|filter|wine is made/.test(topic)) return 'winemaking';
  if (/^what is .+\?$/.test(topic) && !/wine|aroma|acidity|tannin|body|sweet|dry|alcohol|finish|balance|complexity/.test(topic)) return 'grapes';
  return 'fundamentals';
}

manifest.articles = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

function metadata(output, name, required = true) {
  const value = output.match(new RegExp(`^- \\*\\*${name}:\\*\\*\\s*(.+)$`, 'mi'))?.[1]?.trim();
  if (!value && required) throw new Error(`Editorial metadata missing ${name}`);
  if (!value) return null;
  return value.replace(/^`|`$/g, '');
}

function readerDescription(reader) {
  const quick = reader.split(/^##\s+Quick answer[^\n]*$/im)[1] || reader;
  const paragraph = quick.split(/\n\s*\n/).map(value => value.trim()).find(value => value && !/^#|^- /.test(value));
  if (!paragraph) return null;
  const plain = paragraph.replace(/[*_`]/g, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
  return plain.length <= 160 ? plain : `${plain.slice(0, 157).replace(/\s+\S*$/, '')}…`;
}
