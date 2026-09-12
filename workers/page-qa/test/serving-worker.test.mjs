import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../../_worker.js';

test('serving Worker keeps internal authority reports off the public site', async () => {
  for (const pathname of ['/reports/authority-audit.json','/reports/authority-audit.md','/reports/%61uthority-audit.json']) {
    const response = await worker.fetch(new Request(`https://winedaddy.com.au${pathname}`), {ASSETS:{fetch:()=>{throw new Error('Internal report must not reach asset serving');}}});
    assert.equal(response.status,404);
    assert.equal(response.headers.get('X-Robots-Tag'),'noindex');
  }
});

test('serving Worker preserves all governed public context panels', async () => {
  for (const panel of ['geography-panel','entity-links','learning-path-panel','grape-path-panel']) {
    const body = `<article><p>internal preamble</p><aside class="${panel}">Context</aside><section class="highlights"><h2>Highlights</h2></section></article>`;
    const response = await worker.fetch(new Request('https://winedaddy.com.au/example/'), {ASSETS:{fetch:async()=>new Response(body,{headers:{'content-type':'text/html'}})}});
    const html = await response.text();
    assert.ok(html.includes(`class="${panel}"`));
    assert.ok(!html.includes('internal preamble'));
  }
});
