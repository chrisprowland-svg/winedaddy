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
        /(<article\b[^>]*>)[\s\S]*?(<section class="highlights">)/i,
        '$1$2'
      );
    }

    // Keep navigation consistent across legacy static pages and newly generated
    // articles without requiring a paid content-stage rerun.
    const primaryNav = '<div class="nav-links"><a href="/fundamentals/">Wine Fundamentals</a><a href="/grapes/">Grapes</a><a href="/regions/">Regions</a><a href="/winemaking/">Winemaking</a><a href="/about.html">About</a><a href="/search.html">Search</a></div>';
    html = html.replace(/<div class="nav-links">[\s\S]*?<\/div><\/nav>/i, `${primaryNav}</nav>`);
    html = html.replace(
      /<div><b>Explore<\/b>[\s\S]*?<\/div><div><b>WineDaddy<\/b>/i,
      '<div><b>Explore</b><a href="/fundamentals/">Wine Fundamentals</a><a href="/grapes/">Grapes</a><a href="/regions/">Regions</a><a href="/winemaking/">Winemaking</a><a href="/search.html">Search</a></div><div><b>WineDaddy</b>'
    );
    const subscribeBox = '<section class="subscribe"><div><p class="kicker">Stay curious</p><h2>Wine knowledge, occasionally.</h2><p>New guides and useful wine explanations. No noise.</p></div><form class="subscribe-form" action="/api/subscribe" method="post"><label for="subscribe-email">Email address</label><div class="subscribe-row"><input id="subscribe-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"><button type="submit">Subscribe</button></div><label class="consent"><input name="consent" type="checkbox" value="yes" required> I agree to receive WineDaddy emails and can unsubscribe at any time.</label><input class="subscribe-trap" name="company" type="text" tabindex="-1" autocomplete="off" aria-hidden="true"><input name="source" type="hidden" value="footer"><p class="subscribe-status" aria-live="polite"></p></form></section>';
    html = html.replace(/<footer class="footer">/i, `${subscribeBox}<footer class="footer">`);
    if (url.pathname === '/privacy.html') {
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
