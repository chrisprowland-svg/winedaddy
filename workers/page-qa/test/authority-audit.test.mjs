import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('../../../scripts/audit-authority.mjs',import.meta.url));
function fixture(t, {broken=false, badIdentity=false, reviewedHealth=false, staleReview=false}={}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'winedaddy-authority-test-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'content/knowledge'),{recursive:true});
  const articles=[{slug:'first',route:'/first/',title:'First topic',description:'A clear description.',section:'fundamentals',source:'first.md'},{slug:'syrah-vs-shiraz',route:'/syrah-vs-shiraz/',title:'Syrah vs Shiraz',description:'A different topic.',section:'grapes',source:'second.md'}];
  fs.writeFileSync(path.join(root,'content/articles.json'),JSON.stringify({articles}));
  fs.writeFileSync(path.join(root,'content/knowledge/relationships.json'),JSON.stringify({relationships:badIdentity?[{from:'wd:grape_variety:syrah-vs-shiraz',to:'wd:grape_variety:first',predicate:'same_as_grape'}]:[]}));
  const firstSource=`# First\n\n## Highlights\n\nA useful introduction for people who are pregnant.\n\n[Read more](${broken?'/missing/':'/syrah-vs-shiraz/?ref=test#section'})\n`;
  fs.writeFileSync(path.join(root,'first.md'),firstSource);
  fs.writeFileSync(path.join(root,'second.md'),'# Second\n\n## Highlights\n\nA completely different article about grape names.\n');
  if (reviewedHealth) {
    fs.mkdirSync(path.join(root,'content/editorial'),{recursive:true});
    const sourceDigest=staleReview?'stale':crypto.createHash('sha256').update(firstSource).digest('hex');
    fs.writeFileSync(path.join(root,'content/editorial/authority-reviews.json'),JSON.stringify({reviews:{first:{scope:'health_safety',sourceDigest}}}));
  }
  const result=spawnSync(process.execPath,[script,'--gate'],{cwd:root,encoding:'utf8'});
  const report=JSON.parse(fs.readFileSync(path.join(root,'reports/authority-audit.json'),'utf8'));
  return {result,report};
}
test('authority triage distinguishes unknown provenance from confirmed errors',t=>{
  const {result,report}=fixture(t);
  assert.equal(result.status,0);
  assert.equal(report.totals.confirmedDefects,0);
  assert.equal(report.pages.find(row=>row.slug==='first').editorialOutbound,1);
  assert.equal(report.measurementBaseline.organicClicks,null);
  assert.ok(report.findings.filter(item=>item.code==='provenance_unverified').every(item=>item.status==='review_flag'));
});
test('authority gate blocks unresolved canonical source links',t=>{
  const {result,report}=fixture(t,{broken:true});
  assert.equal(result.status,1);
  assert.ok(report.findings.some(item=>item.code==='unresolved_source_link'&&item.status==='confirmed_defect'));
});
test('authority gate blocks comparison/profile identity mistakes',t=>{
  const {result,report}=fixture(t,{badIdentity:true});
  assert.equal(result.status,1);
  assert.ok(report.findings.some(item=>item.code==='comparison_identity_error'));
});
test('health review is valid only for the reviewed source digest',t=>{
  const current=fixture(t,{reviewedHealth:true});
  assert.equal(current.report.totals.currentHealthSafetyReviews,1);
  assert.ok(!current.report.findings.some(item=>item.slug==='first'&&item.code==='health_safety_claim_review'));
  const stale=fixture(t,{reviewedHealth:true,staleReview:true});
  assert.equal(stale.report.totals.currentHealthSafetyReviews,0);
  assert.ok(stale.report.findings.some(item=>item.slug==='first'&&item.code==='health_safety_claim_review'));
});
