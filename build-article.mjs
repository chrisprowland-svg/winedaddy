import fs from 'node:fs';
import path from 'node:path';
import { marked } from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/marked/lib/marked.esm.js';

const articles = [
  ['red-wine-vs-white-wine', 'Red Wine vs White Wine: What’s the Difference?', 'Understand how red and white wine are made, how they usually taste, and how to choose between them with confidence.'],
  ['what-is-rose', 'What Is Rosé? A Beginner’s Guide to Pink Wine', 'Rosé is a wine style, not a single grape or sweetness level. Learn how it gets its colour and how to choose, serve and enjoy it.'],
  ['what-is-sparkling-wine', 'What Is Sparkling Wine? A Beginner’s Guide', 'Learn what creates the bubbles, how sparkling wine is made and why Champagne is one protected regional style.'],
  ['what-is-sweet-wine', 'What Is Sweet Wine? A Beginner’s Guide', 'Learn what makes wine taste sweet, how residual sugar works and why fruity does not necessarily mean sweet.'],
  ['what-is-fortified-wine', 'What Is Fortified Wine? A Beginner’s Guide', 'Fortified wine is wine with distilled spirit added. Learn why some styles are sweet, others dry and what Australian fortified terms mean.'],
];

const nav = '<header class="site-header"><nav class="nav"><a class="logo" href="/">Wine<span>Daddy</span></a><button class="menu" aria-label="Toggle menu">Menu</button><div class="nav-links"><a href="/grapes/">Grapes</a><a href="/regions/">Regions</a><a href="/winemaking/">Winemaking</a><a href="/about.html">About</a></div></nav></header>';
const footer = '<footer class="footer"><div class="footer-inner"><div><a class="logo" href="/">Wine<span>Daddy</span></a><p class="small">Clear, useful wine knowledge without the theatre.</p></div><div><b>Explore</b><a href="/grapes/">Grapes</a><a href="/regions/">Regions</a><a href="/winemaking/">Winemaking</a></div><div><b>WineDaddy</b><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/privacy.html">Privacy</a></div></div></footer>';

for (const [slug, title, description] of articles) {
  const md = fs.readFileSync(path.join('article-source', `${slug}.md`), 'utf8');
  const firstHeading = md.match(/^# (.+)$/m)?.[1] || title;
  let body = marked.parse(md);
  body = body.replace(/^<h1>.*?<\/h1>\s*/, '');
  body = body.replace('<h2>Highlights</h2>', '<section class="highlights"><h2>Highlights</h2>').replace(/<\/ul>\s*<h2>Quick [Aa]nswer/, '</ul></section><h2>Quick answer');
  body = body.replace(/<table>/g, '<table class="article-table">');
  const canonical = `https://winedaddy.com.au/${slug}/`;
  const schema = JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Article',headline:title,description,mainEntityOfPage:canonical,articleSection:'Wine fundamentals',inLanguage:'en-AU',author:{'@type':'Organization',name:'WineDaddy'},publisher:{'@type':'Organization',name:'WineDaddy'}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:'https://winedaddy.com.au/'},{'@type':'ListItem',position:2,name:firstHeading,item:canonical}]}]});
  const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | WineDaddy</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="article"><meta property="og:url" content="${canonical}"><meta property="og:site_name" content="WineDaddy"><link rel="stylesheet" href="/assets/styles.css"><script type="application/ld+json">${schema}</script></head><body>${nav}<main><section class="page-hero"><div class="section"><p class="breadcrumbs"><a href="/">Home</a> / Wine fundamentals</p><p class="eyebrow">Wine fundamentals</p><h1>${firstHeading}</h1><p class="lede">${description}</p><p class="article-meta">Foundation guide · Beginner friendly · Australian context</p></div></section><article class="article article-wide">${body}</article></main>${footer}<script src="/assets/script.js"></script></body></html>`;
  fs.mkdirSync(slug, {recursive:true});
  fs.writeFileSync(path.join(slug,'index.html'), html);
}
