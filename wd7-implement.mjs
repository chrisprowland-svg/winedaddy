import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('usage: node wd7-implement.mjs <job.json>');
const job = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (!/^WD-\d{4}$/.test(job.job_id || '')) throw new Error('invalid job_id');

const editorial = String(job.editorial_output || '');
let reader = editorial.match(/BEGIN READER ARTICLE\s*([\s\S]*?)\s*END READER ARTICLE/i)?.[1]?.trim();
if (!reader) throw new Error(`${job.job_id}: approved reader article boundary missing`);
// Keep explicitly deferred routes as text until their target is actually present.
reader = reader.replace(/\[([^\]]+)\]\(\/[^)]+\),\s*when available/gi, '$1, when available');
// Visual registry markers are production instructions, never reader content.
reader = reader.replace(/^\s*\[VIS-\d{3}\s*(?:[—–-]|:)\s*[^\]]+\]\s*$/gim, '');
// Preserve the Reader Experience Standard when an approved article uses an
// equivalent summary label instead of the canonical site heading.
reader = reader.replace(/^##\s+(?:.+\s+in brief|at a glance|quick facts)\s*$/im, '## Highlights');
const appendix = editorial.split(/END READER ARTICLE/i)[1] || '';
const metadata = editorial.match(/## Front matter and metadata\s*([\s\S]*?)\n## /i)?.[1] || appendix;
const field = name => metadata.match(new RegExp(`^\\s*(?:-\\s+)?(?:\\*\\*)?${name}:(?:\\*\\*)?\\s*(.+?)\\s*$`, 'im'))?.[1]?.replace(/^`|`$/g, '').trim();
const title = field('Title') || reader.match(/^#\s+(.+)$/m)?.[1];
const description = field('Description');
const slug = field('Slug');
const canonical = field('Canonical');
if (!title || !description || !slug || !canonical) throw new Error(`${job.job_id}: required approved metadata missing`);
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${job.job_id}: invalid slug`);
const canonicalUrl = new URL(canonical);
if (canonicalUrl.origin !== 'https://winedaddy.com.au') throw new Error(`${job.job_id}: canonical origin mismatch`);
const canonicalPath = canonicalUrl.pathname;
const outputPath = canonicalPath.endsWith('.html') ? canonicalPath.slice(1) : path.join(canonicalPath.slice(1), 'index.html');
if (!outputPath || outputPath.includes('..')) throw new Error(`${job.job_id}: invalid canonical path`);
if (reader.includes('INTERNAL EDITORIAL APPENDIX') || /\*\*(?:Canonical|Audience|Article type):\*\*/i.test(reader)) throw new Error(`${job.job_id}: internal content crossed reader boundary`);

const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
let body = marked.parse(reader).replace(/^<h1>.*?<\/h1>\s*/s, '');
body = body.replace(/<h1([^>]*)>/g, '<h2$1>').replace(/<\/h1>/g, '</h2>');
body = body.replace(/<h2>([^<]*highlights)<\/h2>([\s\S]*?<\/ul>)/i, '<section class="highlights"><h2>$1</h2>$2</section>');
body = body.replace(/<table>/g, '<table class="article-table">');

const shortTitle = reader.match(/^#\s+(.+)$/m)?.[1] || title;
const epic = job.job_id.slice(3, 5);
const sections = {
  '02': {slug:'grapes', name:'Grapes'},
  '03': {slug:'regions', name:'Regions'},
  '05': {slug:'winemaking', name:'Winemaking'}
};
const section = sections[epic] || {slug:'fundamentals', name:'Wine Fundamentals'};
const hubTitle = epic === '03'
  ? job.topic.replace(/\s+wine region\s*$/i, '').trim()
  : epic === '02'
    ? job.topic.replace(/^what is\s+/i, '').replace(/\?$/, '').trim()
    : shortTitle;
const nav = '<header class="site-header"><nav class="nav"><a class="logo" href="/">Wine<span>Daddy</span></a><button class="menu" aria-label="Toggle menu">Menu</button><div class="nav-links"><a href="/fundamentals/">Wine Fundamentals</a><a href="/grapes/">Grapes</a><a href="/regions/">Regions</a><a href="/winemaking/">Winemaking</a><a href="/about.html">About</a></div></nav></header>';
const footer = '<footer class="footer"><div class="footer-inner"><div><a class="logo" href="/">Wine<span>Daddy</span></a><p class="small">Clear, useful wine knowledge without the theatre.</p></div><div><b>Explore</b><a href="/fundamentals/">Wine Fundamentals</a><a href="/grapes/">Grapes</a><a href="/regions/">Regions</a><a href="/winemaking/">Winemaking</a></div><div><b>WineDaddy</b><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/privacy.html">Privacy</a></div></div></footer>';
const analytics = '<!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-M281DG8YTP"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag(\'js\',new Date());gtag(\'config\',\'G-M281DG8YTP\');</script><!-- Meta Pixel Code --><script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version=\'2.0\';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,\'script\',\'https://connect.facebook.net/en_US/fbevents.js\');fbq(\'init\',\'1085436810811087\');fbq(\'track\',\'PageView\');</script><!-- End Meta Pixel Code -->';
const schema = JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Article',headline:title,description,mainEntityOfPage:canonical,articleSection:section.name,inLanguage:'en-AU',author:{'@type':'Organization',name:'WineDaddy'},publisher:{'@type':'Organization',name:'WineDaddy'}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:'https://winedaddy.com.au/'},{'@type':'ListItem',position:2,name:section.name,item:`https://winedaddy.com.au/${section.slug}/`},{'@type':'ListItem',position:3,name:shortTitle,item:canonical}]}]});
const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${analytics}<title>${escapeHtml(title)} | WineDaddy</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:type" content="article"><meta property="og:url" content="${canonical}"><meta property="og:site_name" content="WineDaddy"><link rel="stylesheet" href="/assets/styles.css"><script type="application/ld+json">${schema}</script></head><body><noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1085436810811087&amp;ev=PageView&amp;noscript=1" alt=""></noscript>${nav}<main><section class="page-hero"><div class="section"><p class="breadcrumbs"><a href="/">Home</a> / <a href="/${section.slug}/">${section.name}</a></p><p class="eyebrow">${section.name}</p><h1>${escapeHtml(shortTitle)}</h1><p class="lede">${escapeHtml(description)}</p><p class="article-meta">Foundation guide · Beginner friendly · Australian context</p></div></section><article class="article article-wide">${body}</article></main>${footer}<script src="/assets/script.js"></script></body></html>`;

fs.mkdirSync(path.dirname(outputPath), {recursive:true});
fs.mkdirSync('article-source', {recursive:true});
fs.writeFileSync(path.join('article-source', `${slug}.md`), `${reader}\n`);
fs.writeFileSync(outputPath, html);

const sitemapPath = 'sitemap.xml';
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
if (!sitemap.includes(`<loc>${canonical}</loc>`)) sitemap = sitemap.replace('</urlset>', `  <url><loc>${canonical}</loc></url>\n</urlset>`);
fs.writeFileSync(sitemapPath, sitemap);

const hubPath = `${section.slug}/index.html`;
let hub = fs.readFileSync(hubPath, 'utf8');
if (!hub.includes(`href="/${slug}/"`)) {
  const card = `<a class="card" href="${canonicalPath}"><div><h3>${escapeHtml(hubTitle)}</h3><p>${escapeHtml(description)}</p></div><b>Read guide →</b></a>`;
  const anchor = '</div></section></main>';
  const position = hub.lastIndexOf(anchor);
  if (position < 0) throw new Error(`${section.slug} hub insertion anchor missing`);
  hub = `${hub.slice(0, position)}${card}${hub.slice(position)}`;
}
fs.writeFileSync(hubPath, hub);

fs.mkdirSync('.wd7/results', {recursive:true});
fs.writeFileSync(`.wd7/results/${job.job_id}.json`, JSON.stringify({job_id:job.job_id,slug,canonical,canonical_path:canonicalPath,output_path:outputPath,title,hub_title:hubTitle,description,section:section.slug,qa_status:'built',built_at:new Date().toISOString()}, null, 2));
console.log(`WD7 implementation built ${job.job_id} at ${canonicalPath}`);
