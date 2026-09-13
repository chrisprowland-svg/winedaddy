import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// This is risk triage, not a factual certification or search-performance score.
const root = process.cwd();
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const articles = read('content/articles.json').articles;
const relationships = read('content/knowledge/relationships.json').relationships;
const normalizeRoute = route => route.split(/[?#]/)[0].replace(/\/$/, '') || '/';
const routes = new Map(articles.map(article => [normalizeRoute(article.route), article]));
const staticRoutes = new Set(['/', '/fundamentals', '/grapes', '/regions', '/winemaking', '/about.html', '/contact.html', '/privacy.html', '/search.html']);
const normalize = text => text.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const plain = source => source.replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*_`|]/g, ' ').replace(/\s+/g, ' ').trim();
const findings = [];
const add = (article, code, priority, evidence, action, status = 'review_flag') => findings.push({slug:article.slug, route:article.route, section:article.section, code, priority, status, evidence, action});
const incoming = new Map(articles.map(article => [article.slug, new Set()]));
const rows = articles.map(article => {
  const source = fs.readFileSync(path.join(root, article.source), 'utf8');
  const text = plain(source);
  const words = text.split(/\s+/).filter(Boolean).length;
  const headings = [...source.matchAll(/^##\s+(.+)$/gm)].map(match => match[1]);
  const links = [...source.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)|href=["']([^"']+)["']/g)].map(match => match[1] || match[2]);
  const outgoing = new Set();
  let external = 0;
  for (const raw of links) {
    let route;
    if (raw.startsWith('/') && !raw.startsWith('//')) route = normalizeRoute(raw);
    else if (/^https?:\/\/(?:www\.)?winedaddy\.com\.au(?:\/|$)/i.test(raw)) route = normalizeRoute(new URL(raw).pathname);
    else { if (/^https?:\/\//.test(raw)) external++; continue; }
    const target = routes.get(route);
    if (target && target.slug !== article.slug) { outgoing.add(target.slug); incoming.get(target.slug).add(article.slug); }
    else if (!target && !staticRoutes.has(route)) add(article, 'unresolved_source_link', 'high', raw, 'Resolve the destination against the canonical route inventory.', 'confirmed_defect');
  }
  if (!/^#\s+\S/m.test(source) || !/^##\s+Highlights\s*$/im.test(source)) add(article, 'reader_structure', 'critical', 'Missing source title or Highlights heading.', 'Restore the governed reader structure.', 'confirmed_defect');
  if (/INTERNAL EDITORIAL APPENDIX|NOT FOR PUBLICATION|IMPLEMENTATION NOTE|\[Visual:\s*VIS-/i.test(source)) add(article, 'internal_material', 'critical', 'Internal workflow marker in source.', 'Remove internal material from the reader source.', 'confirmed_defect');
  if (words < 500) add(article, 'short_coverage', 'medium', `${words} words; length alone is not evidence of poor quality.`, 'Review whether the primary question and necessary context are fully answered.');
  if (article.description.length < 90 || article.description.length > 210) add(article, 'description_length', 'low', `${article.description.length} characters; this is a house-style flag, not a Google limit.`, 'Review clarity and concision without mechanical truncation.');
  if (!outgoing.size) add(article, 'no_editorial_outbound', 'medium', 'No contextual links to another canonical article in the source; generated cards are separate.', 'Add only useful contextual editorial links after reviewing the article.');
  if (!external) add(article, 'provenance_unverified', 'low', 'No external citation links found in reader source; research records may exist elsewhere.', 'Reconcile the source with WDOS research and editorial approval records. Do not infer factual inaccuracy.');
  const riskTerms = [...new Set((text.match(/\b(?:pregnan\w*|cancer|medication|health benefits|safe to drink|legal(?:ly)?|permitted|prohibited|regulation\w*|sulphur dioxide|sulfur dioxide|methanol)\b/gi) || []).map(term => term.toLowerCase()))];
  if (riskTerms.length) {
    const healthTerms = riskTerms.filter(term => /pregnan|cancer|medication|health benefits|safe to drink|methanol/.test(term));
    add(article, healthTerms.length ? 'health_safety_claim_review' : 'regulatory_technical_claim_review', healthTerms.length ? 'high' : 'medium', riskTerms.join(', '), 'Verify the relevant claims against authoritative current sources; keep educational content distinct from advice.');
  }
  const editorialCrossSections = [...new Set([...outgoing].map(slug => articles.find(item => item.slug === slug).section).filter(section => section !== article.section))];
  return {slug:article.slug, route:article.route, section:article.section, words, headings:headings.length, editorialOutbound:outgoing.size, externalCitationLinks:external, editorialCrossSections, bodyHash:crypto.createHash('sha256').update(normalize(text)).digest('hex'), titleTerms:new Set(normalize(article.title.split(/[:?]/)[0]).split(' ').filter(term => !['what','is','are','a','the','wine','guide','beginner','s'].includes(term)))};
});
for (const row of rows) {
  row.editorialInbound = incoming.get(row.slug).size;
  if (!row.editorialInbound) add(articles.find(article => article.slug === row.slug), 'no_editorial_inbound', 'medium', 'No incoming contextual source links; this does not imply the page is inaccessible through hubs or cards.', 'Review opportunities for relevant contextual links from existing pages.');
}
const duplicates = [];
const overlapCandidates = [];
for (let left = 0; left < rows.length; left++) for (let right = left + 1; right < rows.length; right++) {
  const a = rows[left], b = rows[right];
  if (a.bodyHash === b.bodyHash) {
    duplicates.push([a.slug,b.slug]);
    for (const slug of [a.slug,b.slug]) add(articles.find(article => article.slug === slug), 'identical_source_body', 'high', `${a.slug} / ${b.slug}`, 'Review canonical identity and editorial duplication; do not delete or redirect automatically.', 'confirmed_defect');
  }
  if (a.section !== b.section || !a.titleTerms.size || !b.titleTerms.size) continue;
  const intersection = [...a.titleTerms].filter(term => b.titleTerms.has(term)).length;
  const union = new Set([...a.titleTerms,...b.titleTerms]).size;
  if (intersection >= 2 && intersection / union >= 0.8) overlapCandidates.push({left:a.slug,right:b.slug,titleSimilarity:Number((intersection/union).toFixed(3)),status:'candidate_only',action:'Compare search intent and page scope; Search Console query evidence is required before claiming cannibalisation.'});
}
const priorityOrder = {critical:0,high:1,medium:2,low:3};
for (const relationship of relationships.filter(item => item.predicate === 'same_as_grape')) {
  const article = articles.find(item => relationship.from.endsWith(`:${item.slug}`));
  if (article?.slug.includes('-vs-')) add(article, 'comparison_identity_error', 'high', `${relationship.from} -> ${relationship.to}`, 'Model the comparison article as about the grape, not the same entity.', 'confirmed_defect');
}
findings.sort((a,b) => priorityOrder[a.priority]-priorityOrder[b.priority] || a.slug.localeCompare(b.slug) || a.code.localeCompare(b.code));
const totals = {articles:rows.length, findings:findings.length, confirmedDefects:findings.filter(item => item.status === 'confirmed_defect').length, exactDuplicatePairs:duplicates.length, titleOverlapCandidates:overlapCandidates.length, byPriority:Object.fromEntries(Object.keys(priorityOrder).map(priority => [priority,findings.filter(item => item.priority === priority).length])), byCode:Object.fromEntries([...new Set(findings.map(item => item.code))].sort().map(code => [code,findings.filter(item => item.code === code).length]))};
const bySection = Object.fromEntries([...new Set(rows.map(row => row.section))].sort().map(section => {
  const selected = rows.filter(row => row.section === section);
  return [section,{articles:selected.length,wordsMedian:selected.map(row=>row.words).sort((a,b)=>a-b)[Math.floor(selected.length/2)],noEditorialOutbound:selected.filter(row=>!row.editorialOutbound).length,noEditorialInbound:selected.filter(row=>!row.editorialInbound).length,contextualCrossSectionCoverage:selected.filter(row=>row.editorialCrossSections.length).length}];
}));
const report = {version:1,scope:'Full-corpus automated editorial and authority risk triage; no factual certification.',inputDigest:crypto.createHash('sha256').update(JSON.stringify(articles)+rows.map(row=>row.bodyHash).join('')).digest('hex'),totals,bySection,measurementBaseline:{sourceInventory:'measured',graphRelationships:relationships.length,indexedPages:null,organicImpressions:null,organicClicks:null,rankingQueries:null,aiReferrals:null,relatedReadingEngagement:null,reason:'Search Console and GA reporting data have not been retrieved. Installed tracking tags do not establish visibility or authority.'},findings,overlapCandidates,pages:rows.map(({titleTerms,...row})=>row)};
const target = path.join(root,'reports/authority-audit.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,`${JSON.stringify(report,null,2)}\n`);
const escape = value => String(value).replace(/\|/g,'\\|').replace(/\n/g,' ');
const summary = ['# WineDaddy authority and editorial risk audit','',report.scope,'','No article was rewritten, deleted, redirected or certified as accurate by this audit. Review flags are not confirmed errors. Title similarity is not proof of SEO cannibalisation.','',`Coverage: ${totals.articles} articles. Confirmed structural/link/duplicate findings: ${totals.confirmedDefects}. Title-overlap candidates: ${totals.titleOverlapCandidates}.`,'','## Baseline by section','','| Section | Articles | Median words | No source outbound | No source inbound | Cross-section links |','|---|---:|---:|---:|---:|---:|',...Object.entries(bySection).map(([section,row])=>`| ${section} | ${row.articles} | ${row.wordsMedian} | ${row.noEditorialOutbound} | ${row.noEditorialInbound} | ${row.contextualCrossSectionCoverage} |`),'','## Risk counts','','| Rule | Findings |','|---|---:|',...Object.entries(totals.byCode).map(([code,count])=>`| ${code} | ${count} |`),'','## Highest-priority review queue','','| Page | Priority | Status | Rule | Evidence |','|---|---|---|---|---|',...findings.filter(item=>item.priority==='critical'||item.priority==='high').slice(0,100).map(item=>`| [${item.slug}](https://winedaddy.com.au${item.route}) | ${item.priority} | ${item.status} | ${item.code} | ${escape(item.evidence)} |`),'','## Measurement limitations','','Indexing, impressions, clicks, queries, AI referrals and Explore next engagement remain unmeasured. Import authorised Search Console/GA reports to establish these baselines. A risk register is not a substitute for sourced editorial review.',''];
fs.writeFileSync(path.join(root,'reports/authority-audit.md'),summary.join('\n'));
console.log(JSON.stringify({totals,bySection},null,2));
if (process.argv.includes('--gate') && findings.some(item=>item.status==='confirmed_defect')) process.exitCode=1;
