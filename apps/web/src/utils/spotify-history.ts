import { z } from 'zod';
import { listeningSchema, musicDB, type LocalListening } from './music-insights-local';
import { spotifyIdentity, type CulturalWork, type CulturalInteraction } from './cultural-insights';
import { ingestCulturalBatch } from './cultural-registry';
const extended = z.object({
  ts: z.string(),
  ms_played: z.number().int().nonnegative(),
  master_metadata_track_name: z.string().nullable(),
  master_metadata_album_artist_name: z.string().nullable(),
  master_metadata_album_album_name: z.string().nullable().optional(),
  spotify_track_uri: z.string().nullable().optional(),
});
const basic = z.object({
  endTime: z.string(),
  artistName: z.string(),
  trackName: z.string(),
  msPlayed: z.number().int().nonnegative(),
});
const key = (value: string) => value.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
async function hash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function importSpotify(raw: unknown) {
  if (!Array.isArray(raw) || raw.length > 100000)
    throw Error('Histórico inválido ou acima de 100 mil registros.');
  const rows: LocalListening[] = [];
  let skipped = 0;
  for (const item of raw) {
    const e = extended.safeParse(item),
      b = basic.safeParse(item);
    if (!e.success && !b.success) {
      skipped++;
      continue;
    }
    const title = e.success ? e.data.master_metadata_track_name : b.data?.trackName;
    const artist = e.success ? e.data.master_metadata_album_artist_name : b.data?.artistName;
    const ms = e.success ? e.data.ms_played : b.data?.msPlayed;
    const ts = e.success ? e.data.ts : b.data?.endTime.replace(' ', 'T') + ':00Z';
    if (!title?.trim() || !artist?.trim() || !ms || !ts || !Number.isFinite(Date.parse(ts))) {
      skipped++;
      continue;
    }
    const occurredAt = new Date(ts).toISOString();
    const uri = e.success ? e.data.spotify_track_uri : undefined;
    const trackId =
      uri && /^spotify:track:[A-Za-z0-9]{22}$/.test(uri)
        ? uri
        : JSON.stringify([key(artist), key(title)]);
    const id = 'spotify:' + (await hash(JSON.stringify([occurredAt, trackId, ms])));
    const parsed = listeningSchema.safeParse({
      id,
      trackId,
      artistIds: [key(artist)],
      title,
      artist,
      album: e.success ? (e.data.master_metadata_album_album_name ?? undefined) : undefined,
      occurredAt,
      localDate: occurredAt.slice(0, 10),
      timeBasis: 'utc',
      provider: 'spotify',
      playedMs: ms,
      source: 'playback',
    });
    if (parsed.success) rows.push(parsed.data);
    else skipped++;
  }
  // Preserve the existing analytics store while indexing canonical works.
  // Replay is safe: both stores use stable playback identifiers.
  for (let offset = 0; offset < rows.length; offset += 500) {
    const works: CulturalWork[] = [];
    const interactions: CulturalInteraction[] = [];
    for (const row of rows.slice(offset, offset + 500)) {
      const identity = spotifyIdentity(row.trackId) ?? {
        provider: 'spotify-history',
        kind: 'track' as const,
        externalId: row.trackId,
      };
      works.push({
        identity,
        title: { value: row.title, provenance: { provider: 'spotify-export', retrievedAt: new Date().toISOString() } },
      });
      interactions.push({
        id: row.id,
        identity,
        kind: 'playback',
        occurredAt: row.occurredAt,
        ...(row.playedMs === undefined ? {} : { durationMs: row.playedMs }),
      });
    }
    await ingestCulturalBatch(works, interactions);
  }
  let added = 0,
    duplicates = 0;
  await musicDB.transaction('rw', musicDB.listening, async () => {
    for (const row of rows) {
      if (await musicDB.listening.get(row.id)) {
        duplicates++;
        continue;
      }
      await musicDB.listening.add(row);
      added++;
    }
  });
  return { added, duplicates, skipped };
}
