export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/subscribe') return subscribe(request, env);

    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    let html = await response.text();
    const isArticle = /<article\b[^>]*>[\s\S]*?<\/article>/i.test(html);

    if (isArticle) {
      // PR #27 reader boundary: the approved reader body starts at Highlights.
      // Remove any internal preamble/front matter before that boundary while
      // preserving the public hero, <head> metadata, schema and article copy.
      html = html.replace(
        /(<article\b[^>]*>)[\s\S]*?(<aside class="(?:geography-panel|entity-links)"[\s\S]*?<section class="highlights">|<section class="highlights">)/i,
        '$1$2'
      );
    }

    // Keep navigation consistent across legacy static pages and newly generated
    // articles without requiring a paid content-stage rerun.
    const primaryNav = '<div class="nav-links"><details class="nav-group"><summary>Wine Fundamentals</summary><div class="nav-dropdown"><a href="/fundamentals/">Browse all fundamentals</a><a href="/what-is-wine/">What is wine?</a><a href="/how-to-taste-wine/">How to taste wine</a><a href="/how-to-read-a-wine-label/">Read a wine label</a><a href="/wine-serving-temperature-explained/">Serving temperature</a></div></details><details class="nav-group"><summary>Grapes</summary><div class="nav-dropdown"><a href="/grapes/">Browse all grapes</a><a href="/what-is-pinot-noir/">Pinot Noir</a><a href="/what-is-shiraz/">Shiraz</a><a href="/what-is-chardonnay/">Chardonnay</a><a href="/what-is-cabernet-sauvignon/">Cabernet Sauvignon</a><a href="/what-is-riesling/">Riesling</a><a href="/what-is-sauvignon-blanc/">Sauvignon Blanc</a></div></details><details class="nav-group nav-regions"><summary>Regions</summary><div class="nav-dropdown"><a class="nav-feature" href="/regions/">Browse all regions</a><a class="nav-feature" href="/australian-wine-regions/">Australia</a><span>Australian states &amp; territories</span><a href="/new-south-wales-wine-regions/">New South Wales</a><a href="/victorian-wine-regions/">Victoria</a><a href="/south-australian-wine-regions/">South Australia</a><a href="/western-australian-wine-regions/">Western Australia</a><a href="/queensland-wine-regions/">Queensland</a><a href="/tasmania-wine-region/">Tasmania</a><a href="/australian-capital-territory-wine-regions/">Australian Capital Territory</a><a class="nav-feature" href="/france/">France</a><span>Major French regions</span><a href="/burgundy/">Burgundy</a><a href="/bordeaux/">Bordeaux</a><a href="/champagne/">Champagne</a><a href="/rhone-valley/">Rhône Valley</a><a href="/loire-valley/">Loire Valley</a><a href="/alsace/">Alsace</a><a class="nav-feature" href="/italy/">Italy</a><span>Major Italian regions</span><a href="/piedmont/">Piedmont</a><a href="/tuscany/">Tuscany</a><a href="/veneto/">Veneto</a><a href="/sicily/">Sicily</a><a href="/campania/">Campania</a><a href="/puglia/">Puglia</a><a class="nav-feature" href="/spain/">Spain</a><span>Major Spanish regions</span><a href="/rioja/">Rioja</a><a href="/ribera-del-duero/">Ribera del Duero</a><a href="/priorat/">Priorat</a><a href="/rias-baixas/">Rías Baixas</a><a href="/rueda/">Rueda</a><a href="/jerez/">Jerez</a></div></details><details class="nav-group"><summary>Winemaking</summary><div class="nav-dropdown"><a href="/winemaking/">Browse all winemaking</a><a href="/how-wine-is-made/">How wine is made</a><a href="/what-is-fermentation/">Fermentation</a><a href="/what-does-oak-do-to-wine/">Oak and wine</a><a href="/traditional-method-sparkling-wine-production/">Sparkling wine production</a></div></details><a href="/search.html">Search</a></div>';
    html = html.replace(/<div class="nav-links">[\s\S]*?<\/div><\/nav>/i, `${primaryNav}</nav>`);
    html = html.replace(
      /<div><b>Explore<\/b>[\s\S]*?<\/div><div><b>WineDaddy<\/b>/i,
      '<div><b>Explore</b><a href="/fundamentals/">Wine Fundamentals</a><a href="/grapes/">Grapes</a><a href="/regions/">Regions</a><a href="/winemaking/">Winemaking</a><a href="/search.html">Search</a></div><div><b>WineDaddy</b>'
    );
    const subscribeBox = '<section class="subscribe"><div><p class="kicker">Stay curious</p><h2>Wine knowledge, occasionally.</h2><p>New guides and useful wine explanations. No noise.</p></div><form class="subscribe-form" action="/api/subscribe" method="post"><label for="subscribe-email">Email address</label><div class="subscribe-row"><input id="subscribe-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"><button type="submit">Subscribe</button></div><label class="consent"><input name="consent" type="checkbox" value="yes" required> I agree to receive WineDaddy emails and can unsubscribe at any time.</label><input class="subscribe-trap" name="company" type="text" tabindex="-1" autocomplete="off" aria-hidden="true"><input name="source" type="hidden" value="footer"><p class="subscribe-status" aria-live="polite"></p></form></section>';
    html = html.replace(/<footer class="footer">/i, `${subscribeBox}<footer class="footer">`);
    if (url.pathname === '/privacy' || url.pathname === '/privacy.html') {
      html = html.replace('<h2>Your information</h2>', '<h2>Email subscriptions</h2><p>If you subscribe, WineDaddy stores your email address, consent date and the page or form used to subscribe. We use this information only to send WineDaddy updates you requested. You can unsubscribe at any time, and WineDaddy does not sell subscriber information.</p><h2>Your information</h2>');
    }

    // Blocking QA belongs to the deterministic Department 7 build step. The
    // serving Worker enforces the reader boundary and navigation only.
    const headers = new Headers(response.headers);
    headers.set('X-WineDaddy-QA', isArticle ? 'reader-boundary-enforced' : 'non-article-pass');
    headers.delete('content-length');
    return new Response(html, {status: response.status, statusText: response.statusText, headers});
  }
};

async function subscribe(request, env) {
  if (request.method !== 'POST') return json({ok: false, error: 'Method not allowed'}, 405);
  if (!env.SUBSCRIBERS) return json({ok: false, error: 'Subscriptions are temporarily unavailable.'}, 503);
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).hostname !== new URL(request.url).hostname) return json({ok: false, error: 'Invalid request origin.'}, 403);
  let data;
  try {
    const type = request.headers.get('content-type') || '';
    data = type.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
  } catch { return json({ok: false, error: 'Invalid request.'}, 400); }
  if (String(data.company || '').trim()) return json({ok: true, message: 'Thanks — you’re subscribed.'});
  const email = String(data.email || '').trim().toLowerCase();
  const consent = data.consent === 'yes' || data.consent === true;
  if (!consent) return json({ok: false, error: 'Please confirm you agree to receive emails.'}, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ok: false, error: 'Please enter a valid email address.'}, 400);
  const source = String(data.source || 'website').slice(0, 80);
  const page = request.headers.get('referer')?.slice(0, 500) || null;
  const now = new Date().toISOString();
  await env.SUBSCRIBERS.prepare(`
    INSERT INTO subscribers (email, status, consented_at, source, source_page, created_at, updated_at)
    VALUES (?, 'subscribed', ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET status = 'subscribed', consented_at = excluded.consented_at,
      source = excluded.source, source_page = excluded.source_page, updated_at = excluded.updated_at
  `).bind(email, now, source, page, now, now).run();
  return json({ok: true, message: 'Thanks — you’re subscribed.'});
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}});
}
