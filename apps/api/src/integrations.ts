import { readPreferences } from './preferences';
import { z } from '@rodkisten/jardim-contracts';
import { hash } from './auth';
import { externalJson } from './external';
export type IntegrationEnv = Env & {
  SPOTIFY_CLIENT_ID?: string;
  TMDB_TOKEN?: string;
  INTEGRATION_KEY?: string;
};
const Token = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number(),
});
const TokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().positive().max(86400),
});
const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
function base64(bytes: Uint8Array) {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}
async function key(env: IntegrationEnv) {
  if (!env.INTEGRATION_KEY || !/^[a-f0-9]{64}$/.test(env.INTEGRATION_KEY))
    throw Error('Integração não configurada.');
  return crypto.subtle.importKey(
    'raw',
    Uint8Array.from(env.INTEGRATION_KEY.match(/../g)!, (byte) => parseInt(byte, 16)),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt'],
  );
}
async function encode(env: IntegrationEnv, token: z.infer<typeof Token>) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await key(env),
    new TextEncoder().encode(JSON.stringify(token)),
  );
  return JSON.stringify({ iv: base64(iv), data: base64(new Uint8Array(encrypted)) });
}
async function decode(env: IntegrationEnv, text: string) {
  const input = z.object({ iv: z.string(), data: z.string() }).parse(JSON.parse(text));
  const bytes = (text: string) =>
    Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
  return Token.parse(
    JSON.parse(
      new TextDecoder().decode(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: bytes(input.iv) },
          await key(env),
          bytes(input.data),
        ),
      ),
    ),
  );
}
async function storeToken(env: IntegrationEnv, token: z.infer<typeof Token>) {
  await env.DB.prepare(
    'INSERT INTO integration_tokens(provider,encrypted,expires_at) VALUES(?,?,?) ON CONFLICT(provider) DO UPDATE SET encrypted=excluded.encrypted,expires_at=excluded.expires_at',
  )
    .bind('spotify', await encode(env, token), token.expires_at)
    .run();
}
async function configuredEnv(env: IntegrationEnv): Promise<IntegrationEnv> {
  const settings = await readPreferences(env);
  return {
    ...env,
    SPOTIFY_CLIENT_ID:
      typeof settings.spotifyClientId === 'string'
        ? settings.spotifyClientId
        : env.SPOTIFY_CLIENT_ID,
  };
}
export async function integrationStatus(env: IntegrationEnv) {
  env = await configuredEnv(env);
  const row = await env.DB.prepare('SELECT expires_at FROM integration_tokens WHERE provider=?')
    .bind('spotify')
    .first();
  return Response.json({
    spotify: {
      configured: !!env.SPOTIFY_CLIENT_ID && !!env.INTEGRATION_KEY,
      connected: !!row,
      clientId: env.SPOTIFY_CLIENT_ID || '',
      redirectUri: env.APP_ORIGIN + '/v2/spotify/callback',
      missing: !env.SPOTIFY_CLIENT_ID
        ? 'client_id'
        : !env.INTEGRATION_KEY
          ? 'encryption_key'
          : null,
    },
    tmdb: { configured: !!env.TMDB_TOKEN },
  });
}
export async function spotifyStart(env: IntegrationEnv) {
  env = await configuredEnv(env);
  if (!env.SPOTIFY_CLIENT_ID || !env.INTEGRATION_KEY)
    return Response.json(
      { error: 'A aplicação Spotify precisa ser configurada.' },
      { status: 503 },
    );
  const state = random(),
    verifier = random();
  const challenge = base64(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))),
  )
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM oauth_pending WHERE expires_at<?').bind(Date.now()),
    env.DB.prepare('INSERT INTO oauth_pending(state_hash,verifier,expires_at) VALUES(?,?,?)').bind(
      await hash(state),
      verifier,
      Date.now() + 600000,
    ),
  ]);
  const url = new URL('https://accounts.spotify.com/authorize');
  url.search = new URLSearchParams({
    client_id: env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: env.APP_ORIGIN + '/v2/spotify/callback',
    scope: 'user-read-recently-played',
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  }).toString();
  return Response.json({ url: url.href });
}
export async function spotifyCallback(
  env: IntegrationEnv,
  url: URL,
  fetcher: typeof fetch = fetch,
) {
  env = await configuredEnv(env);
  if (url.searchParams.has('error'))
    return new Response(null, {
      status: 303,
      headers: { Location: '/?spotify=denied#integracoes' },
    });
  const state = url.searchParams.get('state') || '',
    code = url.searchParams.get('code') || '';
  if (
    !env.SPOTIFY_CLIENT_ID ||
    !env.INTEGRATION_KEY ||
    !/^[a-f0-9]{64}$/.test(state) ||
    !code ||
    code.length > 2048
  )
    return new Response('Conexão inválida. Volte ao Jardim e tente novamente.', { status: 400 });
  // Consume a one-use state before exchanging the code. The callback is public because Strict cookies do not cross OAuth sites.
  const pending = await env.DB.prepare(
    'DELETE FROM oauth_pending WHERE state_hash=? AND expires_at>? RETURNING verifier',
  )
    .bind(await hash(state), Date.now())
    .first<{ verifier: string }>();
  if (!pending)
    return new Response('Conexão expirada. Abra o Jardim para tentar novamente.', { status: 400 });
  try {
    const response = TokenResponse.parse(
      await externalJson(
        'https://accounts.spotify.com/api/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: env.APP_ORIGIN + '/v2/spotify/callback',
            client_id: env.SPOTIFY_CLIENT_ID,
            code_verifier: pending.verifier,
          }),
        },
        fetcher,
      ),
    );
    if (!response.refresh_token) throw Error('Spotify não forneceu renovação.');
    await storeToken(env, {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      expires_at: Date.now() + response.expires_in * 1000,
    });
  } catch {
    return new Response(null, {
      status: 303,
      headers: { Location: '/?spotify=failed#integracoes' },
    });
  }
  return new Response(null, { status: 303, headers: { Location: '/#integracoes' } });
}
export async function disconnectSpotify(env: IntegrationEnv) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM integration_tokens WHERE provider=?').bind('spotify'),
    env.DB.prepare('DELETE FROM oauth_pending'),
  ]);
  return Response.json({ ok: true });
}
async function spotifyAccess(env: IntegrationEnv, fetcher: typeof fetch) {
  env = await configuredEnv(env);
  const row = await env.DB.prepare('SELECT encrypted FROM integration_tokens WHERE provider=?')
    .bind('spotify')
    .first<{ encrypted: string }>();
  if (!row || !env.SPOTIFY_CLIENT_ID) throw Error('Conecte o Spotify.');
  let token = await decode(env, row.encrypted);
  if (token.expires_at < Date.now() + 60000) {
    const next = TokenResponse.parse(
      await externalJson(
        'https://accounts.spotify.com/api/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: token.refresh_token,
            client_id: env.SPOTIFY_CLIENT_ID,
          }),
        },
        fetcher,
      ),
    );
    token = {
      access_token: next.access_token,
      refresh_token: next.refresh_token || token.refresh_token,
      expires_at: Date.now() + next.expires_in * 1000,
    };
    await storeToken(env, token);
  }
  return token.access_token;
}
export async function stableId(value: string) {
  const digest = await hash(value);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-8${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}
export async function syncSpotify(env: IntegrationEnv, fetcher: typeof fetch = fetch) {
  const token = await spotifyAccess(env, fetcher);
  const data = z
    .object({
      items: z
        .array(
          z.object({
            played_at: z.iso.datetime(),
            track: z.object({
              id: z
                .string()
                .regex(/^[A-Za-z0-9]{22}$/)
                .nullable(),
              name: z.string(),
              artists: z.array(z.object({ name: z.string() })),
            }),
          }),
        )
        .max(50),
    })
    .parse(
      await externalJson(
        'https://api.spotify.com/v1/me/player/recently-played?limit=50',
        { headers: { Authorization: 'Bearer ' + token } },
        fetcher,
      ),
    );
  const statements: D1PreparedStatement[] = [];
  let count = 0;
  for (const event of data.items) {
    if (!event.track.id) continue;
    const sourceKey = event.played_at + ':' + event.track.id,
      id = await stableId('spotify:' + sourceKey),
      title = event.track.name.slice(0, 160),
      body = `${event.track.artists
        .slice(0, 10)
        .map((artist) => artist.name)
        .join(
          ', ',
        )}\nOuvida em: ${event.played_at}\nhttps://open.spotify.com/track/${event.track.id}`;
    statements.push(
      env.DB.prepare(
        'INSERT INTO integration_events(id,source,source_key,payload,received_at) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING',
      ).bind(
        id,
        'spotify',
        sourceKey,
        JSON.stringify({ trackId: event.track.id, title, playedAt: event.played_at }),
        new Date().toISOString(),
      ),
      env.DB.prepare(
        'INSERT INTO memories(id,operation_id,title,body,tags,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING',
      ).bind(id, id, title, body, '["spotify","música"]', event.played_at),
    );
    count++;
  }
  if (statements.length) await env.DB.batch(statements);
  return Response.json({
    processed: count,
    coverage: 'Até 50 músicas recentes; não é histórico completo nem histórico de podcasts.',
  });
}
export async function searchTmdb(env: IntegrationEnv, url: URL, fetcher: typeof fetch = fetch) {
  if (!env.TMDB_TOKEN)
    return Response.json({ error: 'A conexão TMDB precisa ser configurada.' }, { status: 503 });
  const query = (url.searchParams.get('q') || '').trim();
  if (query.length < 2 || query.length > 100)
    return Response.json({ error: 'Busca inválida' }, { status: 400 });
  const data = z
    .object({
      results: z
        .array(
          z.object({
            id: z.number().int(),
            media_type: z.string(),
            title: z.string().optional(),
            name: z.string().optional(),
            overview: z.string().optional(),
            release_date: z.string().optional(),
            first_air_date: z.string().optional(),
          }),
        )
        .max(30),
    })
    .parse(
      await externalJson(
        'https://api.themoviedb.org/3/search/multi?language=pt-BR&query=' +
          encodeURIComponent(query),
        { headers: { Authorization: 'Bearer ' + env.TMDB_TOKEN } },
        fetcher,
      ),
    );
  return Response.json({
    results: data.results
      .filter((item) => ['movie', 'tv'].includes(item.media_type))
      .map((item) => ({
        id: item.id,
        type: item.media_type,
        title: item.title || item.name || 'Sem título',
        description: item.overview || '',
        year: (item.release_date || item.first_air_date || '').slice(0, 4),
      })),
  });
}
