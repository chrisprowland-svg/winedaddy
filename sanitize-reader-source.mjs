import fs from 'node:fs';
import path from 'node:path';

export const slugs = [
  'what-is-natural-wine', 'what-is-organic-wine', 'what-is-biodynamic-wine',
  'what-is-merlot', 'what-is-grenache', 'what-is-sangiovese', 'what-is-nebbiolo',
  'what-is-tempranillo', 'how-to-taste-wine', 'what-is-fermentation',
  'what-does-oak-do-to-wine', 'what-is-terroir', 'how-climate-affects-wine',
  'wine-serving-temperature-explained', 'when-to-decant-wine',
  'how-to-store-open-wine', 'how-to-cellar-wine', 'what-is-cork-taint',
  'what-is-oxidation-in-wine', 'how-to-read-a-wine-label',
];

for (const slug of slugs) {
  const file = path.join('article-source', `${slug}.md`);
  const original = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  let lines = original.split('\n');

  // PR #27 / WDOS runtime contract 1.6: the reader layer starts at the
  // article-title H1. Anything before it is internal front matter/metadata.
  const h1 = lines.findIndex(line => /^#\s+\S/.test(line));
  if (h1 < 0) throw new Error(`${slug}: article title H1 missing`);
  lines = lines.slice(h1);

  // The consumer contract requires Highlights immediately after the title.
  // Metadata accidentally emitted between the H1 and Highlights is internal
  // implementation material, so discard that preamble without touching copy.
  const highlights = lines.findIndex(line => /^##\s+Highlights\s*$/i.test(line));
  if (highlights < 0) throw new Error(`${slug}: Highlights heading missing`);
  if (highlights > 1) lines = [lines[0], '', ...lines.slice(highlights)];

  const cleaned = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  fs.writeFileSync(file, cleaned);
}

console.log(`Reader-boundary sanitization completed for ${slugs.length} articles.`);
