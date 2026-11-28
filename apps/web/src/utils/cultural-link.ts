export function culturalLink(value: string) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    const host = u.hostname.toLowerCase();
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.split('/')[1] ?? null;
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host))
      id =
        u.pathname === '/watch'
          ? u.searchParams.get('v')
          : (u.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)\/?$/)?.[1] ?? null);
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id))
      return { provider: 'YouTube', kind: 'video', href: 'https://www.youtube.com/watch?v=' + id };
    if (host === 'open.spotify.com') {
      const m = u.pathname.match(
        /^\/(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{22})\/?$/,
      );
      if (m)
        return {
          provider: 'Spotify',
          kind: m[1],
          href: 'https://open.spotify.com/' + m[1] + '/' + m[2],
        };
    }
    if (['www.themoviedb.org', 'themoviedb.org'].includes(host)) {
      const m = u.pathname.match(/^\/(movie|tv)\/(\d{1,12})(?:-[^/]+)?\/?$/);
      if (m)
        return {
          provider: 'TMDB',
          kind: m[1],
          href: 'https://www.themoviedb.org/' + m[1] + '/' + m[2],
        };
    }
    if (['imdb.com', 'www.imdb.com'].includes(host)) {
      const m = u.pathname.match(/^\/title\/(tt\d{7,12})\/?$/);
      if (m)
        return {
          provider: 'IMDb',
          kind: 'title',
          href: 'https://www.imdb.com/title/' + m[1] + '/',
        };
    }
    if (['x.com', 'twitter.com', 'www.twitter.com', 'www.x.com'].includes(host)) {
      const m = u.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d{1,24})\/?$/);
      if (m)
        return {
          provider: 'X',
          kind: 'post',
          href: 'https://twitter.com/' + m[1] + '/status/' + m[2],
        };
    }
    if (['vimeo.com', 'www.vimeo.com'].includes(host)) {
      const m = u.pathname.match(/^\/(\d{1,15})\/?$/);
      if (m) return { provider: 'Vimeo', kind: 'video', href: 'https://vimeo.com/' + m[1] };
    }
    return null;
  } catch {
    return null;
  }
}

export function embedUrl(value: string): string | undefined {
  const link = culturalLink(value);
  if (!link) return;
  const url = new URL(link.href);
  if (link.provider === 'YouTube')
    return 'https://www.youtube-nocookie.com/embed/' + url.searchParams.get('v');
  if (link.provider === 'Spotify') return 'https://open.spotify.com/embed' + url.pathname;
  if (link.provider === 'Vimeo') return 'https://player.vimeo.com/video' + url.pathname;
}
