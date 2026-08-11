import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2];
const job = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const resultPath = `.wd7/results/${job.job_id}.json`;
const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
const {slug, canonical} = result;
const html = fs.readFileSync(path.join(slug, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join('article-source', `${slug}.md`), 'utf8');
const errors = [];
const requireMatch = (pattern, message) => { if (!pattern.test(html)) errors.push(message); };
requireMatch(/<meta name="viewport"/i, 'mobile viewport missing');
requireMatch(new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"`, 'i'), 'canonical incorrect');
requireMatch(/<script type="application\/ld\+json">/i, 'JSON-LD missing');
requireMatch(/G-M281DG8YTP/i, 'Google Analytics missing');
requireMatch(/1085436810811087/i, 'Meta Pixel missing');
requireMatch(/<h2>[^<]*Highlights<\/h2>/i, 'Highlights missing');
if ((html.match(/<h1(?:\s|>)/gi)||[]).length !== 1) errors.push('expected exactly one H1');
if (/INTERNAL EDITORIAL APPENDIX|NOT FOR PUBLICATION|BEGIN READER ARTICLE|END READER ARTICLE|Canonical URL:|## Front matter/i.test(html + source)) errors.push('internal workflow material leaked');
for (const match of html.matchAll(/href="(\/[^"#?]+)[^\"]*"/g)) {
  const route = match[1];
  const exists = route === '/' ? fs.existsSync('index.html') : /\.[a-z]+$/i.test(route) ? fs.existsSync(route.slice(1)) : fs.existsSync(path.join(route.slice(1),'index.html'));
  if (!exists) errors.push(`broken internal link ${route}`);
}
if (!fs.readFileSync('sitemap.xml','utf8').includes(`<loc>${canonical}</loc>`)) errors.push('sitemap entry missing');
if (!fs.readFileSync('fundamentals/index.html','utf8').includes(`href="/${slug}/"`)) errors.push('fundamentals hub link missing');
if (!/X-Robots-Tag:\s*noindex,\s*nofollow/i.test(fs.readFileSync('_headers','utf8'))) errors.push('preview noindex header missing');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
Object.assign(result,{qa_status:'passed',qa_checks:['build','reader-boundary','canonical','schema','analytics','internal-links','sitemap','hub-discoverability','preview-noindex'],qa_passed_at:new Date().toISOString()});
fs.writeFileSync(resultPath, JSON.stringify(result,null,2));
console.log(`Department 7 Deployment QA passed for ${job.job_id}.`);
