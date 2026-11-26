const allowed = new Set([
  'github.com',
  'www.github.com',
  'en.wikipedia.org',
  'pt.wikipedia.org',
  'developer.mozilla.org',
  'react.dev',
  'vite.dev',
  'www.youtube.com',
  'youtu.be',
  'www.imdb.com',
  'www.themoviedb.org',
  'open.spotify.com',
  'twitter.com',
  'vimeo.com',
]);
export function previewTarget(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !allowed.has(url.hostname) ||
      url.href.length > 2048
    )
      return null;
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}
function decode(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}
export function parseMetadata(html: string) {
  const values: Record<string, string> = {};
  for (const match of html.matchAll(/<meta\s[^>]*>/gi)) {
    const attrs: Record<string, string> = {};
    for (const attr of match[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))
      attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3];
    const key = attrs.property ?? attrs.name;
    if (key && attrs.content && !values[key]) values[key] = decode(attrs.content);
  }
  return {
    title: (
      values['og:title'] ?? decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    ).slice(0, 240),
    description: (values['og:description'] ?? values.description ?? '').slice(0, 500),
    image: (values['og:image'] ?? '').slice(0, 2048),
  };
}
export async function linkPreview(url: URL, fetcher = fetch, preview = false) {
  const target = previewTarget(url.searchParams.get('url') ?? '');
  if (
    preview &&
    target &&
    (!['github.com', 'react.dev', 'vite.dev'].includes(target.hostname) ||
      target.search ||
      target.pathname !== '/')
  )
    return Response.json({ error: 'Preview limitado a páginas iniciais' }, { status: 400 });
  if (!target) return Response.json({ error: 'Domínio não habilitado' }, { status: 400 });
  try {
    const endpoint = ({
      'www.youtube.com': 'https://www.youtube.com/oembed',
      'open.spotify.com': 'https://open.spotify.com/oembed',
      'twitter.com': 'https://publish.twitter.com/oembed',
      'vimeo.com': 'https://vimeo.com/api/oembed.json',
    } as Record<string,string>)[target.hostname];
    if (endpoint && !preview) {
      const request = new URL(endpoint);
      request.searchParams.set('url', target.href);
      request.searchParams.set('format', 'json');
      const result = await fetcher(request.href, { redirect: 'manual', signal: AbortSignal.timeout(7000), headers: { Accept: 'application/json' } });
      if (result.ok && result.body) {
        const reader = result.body.getReader();
        let raw = '', size = 0;
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 65536) throw Error('Resposta grande demais');
            raw += decoder.decode(value, { stream: true });
          }
          raw += decoder.decode();
        } finally { await reader.cancel().catch(() => undefined); }
        const data = JSON.parse(raw) as Record<string, unknown>;
        const title = typeof data.title === 'string' ? data.title : typeof data.author_name === 'string' ? 'Publicação de ' + data.author_name : '';
        if (title) return Response.json({ title: title.slice(0,240), description: typeof data.author_name === 'string' ? data.author_name.slice(0,500) : '', host: target.hostname, image: typeof data.thumbnail_url === 'string' ? await loadImage(data.thumbnail_url, target, fetcher) : undefined });
      }
    }
    const response = await fetcher(target.href, {
      redirect: 'manual',
      signal: AbortSignal.timeout(7000),
      headers: { Accept: 'text/html' },
    });
    if (
      !response.ok ||
      !response.headers.get('content-type')?.includes('text/html') ||
      !response.body
    )
      return Response.json({ error: 'Preview indisponível' }, { status: 422 });
    const reader = response.body.getReader();
    let size = 0,
      html = '';
    const decoder = new TextDecoder();
    try {
      while (size < 262144) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = value.subarray(0, 262144 - size);
        size += chunk.length;
        html += decoder.decode(chunk, { stream: true });
        if (/<\/head>/i.test(html)) break;
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    const metadata = parseMetadata(html);
    const image = preview ? undefined : await loadImage(metadata.image, target, fetcher);
    return Response.json({
      title: metadata.title,
      description: metadata.description,
      host: target.hostname,
      image,
    });
  } catch {
    return Response.json({ error: 'Preview indisponível' }, { status: 422 });
  }
}

const imageHosts = new Set([
  'opengraph.githubassets.com',
  'avatars.githubusercontent.com',
  'i.ytimg.com',
  'i.scdn.co',
  'image.tmdb.org',
  'm.media-amazon.com',
  'pbs.twimg.com',
  'i.vimeocdn.com',
  'upload.wikimedia.org',
  'react.dev',
  'vite.dev',
  'developer.mozilla.org',
]);
async function loadImage(value: string, base: URL, fetcher: typeof fetch) {
  if (!value) return;
  try {
    const url = new URL(value, base);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !imageHosts.has(url.hostname)
    )
      return;
    const response = await fetcher(url.href, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    const type = response.headers.get('content-type')?.split(';')[0] ?? '';
    if (
      !response.ok ||
      !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(type) ||
      !response.body
    )
      return;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > 262144) return;
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    let binary = '';
    for (const chunk of chunks)
      for (let i = 0; i < chunk.length; i += 8192)
        binary += String.fromCharCode(...chunk.subarray(i, i + 8192));
    return 'data:' + type + ';base64,' + btoa(binary);
  } catch {
    return undefined;
  }
}
