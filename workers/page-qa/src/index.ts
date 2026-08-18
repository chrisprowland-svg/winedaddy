type CheckResult = {path: string; status: number; passed: boolean; defects: string[]};
interface Env { MAX_PATHS: string }
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') return json({status: 'ok', service: 'winedaddy-page-qa', version: '1.0.0'});
    if (request.method !== 'POST' || url.pathname !== '/check') return json({error: 'Use POST /check with {baseUrl, paths}.'}, 404);
    let payload: unknown;
    try { payload = await request.json(); } catch { return json({error: 'Invalid JSON body.'}, 400); }
    if (!payload || typeof payload !== 'object') return json({error: 'JSON body must be an object.'}, 400);
    const body = payload as Record<string, unknown>;
    const base = validBase(typeof body.baseUrl === 'string' ? body.baseUrl : undefined);
    if (!base) return json({error: 'baseUrl must be winedaddy.com.au or a winedaddy.pages.dev deployment.'}, 400);
    const maxPaths = Math.min(Number(env.MAX_PATHS || 40), 40);
    const paths = Array.isArray(body.paths) && body.paths.every(path => typeof path === 'string') ? [...new Set(body.paths)] : [];
    if (!paths.length || paths.length > maxPaths || paths.some(path => !/^\/(?:[a-z0-9-]+\/)*(?:[a-z0-9-]+\/|[a-z0-9-]+\.html)$/.test(path))) return json({error: `Provide 1-${maxPaths} safe article paths.`}, 400);
    const results: CheckResult[] = [];
    for (let index = 0; index < paths.length; index += 6) results.push(...await Promise.all(paths.slice(index, index + 6).map(path => checkPage(base, path))));
    const failed = results.filter(result => !result.passed);
    console.log(JSON.stringify({event: 'page_qa', base: base.origin, checked: results.length, failed: failed.length}));
    return json({status: failed.length ? 'failed' : 'passed', baseUrl: base.origin, checked: results.length, failed: failed.length, results}, failed.length ? 422 : 200);
  }
} satisfies ExportedHandler<Env>;
function validBase(value?: string): URL | null { try { const url = new URL(value || ''); if (url.protocol !== 'https:') return null; if (url.hostname === 'winedaddy.com.au' || url.hostname === 'www.winedaddy.com.au' || /(?:^|\.)winedaddy\.pages\.dev$/.test(url.hostname)) return new URL(url.origin); } catch {} return null; }
async function checkPage(base: URL, path: string): Promise<CheckResult> { const defects: string[] = []; try { const response = await fetch(new URL(path, base), {headers: {'User-Agent': 'WineDaddy-Page-QA/1.0'}}); if (response.status !== 200) defects.push(`HTTP ${response.status}`); const html = await response.text(); if ((html.match(/<h1(?:\s|>)/gi) || []).length !== 1) defects.push('expected exactly one H1'); if (!/<link rel="canonical" href="https:\/\/(?:www\.)?winedaddy\.com\.au\//i.test(html)) defects.push('canonical missing or invalid'); if (!/<script type="application\/ld\+json">/i.test(html)) defects.push('JSON-LD missing'); if (!/G-M281DG8YTP/i.test(html)) defects.push('Google Analytics missing'); if (!/1085436810811087/i.test(html)) defects.push('Meta Pixel missing'); if (/INTERNAL EDITORIAL APPENDIX|NOT FOR PUBLICATION|BEGIN READER ARTICLE|END READER ARTICLE|IMPLEMENTATION NOTE/i.test(html)) defects.push('internal workflow content leaked'); if (base.hostname.endsWith('.pages.dev') && !/noindex/i.test(response.headers.get('x-robots-tag') || '')) defects.push('preview noindex header missing'); if (!base.hostname.endsWith('.pages.dev') && /noindex/i.test(response.headers.get('x-robots-tag') || '')) defects.push('production noindex header present'); return {path, status: response.status, passed: defects.length === 0, defects}; } catch (error) { return {path, status: 0, passed: false, defects: [error instanceof Error ? error.message : 'request failed']}; } }
function json(value: unknown, status = 200): Response { return Response.json(value, {status, headers: {'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8'}}); }
