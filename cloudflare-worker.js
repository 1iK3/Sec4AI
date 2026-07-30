/**
 * Sec4AI Cloudflare Worker
 * 
 * Proxies requests to the Vercel backend at https://sec4-ai.vercel.app
 * while adding caching, security headers, and optional custom domain support.
 * 
 * Deploy:
 *   1. Copy this file to Cloudflare Workers dashboard
 *   2. Set WRANGLER to deploy via CLI: npx wrangler deploy cloudflare-worker.js
 *   3. (Optional) Add custom domain in Workers & Pages > Triggers
 * 
 * Environment variables (set in wrangler.toml or dashboard):
 *   - ORIGIN_URL: defaults to https://sec4-ai.vercel.app
 *   - CACHE_TTL:  browser cache TTL in seconds (default 3600)
 */

const DEFAULT_ORIGIN = 'https://sec4-ai.vercel.app';
const DEFAULT_CACHE_TTL = 3600;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = env.ORIGIN_URL || DEFAULT_ORIGIN;
    const cacheTtl = parseInt(env.CACHE_TTL) || DEFAULT_CACHE_TTL;

    // Build upstream URL - forward path and query exactly
    const upstreamUrl = `${origin}${url.pathname}${url.search}`;

    // Clone request with modified headers for forwarding
    const upstreamHeaders = new Headers(request.headers);

    // Set or override host to match origin
    upstreamHeaders.set('Host', new URL(origin).host);

    // Remove hop-by-hop headers
    for (const h of ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'transfer-encoding']) {
      upstreamHeaders.delete(h);
    }

    // Forward the request
    const upstreamReq = new Request(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'follow',
    });

    let response;
    try {
      response = await fetch(upstreamReq);
    } catch (err) {
      return new Response(`Sec4AI Proxy Error: ${err.message}`, {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Clone response so headers are mutable
    response = new Response(response.body, response);

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Cache static assets in browser
    const isStatic = /\.(css|js|json|png|jpg|gif|ico|svg|woff2?)$/i.test(url.pathname);
    if (isStatic) {
      response.headers.set('Cache-Control', `public, max-age=${cacheTtl}, immutable`);
    } else if (url.pathname.startsWith('/raw/') || url.pathname.startsWith('/prompt/')) {
      // Prompt pages: cache briefly since content rarely changes
      response.headers.set('Cache-Control', `public, max-age=${Math.min(cacheTtl, 600)}, s-maxage=${cacheTtl}`);
    } else {
      response.headers.set('Cache-Control', `public, max-age=${Math.min(cacheTtl, 300)}`);
    }

    // CORS for frontend access
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;
  },
};
