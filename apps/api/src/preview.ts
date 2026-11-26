import { linkPreview } from './link-preview';
import { faith } from './faith';
export default {
  async fetch(
    request: Request,
    env: { ASSETS: { fetch(request: Request): Promise<Response> } },
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/faith' || url.pathname.startsWith('/faith/')) {
      if (request.method !== 'GET')
        return new Response(null, { status: 405, headers: { Allow: 'GET' } });
      return faith(url);
    }
    if (url.pathname === '/v2/link-preview' && request.method === 'GET')
      return linkPreview(url, fetch, true);
    return env.ASSETS.fetch(request);
  },
};
