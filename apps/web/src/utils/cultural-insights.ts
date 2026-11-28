export type CulturalKind = 'track' | 'album' | 'artist' | 'episode' | 'show' | 'playlist' | 'film' | 'series' | 'book' | 'other';
export type CulturalIdentity = { provider: string; externalId: string; kind: CulturalKind };
export type Provenance = { provider: string; retrievedAt: string; sourceUrl?: string };
export type Observation<T> = { value: T; provenance: Provenance };
export type CulturalWork = {
  identity: CulturalIdentity;
  title?: Observation<string>;
  genres?: Observation<string[]>;
  tags?: Observation<string[]>;
  identifiers?: Record<string, string>;
  acoustic?: Partial<Record<'energy' | 'danceability' | 'valence' | 'tempo' | 'acousticness' | 'key', Observation<number>>>;
};
export type CulturalInteraction = {
  id: string;
  identity: CulturalIdentity;
  kind: 'playback' | 'mention' | 'view' | 'read';
  occurredAt: string;
  memoryId?: string;
  durationMs?: number;
};
export type EmotionSuggestion = {
  label: string;
  confidence: number;
  model: string;
  analyzedAt: string;
};
export type NoteEmotions = {
  memoryId: string;
  suggestions: EmotionSuggestion[];
  confirmed: string[];
};
export function spotifyIdentity(input: string): CulturalIdentity | undefined {
  const uri = /^spotify:(track|album|artist|episode|show|playlist):([A-Za-z0-9]{22})$/.exec(input.trim());
  if (uri) return { provider: 'spotify', kind: uri[1] as CulturalKind, externalId: uri[2]! };
  try {
    const url = new URL(input.trim());
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') return;
    const match = /^\/(?:intl-[a-zA-Z-]+\/)?(?:embed\/)?(track|album|artist|episode|show|playlist)\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname);
    if (match) return { provider: 'spotify', kind: match[1] as CulturalKind, externalId: match[2]! };
  } catch {
    return;
  }
}
export function culturalIdentityKey(identity: CulturalIdentity): string {
  return JSON.stringify([identity.provider, identity.kind, identity.externalId]);
}
