import fs from 'node:fs';
import path from 'node:path';
import {marked} from 'marked';
import {SITE_URL, cardTitle, escapeHtml, pageDocument, sections} from '../site/site.mjs';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/articles.json'), 'utf8'));
const seenSlugs = new Set();
const searchEntries = [];
for (const article of manifest.articles) {
  validateArticle(article);
  if (seenSlugs.has(article.slug)) throw new Error(`${article.slug}: duplicate slug`);
  seenSlugs.add(article.slug);
  const rawSource = fs.readFileSync(path.join(root, article.source), 'utf8');
  const source = article.source.endsWith('.md') ? normaliseReaderSource(rawSource) : rawSource;
  validateSource(article.slug, source);
  const body = article.source.endsWith('.md') ? renderMarkdown(source) : source;
  const section = sections[article.section];
  const canonicalPath = article.route;
  const schema = {'@context':'https://schema.org','@graph':[{'@type':'Article',headline:article.title,description:article.description,mainEntityOfPage:`${SITE_URL}${canonicalPath}`,articleSection:section.name,inLanguage:'en-AU',author:{'@type':'Organization',name:'WineDaddy'},publisher:{'@type':'Organization',name:'WineDaddy'}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:`${SITE_URL}/`},{'@type':'ListItem',position:2,name:section.name,item:`${SITE_URL}/${article.section}/`},{'@type':'ListItem',position:3,name:article.title,item:`${SITE_URL}${canonicalPath}`}]}]};
  const heroTitle = source.match(/^#\s+(.+)$/m)?.[1] || article.title;
  const html = pageDocument({title: article.title, description: article.description, canonicalPath, type: 'article', schema, body: `<main><section class="page-hero"><div class="section"><p class="breadcrumbs"><a href="/">Home</a> / <a href="/${article.section}/">${section.name}</a></p><p class="eyebrow">${section.name}</p><h1>${escapeHtml(heroTitle)}</h1><p class="lede">${escapeHtml(article.description)}</p><p class="article-meta">Foundation guide · Beginner friendly · Australian context</p></div></section><article class="article article-wide">${body}</article></main>`});
  const outputPath = canonicalPath.endsWith('/') ? path.join(root, canonicalPath.slice(1), 'index.html') : path.join(root, canonicalPath.slice(1));
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, html);
  searchEntries.push({title: article.title, description: article.description, url: canonicalPath, text: visibleText(body).slice(0, 1200)});
}
for (const [key, section] of Object.entries(sections)) buildHub(key, section, manifest.articles.filter(article => article.section === key));
searchEntries.sort((a, b) => a.title.localeCompare(b.title));
fs.writeFileSync(path.join(root, 'search-index.json'), `${JSON.stringify(searchEntries)}\n`);
buildSitemap(manifest.articles);
fs.writeFileSync(path.join(root, 'qa-manifest.json'), `${JSON.stringify({version: 1, paths: manifest.articles.map(article => article.route)}, null, 2)}\n`);
console.log(`Built ${manifest.articles.length} articles and ${Object.keys(sections).length} hubs from one manifest.`);

function validateArticle(article) { if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug || '')) throw new Error(`invalid slug: ${article.slug}`); if (!/^\/(?:[a-z0-9-]+\/)*(?:[a-z0-9-]+\/|[a-z0-9-]+\.html)$/.test(article.route || '')) throw new Error(`${article.slug}: invalid route`); if (!sections[article.section]) throw new Error(`${article.slug}: invalid section`); if (!article.title || !article.description || !article.source) throw new Error(`${article.slug}: incomplete metadata`); }
function validateSource(slug, source) { if (/INTERNAL EDITORIAL APPENDIX|NOT FOR PUBLICATION|BEGIN READER ARTICLE|END READER ARTICLE|IMPLEMENTATION NOTE/i.test(source)) throw new Error(`${slug}: internal workflow material in reader source`); if (source.trimStart().startsWith('<')) { if (!/<h2>Highlights<\/h2>/i.test(source)) throw new Error(`${slug}: Highlights missing`); return; } if (!/^#\s+\S/m.test(source)) throw new Error(`${slug}: article title missing`); if (!/^##\s+Highlights\s*$/im.test(source)) throw new Error(`${slug}: Highlights missing`); }
function normaliseReaderSource(source) { return source.replace(/^##\s+(?:.+\s+)?(?:highlights?|(?:the\s+)?quick highlights|at a glance|quick facts|in brief|in short|in a nutshell)\s*$/im, '## Highlights'); }
function renderMarkdown(source) { let html = marked.parse(source).replace(/^<h1>.*?<\/h1>\s*/s, ''); html = html.replace(/<h1([^>]*)>/g, '<h2$1>').replace(/<\/h1>/g, '</h2>'); html = html.replace(/<h2>Highlights<\/h2>([\s\S]*?<\/ul>)/i, '<section class="highlights"><h2>Highlights</h2>$1</section>'); return html.replace(/<table>/g, '<div class="table-scroll" tabindex="0"><table class="article-table">').replace(/<\/table>/g, '</table></div>'); }
function buildHub(key, section, articles) { const cards = articles.sort((a,b) => cardTitle(a).localeCompare(cardTitle(b))).map(article => `<a class="card guide-card" href="${article.route}"><div><h2>${escapeHtml(cardTitle(article))}</h2><p>${escapeHtml(article.description)}</p></div><b>Read guide →</b></a>`).join(''); const body = `<main><section class="page-hero hub-hero"><div class="section"><p class="eyebrow">WineDaddy knowledge base</p><h1>${section.name}</h1><p class="lede">${section.description}</p><p class="article-count">${articles.length} guides</p></div></section><section class="section"><label class="guide-filter">Filter ${section.name.toLowerCase()} guides<input type="search" data-guide-filter placeholder="Search ${section.name.toLowerCase()}…"></label><div class="grid guide-grid" data-guide-grid>${cards}</div><p class="empty-state" data-empty-state hidden>No matching guides found.</p></section></main>`; const schema = {'@context':'https://schema.org','@type':'CollectionPage',name:section.name,url:`${SITE_URL}/${key}/`,description:section.description}; fs.mkdirSync(path.join(root, key), {recursive: true}); fs.writeFileSync(path.join(root, key, 'index.html'), pageDocument({title: section.name, description: section.description, canonicalPath:`/${key}/`, schema, body})); }
function buildSitemap(articles) { const staticPaths = ['/', '/fundamentals/', '/grapes/', '/regions/', '/winemaking/', '/about.html', '/contact.html', '/privacy.html', '/search.html']; const urls = [...staticPaths, ...articles.map(article => article.route)]; const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(route => `  <url><loc>${SITE_URL}${route}</loc></url>`).join('\n')}\n</urlset>\n`; fs.writeFileSync(path.join(root, 'sitemap.xml'), xml); }
function visibleText(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
