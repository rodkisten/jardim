import { expect, test } from 'vitest';
import { createTestDatabase } from './helpers/d1';
import { preferences } from '../apps/api/src/preferences';
import {
  integrationStatus,
  spotifyStart,
  spotifyCallback,
  type IntegrationEnv,
} from '../apps/api/src/integrations';
import { audioPeaks, mediaTime } from '../apps/web/src/audio';
test('preferences persist city and Spotify app, reject unknown/secret fields and invalidate old OAuth app state', async () => {
  const remote = createTestDatabase();
  const env = {
    DB: remote.binding,
    APP_ORIGIN: 'https://jardim.migos.club',
    INTEGRATION_KEY: 'b'.repeat(64),
  } as IntegrationEnv;
  try {
    expect(
      (await preferences(env, JSON.stringify({ spotifyClientSecret: 'never-accept' }))).status,
    ).toBe(400);
    expect(
      (
        await preferences(
          env,
          JSON.stringify({ city: { label: 'test', latitude: 100, longitude: 0 } }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await preferences(
          env,
          JSON.stringify({
            city: { label: 'Simonésia, MG', latitude: -20.12, longitude: -42.01 },
            spotifyClientId: 'a'.repeat(32),
          }),
        )
      ).status,
    ).toBe(200);
    expect(await (await preferences(env)).json()).toMatchObject({
      city: { label: 'Simonésia, MG' },
      spotifyClientId: 'a'.repeat(32),
    });
    expect(await (await integrationStatus(env)).json()).toMatchObject({
      spotify: {
        configured: true,
        missing: null,
        redirectUri: 'https://jardim.migos.club/v2/spotify/callback',
      },
    });
    const auth = new URL(((await (await spotifyStart(env)).json()) as { url: string }).url);
    expect(auth.searchParams.get('client_id')).toBe('a'.repeat(32));
    await preferences(
      env,
      JSON.stringify({ city: { label: 'Outra cidade', latitude: 0, longitude: 0 } }),
    );
    expect(remote.sqlite.prepare('SELECT count(*) n FROM oauth_pending').get()!.n).toBe(1);
    await preferences(env, JSON.stringify({ spotifyClientId: 'c'.repeat(32) }));
    expect(remote.sqlite.prepare('SELECT count(*) n FROM oauth_pending').get()!.n).toBe(0);
    expect(
      (
        await spotifyCallback(
          env,
          new URL('https://jardim.migos.club/v2/spotify/callback?error=access_denied'),
        )
      ).headers.get('Location'),
    ).toBe('/?spotify=denied#integracoes');
  } finally {
    remote.close();
  }
});
test('audio visualization measures sample energy, preserves silence and formats finite durations', () => {
  expect(audioPeaks(new Float32Array())).toEqual([]);
  expect(audioPeaks(new Float32Array(48))).toEqual(Array(48).fill(0));
  const samples = new Float32Array(480);
  samples.fill(0.5, 0, 240);
  samples.fill(0.1, 240);
  const peaks = audioPeaks(samples, 48);
  expect(peaks[0]).toBe(1);
  expect(peaks[47]).toBeCloseTo(0.2);
  expect(mediaTime(Infinity)).toBe('0:00');
  expect(mediaTime(61.7)).toBe('1:01');
});
