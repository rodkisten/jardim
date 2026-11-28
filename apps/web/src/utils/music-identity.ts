import type { CulturalWork } from './cultural-insights';
import { ProviderRetry } from './cultural-enrichment';

export function normalizeISRC(input: string): string | undefined {
  const code = input.trim().toUpperCase().replace(/-/g, '');
  return /^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/.test(code) ? code : undefined;
}

export type RecordingCandidate = {
  mbid: string;
  title: string;
  durationMs?: number;
  disambiguation?: string;
};

export async function findRecordingsByISRC(input: string, signal: AbortSignal): Promise<RecordingCandidate[]> {
  const code = normalizeISRC(input);
  if (!code) throw Error('Invalid ISRC');
  const url = 'https://musicbrainz.org/ws/2/isrc/' + code + '?fmt=json';
  const response = await fetch(url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (response.status === 404) return [];
  if (response.status === 429 || response.status === 503) {
    const header = response.headers.get('Retry-After');
    const delay = header && /^\d+$/.test(header) ? Number(header) * 1000 : header ? Date.parse(header) - Date.now() : NaN;
    throw new ProviderRetry(Number.isFinite(delay) ? Math.max(1000, delay) : 60_000);
  }
  if (!response.ok) throw Error('MusicBrainz: ' + response.status);
  const data = await response.json() as { recordings?: unknown };
  if (!Array.isArray(data.recordings)) throw Error('Invalid recording response');
  const candidates = new Map<string, RecordingCandidate>();
  for (const item of data.recordings) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(row.id) || typeof row.title !== 'string') continue;
    candidates.set(row.id, { mbid: row.id, title: row.title,
      ...(typeof row.length === 'number' && Number.isFinite(row.length) ? { durationMs: row.length } : {}),
      ...(typeof row.disambiguation === 'string' ? { disambiguation: row.disambiguation } : {}) });
  }
  return [...candidates.values()];
}

// Preserve provider identities. An ISRC can map to multiple MusicBrainz recordings.
export function recordingIdentityPatch(work: CulturalWork, candidates: readonly RecordingCandidate[]): Partial<CulturalWork> {
  const isrc = normalizeISRC(work.identifiers?.isrc ?? '');
  if (!isrc || candidates.length !== 1 || !candidates[0]) return {};
  const mbid = candidates[0].mbid;
  if (work.identifiers?.musicbrainz && work.identifiers.musicbrainz !== mbid) return {};
  return { identifiers: { ...work.identifiers, isrc, musicbrainz: mbid } };
}
