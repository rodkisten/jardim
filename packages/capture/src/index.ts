/** Keep only the canonical video ID; URLs may contain private search, account or playlist data. */
export function youtubeVideo(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
  if (!['www.youtube.com', 'm.youtube.com', 'youtube.com'].includes(parsed.hostname)) return null;
  const id =
    parsed.pathname === '/watch'
      ? parsed.searchParams.get('v')
      : parsed.pathname.match(/^\/shorts\/([^/]+)$/)?.[1];
  return id && /^[a-zA-Z0-9_-]{11}$/.test(id)
    ? { id, url: `https://www.youtube.com/watch?v=${id}` }
    : null;
}
