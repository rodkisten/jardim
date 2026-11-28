import { culturalLink } from './cultural-link';
import { spotifyIdentity, type CulturalIdentity } from './cultural-insights';
import { ProviderRetry, type CulturalProvider } from './cultural-enrichment';

export function culturalIdentity(input: string): CulturalIdentity | undefined {
  const spotify = spotifyIdentity(input);
  if (spotify) return spotify;
  const link = culturalLink(input);
  if (link) {
    const url = new URL(link.href);
    const parts = url.pathname.split('/').filter(Boolean);
    if (link.provider === 'TMDB') return { provider: 'tmdb', kind: link.kind === 'movie' ? 'film' : 'series', externalId: parts[1]! };
    if (link.provider === 'IMDb') return { provider: 'imdb', kind: 'other', externalId: parts[1]! };
    if (link.provider === 'YouTube') return { provider: 'youtube', kind: 'other', externalId: url.searchParams.get('v')! };
    if (link.provider === 'Vimeo') return { provider: 'vimeo', kind: 'other', externalId: parts[0]! };
    if (link.provider === 'X') return { provider: 'x', kind: 'other', externalId: parts[2]! };
  }
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hostname !== 'openlibrary.org') return;
    const match = /^\/works\/(OL\d+W)(?:\/[^/]+)?\/?$/.exec(url.pathname);
    if (match) return { provider: 'openlibrary', kind: 'book', externalId: match[1]! };
  } catch { return; }
}

// Register only after the user enables external metadata lookups.
export const openLibraryProvider: CulturalProvider = {
  id: 'openlibrary',
  supports: (work) => work.identity.provider === 'openlibrary' && /^OL\d+W$/.test(work.identity.externalId),
  async enrich(work, signal) {
    const sourceUrl = 'https://openlibrary.org/works/' + work.identity.externalId + '.json';
    const response = await fetch(sourceUrl, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (response.status === 429 || response.status === 503) {
      const retry = response.headers.get('Retry-After');
      const seconds = retry && /^\d+$/.test(retry) ? Number(retry) * 1000 : retry ? Date.parse(retry) - Date.now() : NaN;
      throw new ProviderRetry(Number.isFinite(seconds) ? Math.max(1000, seconds) : 60_000);
    }
    if (!response.ok) throw Error('Open Library: ' + response.status);
    const raw: unknown = await response.json();
    if (!raw || typeof raw !== 'object') throw Error('Invalid Open Library response');
    const data = raw as Record<string, unknown>;
    const provenance = { provider: 'openlibrary', retrievedAt: new Date().toISOString(), sourceUrl };
    const title = typeof data.title === 'string' ? data.title.slice(0, 500) : undefined;
    const subjects = Array.isArray(data.subjects) ? data.subjects.filter((s): s is string => typeof s === 'string').slice(0, 100).map(s => s.slice(0, 200)) : [];
    return {
      ...(title ? { title: { value: title, provenance } } : {}),
      ...(subjects.length ? { tags: { value: subjects, provenance } } : {}),
    };
  },
};
