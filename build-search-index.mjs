import {readdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const root = process.cwd(); const entries = [];
for (const slug of await readdir(root)) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) continue;
  let html;
  try { html = await readFile(join(root, slug, 'index.html'), 'utf8'); } catch { continue; }
  if (!/<article\b/i.test(html)) continue;
  const title = decode(match(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || match(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const description = decode(match(html, /<meta\s+name="description"\s+content="([^"]*)"/i));
  const article = match(html, /<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const text = decode(article.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).slice(0, 12000);
  entries.push({title, description, url: `/${slug}/`, text});
}
entries.sort((a, b) => a.title.localeCompare(b.title));
await writeFile(join(root, 'search-index.json'), `${JSON.stringify(entries)}\n`);
console.log(`Indexed ${entries.length} published articles.`);
function match(value, pattern) { return value.match(pattern)?.[1] || ''; }
function decode(value) { return value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
