import { z, type Memory } from "@rodkisten/jardim-contracts";
import { db } from "./db";
import { fetchProtocol } from "@rodkisten/jardim-local-db/transport";
export const Status = z.object({
  spotify: z.object({
    configured: z.boolean(),
    connected: z.boolean(),
    clientId: z.string().optional(),
    redirectUri: z.string().optional(),
    missing: z.string().nullable().optional(),
  }),
  tmdb: z.object({ configured: z.boolean() }),
});
export const Results = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      type: z.string(),
      title: z.string(),
      description: z.string(),
      year: z.string(),
    }),
  ),
});
const SpotifyRow = z.object({
  ts: z.string(),
  master_metadata_track_name: z.string().nullable().optional(),
  master_metadata_album_artist_name: z.string().nullable().optional(),
  spotify_track_uri: z.string().nullable().optional(),
  episode_name: z.string().nullable().optional(),
  spotify_episode_uri: z.string().nullable().optional(),
  ms_played: z.number().optional(),
});
async function eventId(value: string) {
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-8${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

export async function importSpotify(file:File){
if(file.size>32*1024*1024)throw new Error("Use um JSON de até 32 MiB.");
      const rows = z
        .array(SpotifyRow)
        .max(10000)
        .parse(JSON.parse(await file.text()));
      const entries = new Map<string, Memory>();
      let skipped = 0;
      for (const row of rows) {
        const date = z.iso.datetime().safeParse(row.ts),
          uri = row.spotify_track_uri || row.spotify_episode_uri || '',
          match = uri.match(/^spotify:(track|episode):([A-Za-z0-9]{22})$/),
          title = row.master_metadata_track_name || row.episode_name;
        if (!date.success || !match || !title || row.ms_played === 0) {
          skipped++;
          continue;
        }
        const id = await eventId('spotify:' + row.ts + ':' + match[2]);
        entries.set(id, {
          id,
          title: title.slice(0, 160),
          body: `${row.master_metadata_album_artist_name || ''}\nReprodução registrada: ${row.ts}\nhttps://open.spotify.com/${match[1]}/${match[2]}\nFonte: exportação Spotify`,
          tags: ['spotify', match[1] === 'episode' ? 'podcast' : 'música'],
          createdAt: row.ts,
        });
      }
      const result = await db.restore({
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        memories: [...entries.values()],
      });

return {...result,invalid:skipped};
}
export async function integrationRequest(path:string,init?:RequestInit){const response=await fetchProtocol(path,init);if(!response.ok)throw new Error("Integração indisponível ("+response.status+").");return response.json();}
