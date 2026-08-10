import fs from 'node:fs';
import path from 'node:path';
import { marked } from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/marked/lib/marked.esm.js';

const articles = [
  ['red-wine-vs-white-wine', 'Red Wine vs White Wine: What’s the Difference?', 'Understand how red and white wine are made, how they usually taste, and how to choose between them with confidence.'],
  ['what-is-rose', 'What Is Rosé? A Beginner’s Guide to Pink Wine', 'Rosé is a wine style, not a single grape or sweetness level. Learn how it gets its colour and how to choose, serve and enjoy it.'],
  ['what-is-sparkling-wine', 'What Is Sparkling Wine? A Beginner’s Guide', 'Learn what creates the bubbles, how sparkling wine is made and why Champagne is one protected regional style.'],
  ['what-is-sweet-wine', 'What Is Sweet Wine? A Beginner’s Guide', 'Learn what makes wine taste sweet, how residual sugar works and why fruity does not necessarily mean sweet.'],
  ['what-is-fortified-wine', 'What Is Fortified Wine? A Beginner’s Guide', 'Fortified wine is wine with distilled spirit added. Learn why some styles are sweet, others dry and what Australian fortified terms mean.'],
  ['what-is-pinot-noir', 'What Is Pinot Noir? A Beginner’s Guide to the Red Wine', 'Pinot Noir is a red grape variety known for fresh acidity, red-fruit flavours and often lighter to medium-bodied wines. Learn what it tastes like, whether it is sweet and where it is grown in Australia.'],
  ['what-is-shiraz', 'What Is Shiraz? A Beginner’s Guide to Australia’s Favourite Red Grape', 'Shiraz is a versatile red wine grape known as Syrah internationally. Learn what Shiraz tastes like, whether it is sweet and how Australian regions shape its style.'],
  ['what-is-chardonnay', 'What Is Chardonnay? A Beginner’s Guide to Its Flavours and Styles', 'Chardonnay is a versatile white wine grape that can make fresh, citrusy, oaky, creamy, still or sparkling wines. Learn what it tastes like and why styles vary.'],
  ['what-is-pinot-gris-pinot-grigio', 'What Is Pinot Gris / Pinot Grigio? A Beginner’s Guide', 'Pinot Gris and Pinot Grigio are names for the same grape. Learn why both appear on labels, how the styles can differ and what Australian drinkers should look for.'],
  ['what-is-sauvignon-blanc', 'What Is Sauvignon Blanc? A Beginner’s Guide to Its Flavour and Style', 'Sauvignon Blanc is a fresh, aromatic white wine grape variety. Learn what it tastes like, whether it is sweet and how Australian styles vary.'],
  ['what-is-riesling', 'What Is Riesling? A Beginner’s Guide to This Aromatic White Wine', 'Riesling is an aromatic white grape that can make dry, off-dry and sweet wines. Learn how acidity, fruitiness and Australian regions shape its style.', 'Grapes'],
  ['what-is-cabernet-sauvignon', 'What Is Cabernet Sauvignon?', 'Cabernet Sauvignon is a structured red grape known for dark fruit, acidity and firm tannin. Learn how its style varies and where it thrives in Australia.', 'Grapes'],
  ['tasmania-wine-region', 'Tasmania Wine Region: What It’s Like and What Wines It’s Known For', 'Explore Tasmania’s cool maritime wine region, its growing areas and the sparkling wine, Pinot Noir, Chardonnay and Riesling it is known for.', 'Regions'],
  ['mornington-peninsula-wine-region', 'Mornington Peninsula Wine Region: Pinot Noir, Chardonnay and Maritime Climate', 'Learn why Mornington Peninsula’s maritime setting, varied sites, Pinot Noir and Chardonnay make it one of Victoria’s distinctive wine regions.', 'Regions'],
  ['yarra-valley-wine-region', 'Yarra Valley Wine Region: Wines, Climate and What to Expect', 'Explore the Yarra Valley’s varied climate, elevations and key wines, including Pinot Noir, Chardonnay, Cabernet Sauvignon and sparkling wine.', 'Regions'],
  ['adelaide-hills-wine-region', 'Adelaide Hills Wine Region: A Beginner’s Guide', 'Learn how elevation, local variation and a cool-climate reputation shape Adelaide Hills Chardonnay, Sauvignon Blanc, Pinot Noir and Shiraz.', 'Regions'],
  ['barossa-valley-wine-region', 'Barossa Valley Wine Region: Shiraz, Old Vines and More', 'Explore Barossa Valley Shiraz, Grenache, old vines, climate and history, plus what the regional name can and cannot tell you about a wine.', 'Regions'],
  ['mclaren-vale-wine-region', 'McLaren Vale Wine Region: Shiraz, Grenache and Coastal South Australia', 'Learn about McLaren Vale’s Mediterranean climate, local variation and its best-known grapes, including Shiraz, Grenache and Cabernet Sauvignon.', 'Regions'],
  ['margaret-river-wine-region', 'Margaret River Wine Region: What It Is Known For', 'Explore Margaret River’s maritime climate and its reputation for Cabernet Sauvignon, Chardonnay and Sauvignon Blanc–Semillon blends.', 'Regions'],
  ['hunter-valley-wine-region', 'Hunter Valley Wine Region: What It Is and What It Is Known For', 'Learn why the Hunter Valley is known for distinctive Semillon and Shiraz, and how its warm, humid conditions shape the region’s wines.', 'Regions'],
];

const nav = '<header class="site-header"><nav class="nav"><a class="logo" href="/">Wine<span>Daddy</span></a><button class="menu" aria-label="Toggle menu">Menu</button><div class="nav-links"><a href="/grapes/">Grapes</a><a href="/regions/">Regions</a><a href="/winemaking/">Winemaking</a><a href="/about.html">About</a></div></nav></header>';
const footer = '<footer class="footer"><div class="footer-inner"><div><a class="logo" href="/">Wine<span>Daddy</span></a><p class="small">Clear, useful wine knowledge without the theatre.</p></div><div><b>Explore</b><a href="/grapes/">Grapes</a><a href="/regions/">Regions</a><a href="/winemaking/">Winemaking</a></div><div><b>WineDaddy</b><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/privacy.html">Privacy</a></div></div></footer>';
const analyticsHead = '<!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-M281DG8YTP"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag(\'js\',new Date());gtag(\'config\',\'G-M281DG8YTP\');</script><!-- Meta Pixel Code --><script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version=\'2.0\';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,\'script\',\'https://connect.facebook.net/en_US/fbevents.js\');fbq(\'init\',\'1085436810811087\');fbq(\'track\',\'PageView\');</script><!-- End Meta Pixel Code -->';
const metaPixelNoScript = '<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1085436810811087&amp;ev=PageView&amp;noscript=1" alt=""></noscript>';

for (const [slug, title, description, articleSection = 'Wine fundamentals'] of articles) {
  const source = fs.readFileSync(path.join('article-source', `${slug}.md`), 'utf8');
  // Research references and QA notes belong in the internal work package, not
  // on the reader-facing page. Everything from the evidence appendix onward
  // is deliberately excluded from publication.
  const md = source.replace(/\n(?:#{1,3}\s+(?:References|Claim-to-Source Notes|Unresolved Flags)\s*|BEGIN INTERNAL EDITORIAL APPENDIX\s+—\s+NOT FOR PUBLICATION)\n[\s\S]*$/i, '\n');
  const sourceHeading = md.match(/^# (.+)$/m)?.[1];
  if (!sourceHeading || /^Highlights$/i.test(sourceHeading)) {
    throw new Error(`${slug}: source must begin with the article title, not Highlights`);
  }
  if (!/^## Highlights\s*$/im.test(md)) {
    throw new Error(`${slug}: source must include a level-two Highlights section`);
  }
  if (/^\*\*(?:Canonical (?:URL|route)|Article type|Last (?:reviewed|updated|researched)):\*\*/im.test(md)) {
    throw new Error(`${slug}: internal publication metadata reached the reader article`);
  }
  const firstHeading = sourceHeading && !/^Highlights$/i.test(sourceHeading)
    ? sourceHeading
    : title.replace(/\s+A Beginner(?:’s|'s) Guide.*$/i, '');
  let body = marked.parse(md);
  body = body.replace(/^<h1>.*?<\/h1>\s*/, '');
  // The page hero owns the sole h1. Editorial top-level sections are article
  // sections and must not inherit the oversized hero treatment.
  body = body.replace(/<h1([^>]*)>/g, '<h2$1>').replace(/<\/h1>/g, '</h2>');
  body = body.replace(/<h2>Highlights<\/h2>([\s\S]*?<\/ul>)/, '<section class="highlights"><h2>Highlights</h2>$1</section>');
  body = body.replace(/<table>/g, '<table class="article-table">');
  if (/<h[1-3][^>]*>\s*(?:References|Claim-to-Source Notes|Unresolved Flags)\s*<\/h[1-3]>|INTERNAL EDITORIAL APPENDIX|NOT FOR PUBLICATION|IMPLEMENTATION NOTE|<(?:strong|b)>\s*(?:Canonical (?:URL|route)|Article type|Last (?:reviewed|updated|researched)):/i.test(body)) {
    throw new Error(`${slug}: internal evidence or QA material reached the public article`);
  }
  if (/<h1(?:\s|>)/i.test(body)) {
    throw new Error(`${slug}: article body contains an h1; the page hero must be the only h1`);
  }
  const canonical = `https://winedaddy.com.au/${slug}/`;
  const schema = JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Article',headline:title,description,mainEntityOfPage:canonical,articleSection,inLanguage:'en-AU',author:{'@type':'Organization',name:'WineDaddy'},publisher:{'@type':'Organization',name:'WineDaddy'}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:'https://winedaddy.com.au/'},{'@type':'ListItem',position:2,name:firstHeading,item:canonical}]}]});
  const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${analyticsHead}<title>${title} | WineDaddy</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="article"><meta property="og:url" content="${canonical}"><meta property="og:site_name" content="WineDaddy"><link rel="stylesheet" href="/assets/styles.css"><script type="application/ld+json">${schema}</script></head><body>${metaPixelNoScript}${nav}<main><section class="page-hero"><div class="section"><p class="breadcrumbs"><a href="/">Home</a> / ${articleSection}</p><p class="eyebrow">${articleSection}</p><h1>${firstHeading}</h1><p class="lede">${description}</p><p class="article-meta">Foundation guide · Beginner friendly · Australian context</p></div></section><article class="article article-wide">${body}</article></main>${footer}<script src="/assets/script.js"></script></body></html>`;
  fs.mkdirSync(slug, {recursive:true});
  fs.writeFileSync(path.join(slug,'index.html'), html);
}
