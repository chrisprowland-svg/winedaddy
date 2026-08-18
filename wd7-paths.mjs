export function publicationPaths(rawSlug, rawCanonical) {
  const suppliedCanonical = String(rawCanonical || '').trim();
  const canonical = suppliedCanonical.startsWith('/')
    ? `https://winedaddy.com.au${suppliedCanonical}`
    : suppliedCanonical;
  const canonicalUrl = new URL(canonical);
  if (!['winedaddy.com.au', 'www.winedaddy.com.au'].includes(canonicalUrl.hostname)) {
    throw new Error('canonical origin mismatch');
  }
  if (canonicalUrl.protocol !== 'https:') throw new Error('canonical origin mismatch');

  const canonicalPath = canonicalUrl.pathname;
  const slug = String(rawSlug || '').trim().replace(/^\/+|\/+$/g, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('invalid slug');
  if (canonicalPath !== `/${slug}/`) throw new Error('slug and canonical path mismatch');

  return { slug, canonical: `https://winedaddy.com.au${canonicalPath}`, canonicalPath, outputPath: `${slug}/index.html` };
}

export function websiteSection(jobId, topic) {
  if (/\bwine region\b/i.test(String(topic || ''))) return {slug: 'regions', name: 'Regions'};
  const epic = String(jobId || '').slice(3, 5);
  if (epic === '02') return {slug: 'grapes', name: 'Grapes'};
  if (epic === '05') return {slug: 'winemaking', name: 'Winemaking'};
  if (epic === '03') return {slug: 'regions', name: 'Regions'};
  return {slug: 'fundamentals', name: 'Wine Fundamentals'};
}
