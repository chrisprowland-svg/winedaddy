import fs from 'node:fs';
import path from 'node:path';
import {SITE_URL, escapeHtml, pageDocument} from '../site/site.mjs';

const root = process.cwd();
const registry = JSON.parse(fs.readFileSync(path.join(root, 'content/reviews.json'), 'utf8'));
if (registry.version !== 1 || !Array.isArray(registry.reviews)) throw new Error('content/reviews.json must use governed review schema version 1');

const required = ['slug','wine','producer','vintage','region','country','reviewed_on','sample_source','verdict','best_for','tasting_note','value_note'];
const seen = new Set();
for (const review of registry.reviews) {
  for (const field of required) if (!review[field]) throw new Error(`${review.slug || 'review'}: missing ${field}`);
  if (seen.has(review.slug)) throw new Error(`${review.slug}: duplicate review slug`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewed_on)) throw new Error(`${review.slug}: reviewed_on must be YYYY-MM-DD`);
  if (!['purchased','provided','event','venue'].includes(review.sample_source)) throw new Error(`${review.slug}: invalid sample_source`);
  seen.add(review.slug);
}

const reviewCards = registry.reviews.length ? `<div class="review-grid">${registry.reviews.map(review => `<article class="review-card"><p class="kicker">${escapeHtml(review.region)} · ${escapeHtml(review.vintage)}</p><h2><a href="/reviews/${escapeHtml(review.slug)}/">${escapeHtml(review.producer)} ${escapeHtml(review.wine)}</a></h2><p>${escapeHtml(review.verdict)}</p><span>${escapeHtml(review.best_for)}</span></article>`).join('')}</div>` : `<section class="review-empty"><p class="kicker">In preparation</p><h2>The first independent reviews are being tasted.</h2><p>WineDaddy will publish reviews only when the bottle, vintage, tasting date and sample source can be disclosed properly. We will not manufacture placeholder verdicts to fill a directory.</p></section>`;

const schema = {'@context':'https://schema.org','@type':'CollectionPage',name:'Wine reviews',url:`${SITE_URL}/reviews/`,description:'Independent, clearly disclosed wine reviews from WineDaddy.'};
const body = `<main><section class="page-hero"><div class="section"><p class="eyebrow">WineDaddy Reviews</p><h1>Useful verdicts, without the theatre.</h1><p class="lede">Vintage-specific wine reviews that explain taste, value and who the bottle is actually for.</p></div></section><article class="article reviews-intro"><section class="review-principles"><div><p class="kicker">The standard</p><h2>What every review will tell you</h2></div><ul><li>The exact wine and vintage tasted.</li><li>When it was tasted and where the sample came from.</li><li>What it tastes and feels like, in plain language.</li><li>Who it suits, what it costs and whether it represents value.</li></ul></section>${reviewCards}<section><h2>Independence and disclosure</h2><p>A supplied bottle does not buy a favourable review. Paid placement will never determine a verdict. If WineDaddy later earns a commission from a clearly marked retailer link, that commercial relationship will be disclosed and will not change the review.</p><p>Reviews are a record of one bottle and vintage tasted under stated conditions. They are not a guarantee that every bottle will perform identically, and they do not replace responsible drinking guidance.</p></section><section><h2>No mystery scores</h2><p>WineDaddy reviews will lead with a clear verdict, suitability and value assessment rather than pretending that a single number explains the bottle. Any future rating system must be published with its method before it is used.</p></section></article></main>`;
const html = pageDocument({title:'Independent wine reviews',description:'WineDaddy reviews explain what a wine tastes like, who it suits and whether it offers value—with the vintage and sample source clearly disclosed.',canonicalPath:'/reviews/',schema,body});
const out = path.join(root, 'reviews', 'index.html');
fs.mkdirSync(path.dirname(out), {recursive:true});
fs.writeFileSync(out, html);
