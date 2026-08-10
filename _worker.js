export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    let html = await response.text();

    // PR #27 reader boundary: strip only internal material inside the article
    // before the approved Highlights section. Keep the page hero and <head>
    // metadata intact.
    html = html.replace(
      /(<article\b[^>]*>)[\s\S]*?(<section class="highlights">)/i,
      '$1$2'
    );

    // Runtime QA must inspect reader article content only. The page hero can
    // legitimately repeat the public title/description and must not trigger a
    // raw-metadata false positive.
    const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    const articleHtml = articleMatch ? articleMatch[1] : '';
    const visibleArticle = articleHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/\s+/g, ' ')
      .trim();

    if (!/<section class="highlights">/i.test(html)) {
      return new Response('Department 7 reader-boundary QA blocked this preview page.', {
        status: 500,
        headers: {'content-type': 'text/plain; charset=utf-8', 'x-winedaddy-qa': 'reader-boundary-fail'}
      });
    }

    if (/Front matter/i.test(visibleArticle) || /(?:^|\s)(?:title|description|canonical|slug|primary entity|parent cluster|audience|article type|article_type|status|route|primary topic|reading time|primary question)\s*:\s*/i.test(visibleArticle)) {
      return new Response('Department 7 reader-boundary QA blocked this preview page.', {
        status: 500,
        headers: {'content-type': 'text/plain; charset=utf-8', 'x-winedaddy-qa': 'reader-boundary-fail'}
      });
    }

    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    headers.set('X-WineDaddy-QA', 'reader-boundary-pass');
    headers.delete('content-length');
    return new Response(html, {status: response.status, statusText: response.statusText, headers});
  }
};
