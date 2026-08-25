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
  assert.equal(hasVisualComponent('VIS-999'), false);
});
