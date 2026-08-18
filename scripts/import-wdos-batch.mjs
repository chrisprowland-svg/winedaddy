import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const from = Number(process.argv[2]);
const to = Number(process.argv[3]);
if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) throw new Error('Usage: node scripts/import-wdos-batch.mjs <from> <to>');

const manifestPath = path.join(root, 'content/articles.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const bySlug = new Map(manifest.articles.map(article => [article.slug, article]));

for (let number = from; number <= to; number += 1) {
  const jobId = `WD-${String(number).padStart(4, '0')}`;
  const payload = JSON.parse(fs.readFileSync(path.join(root, '.wd7/jobs', `${jobId}.json`), 'utf8'));
  const output = String(payload.editorial_output || '');
  const reader = output.match(/BEGIN READER ARTICLE\s*([\s\S]*?)\s*END READER ARTICLE/i)?.[1]?.trim();
  if (!reader) throw new Error(`${jobId}: bounded reader article missing`);
  const title = payload.metadata?.title || metadata(output, 'Title');
  const description = payload.metadata?.description || metadata(output, 'Description');
  const rawSlug = payload.metadata?.slug || metadata(output, 'Slug');
  const route = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}/`;
  if (!/^\/[a-z0-9-]+\/$/.test(route)) throw new Error(`${jobId}: invalid route ${route}`);
  const slug = route.slice(1, -1);
  if (!/wine region/i.test(payload.topic)) throw new Error(`${jobId}: section inference requires an explicit rule`);
  const source = `article-source/${slug}.md`;
  fs.writeFileSync(path.join(root, source), `${reader}\n`);
  const article = {slug, route, title, description, section: 'regions', source};
  bySlug.set(slug, article);
  console.log(`Imported ${jobId}: ${title}`);
}

manifest.articles = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

function metadata(output, name) {
  const value = output.match(new RegExp(`^- \\*\\*${name}:\\*\\*\\s*(.+)$`, 'mi'))?.[1]?.trim();
  if (!value) throw new Error(`Editorial metadata missing ${name}`);
  return value.replace(/^`|`$/g, '');
}
