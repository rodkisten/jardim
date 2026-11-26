export function safeWebUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}
export function extractLinks(text: string) {
  return [
    ...new Set(
      (text.match(/https?:\/\/[^\s<>"']+/gi) ?? [])
        .map((value) => safeWebUrl(value.replace(/[.,;!?\])]+$/, ''))?.href)
        .filter((value): value is string => !!value),
    ),
  ].slice(0, 12);
}
export function describeLink(value: string) {
  const url = safeWebUrl(value);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, '');
  let title = url.pathname.split('/').filter(Boolean).at(-1) ?? host;
  try {
    title = decodeURIComponent(title);
  } catch {
    /* Keep encoded title. */
  }
  return { href: url.href, host, title: title.replace(/[-_]+/g, ' ').slice(0, 120) };
}
