export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    let html = await response.text();
    // The approved article contract starts visible article copy at Highlights.
    // Any material between <article> and Highlights is internal preamble/front
    // matter and must never reach the reader page. HTML head/schema metadata is
    // intentionally untouched.
    html = html.replace(
      /(<article\b[^>]*>)[\s\S]*?(<section class="highlights">)/i,
      '$1$2'
    );

    const visible = html
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ');

    if (/Front matter/i.test(visible) || /(?:^|\s)(?:title|description|canonical|slug|primary entity|parent cluster|audience|article type|article_type|status|route|primary topic|reading time|primary question)\s*:\s*/i.test(visible)) {
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
