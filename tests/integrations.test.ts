import { expect, test, vi } from 'vitest';
import { createTestDatabase } from './helpers/d1';
import {
  spotifyStart,
  spotifyCallback,
  integrationStatus,
  syncSpotify,
  disconnectSpotify,
  searchTmdb,
  type IntegrationEnv,
} from '../apps/api/src/integrations';
import { weather } from '../apps/api/src/weather';
import { externalJson } from '../apps/api/src/external';

test('Spotify PKCE consumes state once, encrypts credentials, imports idempotently and disconnects', async () => {
  const remote = createTestDatabase();
  const env = {
    DB: remote.binding,
    JARDIM_PASSWORD: 'test',
    APP_ORIGIN: 'https://jardim.migos.club',
    SPOTIFY_CLIENT_ID: 'client',
    INTEGRATION_KEY: 'b'.repeat(64),
  } as IntegrationEnv;
  let exchanges = 0;
  const fetcher: typeof fetch = async (input, init) => {
    if (String(input) === 'https://accounts.spotify.com/api/token') {
      exchanges++;
      const params = new URLSearchParams(String(init?.body));
      expect(params.get('code_verifier')?.length).toBe(64);
      return Response.json({
        access_token: 'ACCESS_PRIVATE',
        refresh_token: 'REFRESH_PRIVATE',
        expires_in: 3600,
      });
    }
    expect(init?.headers).toEqual({ Authorization: 'Bearer ACCESS_PRIVATE' });
    return Response.json({
      items: [
        {
          played_at: '2026-11-13T12:00:00.000Z',
          track: { id: '1'.repeat(22), name: 'Uma música', artists: [{ name: 'Artista' }] },
        },
      ],
    });
  };
  try {
    const start = await spotifyStart(env),
      auth = new URL(((await start.json()) as { url: string }).url);
    expect(auth.origin).toBe('https://accounts.spotify.com');
    expect(auth.searchParams.get('code_challenge_method')).toBe('S256');
    expect(auth.searchParams.get('scope')).toBe('user-read-recently-played');
    const callback = new URL(
      env.APP_ORIGIN + '/v2/spotify/callback?code=CODE&state=' + auth.searchParams.get('state'),
    );
    expect((await spotifyCallback(env, callback, fetcher)).status).toBe(303);
    expect((await spotifyCallback(env, callback, fetcher)).status).toBe(400);
    expect(exchanges).toBe(1);
    const encrypted = remote.sqlite.prepare('SELECT encrypted FROM integration_tokens').get()!
      .encrypted as string;
    expect(encrypted).not.toContain('ACCESS_PRIVATE');
    expect(encrypted).not.toContain('REFRESH_PRIVATE');
    for (let i = 0; i < 2; i++) expect((await syncSpotify(env, fetcher)).status).toBe(200);
    expect(remote.sqlite.prepare('SELECT count(*) AS n FROM memories').get()!.n).toBe(1);
    const status = JSON.stringify(await (await integrationStatus(env)).json());
    expect(status).toContain('"connected":true');
    expect(status).not.toContain('PRIVATE');
    await disconnectSpotify(env);
    expect(JSON.stringify(await (await integrationStatus(env)).json())).toContain(
      '"connected":false',
    );
    expect(remote.sqlite.prepare('SELECT count(*) AS n FROM memories').get()!.n).toBe(1);
  } finally {
    remote.close();
  }
});
test('missing app configuration fails closed and expired OAuth states cannot exchange codes', async () => {
  const remote = createTestDatabase();
  const env = {
    DB: remote.binding,
    APP_ORIGIN: 'https://jardim.migos.club',
    SPOTIFY_CLIENT_ID: 'client',
    INTEGRATION_KEY: 'a'.repeat(64),
  } as IntegrationEnv;
  try {
    expect((await spotifyStart({ ...env, SPOTIFY_CLIENT_ID: undefined })).status).toBe(503);
    expect(
      (await searchTmdb(env, new URL('https://jardim.migos.club/v2/tmdb/search?q=Alien'))).status,
    ).toBe(503);
    const auth = new URL(((await (await spotifyStart(env)).json()) as { url: string }).url);
    remote.sqlite.exec('UPDATE oauth_pending SET expires_at=0');
    const upstream = vi.fn();
    expect(
      (
        await spotifyCallback(
          env,
          new URL(
            env.APP_ORIGIN + '/v2/spotify/callback?code=x&state=' + auth.searchParams.get('state'),
          ),
          upstream,
        )
      ).status,
    ).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  } finally {
    remote.close();
  }
});
test('weather requests stay on fixed origins, validate location and preserve model provenance', async () => {
  const upstream: typeof fetch = async (input) => {
    const url = new URL(String(input));
    expect(url.hostname).toBe('api.open-meteo.com');
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('forecast_days')).toBe('1');
    expect(url.searchParams.get('current')).toBeNull();
    return Response.json({
      timezone: 'America/Sao_Paulo',
      daily: {
        time: ['2026-11-13'],
        temperature_2m_min: [18.5],
        temperature_2m_max: [27],
        weather_code: [2],
        precipitation_probability_max: [40],
      },
    });
  };
  const response = await weather(
    new URL('https://jardim.migos.club/v2/weather?latitude=-20&longitude=-42'),
    upstream,
  );
  expect(await response.json()).toMatchObject({
    kind: 'forecast',
    minimum: 18.5,
    maximum: 27,
    rainChance: 40,
    date: '2026-11-13',
    timezone: 'America/Sao_Paulo',
  });
  expect(
    (
      await weather(
        new URL('https://jardim.migos.club/v2/weather?latitude=999&longitude=0'),
        upstream,
      )
    ).status,
  ).toBe(400);
  await expect(
    externalJson('https://example.test', {}, async () => new Response('x'.repeat(512 * 1024 + 1))),
  ).rejects.toThrow('muito grande');
});
