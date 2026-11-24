import { faith } from "./faith";
export default {
  async fetch(request: Request, env: { ASSETS: { fetch(request: Request): Promise<Response> } }): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/faith" || url.pathname.startsWith("/faith/")) {
      if (request.method !== "GET") return new Response(null, { status: 405, headers: { Allow: "GET" } });
      return faith(url);
    }
    return env.ASSETS.fetch(request);
  },
};
