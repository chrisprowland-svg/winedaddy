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
  for (const id of ['VIS-001','VIS-003','VIS-004','VIS-005','VIS-006','VIS-007','VIS-008','VIS-010','VIS-011','VIS-012','VIS-013','VIS-014','VIS-015','VIS-016','VIS-017','VIS-018','VIS-019','VIS-020','VIS-021','VIS-022','VIS-023','VIS-025','VIS-026','VIS-027','VIS-028','VIS-029','VIS-030','VIS-032','VIS-033','VIS-035','VIS-036','VIS-037','VIS-039','VIS-041','VIS-042','VIS-044']) assert.equal(hasVisualComponent(id), true);
  assert.equal(hasVisualComponent('VIS-999'), false);
});

test('renders Australian map batch with accessible SVG and appropriate boundary disclosure', () => {
  for (const id of ['VIS-004','VIS-007','VIS-015','VIS-017','VIS-018','VIS-019','VIS-020','VIS-025']) {
    const html = renderVisualComponents(`<!-- VISUAL:${id} -->`);
    assert.match(html, /<svg[^>]+role="img"/);
    assert.match(html, /<title/);
    assert.match(html, /<desc/);
    if (id === 'VIS-007') {
      assert.match(html, /Wine Australia’s spatial translation/);
      assert.match(html, /textual GI description remains the legal definition/);
    } else {
      assert.match(html, /not a legal boundary map/i);
    }
  }
});

test('renders every third-batch component as accessible semantic HTML', () => {
  for (const id of ['VIS-001','VIS-010','VIS-011','VIS-012','VIS-016','VIS-026','VIS-027','VIS-035','VIS-036','VIS-037','VIS-039','VIS-041']) {
    const html = renderVisualComponents(`<!-- VISUAL:${id} -->`);
    assert.match(html, new RegExp(`id="${id.toLowerCase()}"`));
    assert.match(html, /aria-labelledby=/);
    assert.match(html, /<figcaption>/);
    assert.doesNotMatch(html, /<img\b/);
  }
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
