import assert from 'node:assert/strict';
import test from 'node:test';
import {hasVisualComponent, renderVisualComponents} from '../site/visual-components.mjs';

test('renders a governed visual reference as canonical semantic HTML', () => {
  const html = renderVisualComponents('<p>Before</p><!-- VISUAL:VIS-009 --><p>After</p>');
  assert.match(html, /<figure class="learning-visual" id="vis-009">/);
  assert.match(html, /How to read a wine label/);
  assert.doesNotMatch(html, /VISUAL:VIS-009/);
});

test('rejects an unregistered visual reference', () => {
  assert.throws(() => renderVisualComponents('<!-- VISUAL:VIS-999 -->'), /Unknown visual component/);
});

test('reports registered visual components', () => {
  assert.equal(hasVisualComponent('VIS-009'), true);
  for (const id of ['VIS-003','VIS-005','VIS-006','VIS-008','VIS-013','VIS-014','VIS-021','VIS-022','VIS-023','VIS-028','VIS-029','VIS-030','VIS-032','VIS-033','VIS-042','VIS-044']) assert.equal(hasVisualComponent(id), true);
  assert.equal(hasVisualComponent('VIS-999'), false);
});

test('renders every second-batch component as accessible semantic HTML', () => {
  for (const id of ['VIS-022','VIS-028','VIS-029','VIS-030','VIS-032','VIS-033','VIS-042','VIS-044']) {
    const html = renderVisualComponents(`<!-- VISUAL:${id} -->`);
    assert.match(html, new RegExp(`id="${id.toLowerCase()}"`));
    assert.match(html, /aria-labelledby=/);
    assert.match(html, /<figcaption>/);
    assert.doesNotMatch(html, /<img\b/);
  }
});

test('renders every first-batch component as accessible semantic HTML', () => {
  for (const id of ['VIS-003','VIS-005','VIS-006','VIS-008','VIS-013','VIS-014','VIS-021','VIS-023']) {
    const html = renderVisualComponents(`<!-- VISUAL:${id} -->`);
    assert.match(html, new RegExp(`id="${id.toLowerCase()}"`));
    assert.match(html, /aria-labelledby=/);
    assert.match(html, /<figcaption>/);
    assert.doesNotMatch(html, /<img\b/);
  }
});
