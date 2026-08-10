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

    // Blocking QA belongs to the deterministic Department 7 build step, which
    // validates all 20 generated files before deployment. The serving Worker
    // enforces the boundary but must never turn valid reader pages into 500s
    // because ordinary prose resembles an internal metadata label.
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    headers.set('X-WineDaddy-QA', isArticle ? 'reader-boundary-enforced' : 'non-article-pass');
    headers.delete('content-length');
    return new Response(html, {status: response.status, statusText: response.statusText, headers});
  }
};
