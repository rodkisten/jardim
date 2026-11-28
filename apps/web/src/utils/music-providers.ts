import { z } from 'zod';
import { fetchProtocol } from '@rodkisten/jardim-local-db/transport';
import { ProviderRetry, type CulturalProvider } from './cultural-enrichment';
import { normalizeISRC, findRecordingsByISRC, recordingIdentityPatch } from './music-identity';

const trackSchema = z.object({
  id: z.string(), name: z.string(), duration_ms: z.number().nonnegative(),
  explicit: z.boolean().optional(),
  artists: z.array(z.object({ id: z.string(), name: z.string() })),
  album: z.object({ id: z.string(), name: z.string(), release_date: z.string().optional() }),
  external_ids: z.object({ isrc: z.string().optional() }).optional(),
});

export const spotifyProvider: CulturalProvider = {
  id: 'spotify',
  supports: work => work.identity.provider === 'spotify' && work.identity.kind === 'track',
  async enrich(work, signal) {
    const id = work.identity.externalId;
    if (!/^[A-Za-z0-9]{22}$/.test(id)) throw Error('Invalid Spotify ID');
    const response = await fetchProtocol('/v2/spotify/track?id=' + id, { signal });
    if (response.status === 429 || response.status === 503) throw new ProviderRetry(60_000);
    if (!response.ok) throw Error('Spotify metadata unavailable');
    const track = trackSchema.parse(await response.json());
    if (track.id !== id) throw Error('Spotify identity mismatch');
    const provenance = { provider: 'spotify', retrievedAt: new Date().toISOString(), sourceUrl: 'https://open.spotify.com/track/' + id };
    const isrc = normalizeISRC(track.external_ids?.isrc ?? '');
    return {
      title: { value: track.name, provenance },
      durationMs: { value: track.duration_ms, provenance },
      artists: { value: track.artists, provenance },
      album: { value: track.album, provenance },
      ...(track.explicit === undefined ? {} : { explicit: { value: track.explicit, provenance } }),
      ...(isrc ? { identifiers: { isrc } } : {}),
    };
  },
};

export const musicBrainzProvider: CulturalProvider = {
  id: 'musicbrainz',
  supports: work => work.identity.kind === 'track' && !!normalizeISRC(work.identifiers?.isrc ?? ''),
  async enrich(work, signal) {
    return recordingIdentityPatch(work, await findRecordingsByISRC(work.identifiers!.isrc!, signal));
  },
};
