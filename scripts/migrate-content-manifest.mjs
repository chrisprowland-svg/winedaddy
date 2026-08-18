import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceDir = path.join(root, 'article-source');
const articles = [];
for (const file of fs.readdirSync(sourceDir).filter(name => name.endsWith('.md')).sort()) {
  const slug = file.slice(0, -3);
  const route = fs.existsSync(path.join(root, slug, 'index.html')) ? `/${slug}/` : `/winemaking/${slug}.html`;
  const htmlPath = route.endsWith('/') ? path.join(root, slug, 'index.html') : path.join(root, route.slice(1));
  if (!fs.existsSync(htmlPath)) throw new Error(`${slug}: rendered article missing`);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const source = fs.readFileSync(path.join(sourceDir, file), 'utf8');
  const title = decode(html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] || source.match(/^#\s+(.+)$/m)?.[1] || '');
  const description = decode(html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || '');
  const schemaText = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1];
  let articleSection = '';
  try { const schema = JSON.parse(schemaText || '{}'); articleSection = (schema['@graph'] || [schema]).find(item => item['@type'] === 'Article')?.articleSection || ''; } catch {}
  const section = normaliseSection(articleSection, slug);
  if (!title || !description) throw new Error(`${slug}: title or description missing`);
  articles.push({slug, route, title, description, section, source: `article-source/${file}`});
}
for (const slug of ['what-is-wine', 'how-wine-is-made']) {
  const html = fs.readFileSync(path.join(root, slug, 'index.html'), 'utf8');
  const body = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]?.trim();
  const title = decode(html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] || html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] || '');
  const description = decode(html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || '');
  if (!body || !title || !description) throw new Error(`${slug}: legacy article migration failed`);
  const source = `article-source/${slug}.html`;
  fs.writeFileSync(path.join(root, source), `${body}\n`);
  articles.push({slug, route: `/${slug}/`, title, description, section: 'fundamentals', source});
}
articles.sort((a, b) => a.slug.localeCompare(b.slug));
fs.mkdirSync(path.join(root, 'content'), {recursive: true});
fs.writeFileSync(path.join(root, 'content/articles.json'), `${JSON.stringify({version: 1, articles}, null, 2)}\n`);
console.log(`Migrated ${articles.length} articles into content/articles.json`);
function normaliseSection(value, slug) { const text = String(value).toLowerCase(); if (text.includes('grape')) return 'grapes'; if (text.includes('region') || /-wine-region$/.test(slug)) return 'regions'; if (text.includes('winemaking')) return 'winemaking'; return 'fundamentals'; }
function decode(value) { return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim(); }
