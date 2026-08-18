import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationPaths, websiteSection } from '../wd7-paths.mjs';

test('accepts the approved route-style slug used by Mudgee', () => {
  assert.deepEqual(
    publicationPaths('/mudgee-wine-region/', 'https://www.winedaddy.com.au/mudgee-wine-region/'),
    {
      slug: 'mudgee-wine-region',
      canonical: 'https://winedaddy.com.au/mudgee-wine-region/',
      canonicalPath: '/mudgee-wine-region/',
      outputPath: 'mudgee-wine-region/index.html',
    },
  );
});

test('accepts a bare slug with the canonical production host', () => {
  assert.equal(publicationPaths('mudgee-wine-region', 'https://winedaddy.com.au/mudgee-wine-region/').slug, 'mudgee-wine-region');
});

test('normalises an approved root-relative canonical', () => {
  assert.deepEqual(publicationPaths('tumbarumba-wine-region', '/tumbarumba-wine-region/'), {
    slug: 'tumbarumba-wine-region',
    canonical: 'https://winedaddy.com.au/tumbarumba-wine-region/',
    canonicalPath: '/tumbarumba-wine-region/',
    outputPath: 'tumbarumba-wine-region/index.html',
  });
});

test('rejects a route disagreement', () => {
  assert.throws(() => publicationPaths('/orange-wine-region/', 'https://winedaddy.com.au/mudgee-wine-region/'), /mismatch/);
});

test('rejects an external canonical', () => {
  assert.throws(() => publicationPaths('mudgee-wine-region', 'https://example.com/mudgee-wine-region/'), /origin/);
});

test('routes Batch 1B region jobs to the Regions hub regardless of numeric series', () => {
  assert.deepEqual(websiteSection('WD-0911', 'Mudgee wine region'), {slug: 'regions', name: 'Regions'});
});
