export default {
  async fetch(request, env) {
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
    const primaryNav = '<div class="nav-links"><a href="/fundamentals/">Wine Fundamentals</a><a href="/grapes/">Grapes</a><a href="/regions/">Regions</a><a href="/winemaking/">Winemaking</a><a href="/about.html">About</a></div>';
    html = html.replace(/<div class="nav-links">[\s\S]*?<\/div><\/nav>/i, `${primaryNav}</nav>`);
    html = html.replace(
      /<div><b>Explore<\/b>[\s\S]*?<\/div><div><b>WineDaddy<\/b>/i,
      '<div><b>Explore</b><a href="/fundamentals/">Wine Fundamentals</a><a href="/grapes/">Grapes</a><a href="/regions/">Regions</a><a href="/winemaking/">Winemaking</a></div><div><b>WineDaddy</b>'
    );

    // Blocking QA belongs to the deterministic Department 7 build step. The
    // serving Worker enforces the reader boundary and navigation only.
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    headers.set('X-WineDaddy-QA', isArticle ? 'reader-boundary-enforced' : 'non-article-pass');
    headers.delete('content-length');
    return new Response(html, {status: response.status, statusText: response.statusText, headers});
  }
};
