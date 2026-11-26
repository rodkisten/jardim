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
    return null;
  } catch {
    return null;
  }
}
