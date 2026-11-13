import { expect, test } from 'vitest';
import { createTestDatabase } from './helpers/d1';
import worker from '../apps/api/src/index';
import { youtubeVideo } from '@rodkisten/jardim-capture';

test('capture strips tracking and rejects unrelated hosts, credentials, malformed IDs and URLs', () => {
  expect(
    youtubeVideo('https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=private&search=secret'),
  ).toEqual({ id: 'dQw4w9WgXcQ', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
  for (const url of [
    'broken',
    'http://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil/watch?v=dQw4w9WgXcQ',
    'https://secret@youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=bad',
  ])
    expect(youtubeVideo(url)).toBeNull();
});

test('device append-only scope, atomic retry, provenance, second-device pull and revocation', async () => {
  const { binding: DB, sqlite, close } = createTestDatabase();
  const origin = 'https://jardim.migos.club';
  const env = { DB, JARDIM_PASSWORD: 'test-password', APP_ORIGIN: origin } as Env;
  const request = (path: string, init: RequestInit = {}) =>
    worker.fetch(new Request(origin + path, init), env);
  try {
    const login = await request('/auth/login', {
      method: 'POST',
      headers: { origin },
      body: 'password=test-password',
    });
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    expect(
      (await request('/v1/devices', { method: 'POST', headers: { cookie }, body: '{}' })).status,
    ).toBe(403);
    const created = await request('/v1/devices', {
      method: 'POST',
      headers: { origin, cookie },
      body: JSON.stringify({ name: 'Safari' }),
    });
    expect(created.status).toBe(201);
    const { id, token } = (await created.json()) as { id: string; token: string };
    expect(sqlite.prepare('SELECT token_hash FROM capture_devices').get()!.token_hash).not.toBe(
      token,
    );
    const headers = { authorization: `Bearer ${token}` };
    expect((await request('/v1/memories', { headers })).status).toBe(401);
    expect((await request('/v1/devices', { headers })).status).toBe(401);
    const event = {
      id: crypto.randomUUID(),
      title: 'Um vídeo',
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ&list=private',
      observedAt: new Date().toISOString(),
    };
    const send = (events: unknown[]) =>
      request('/v1/events/batch', { method: 'POST', headers, body: JSON.stringify({ events }) });
    for (let i = 0; i < 2; i++)
      expect(await (await send([event])).json()).toEqual({ acknowledged: [event.id] });
    expect(sqlite.prepare('SELECT count(*) AS n FROM memories').get()!.n).toBe(1);
    expect(sqlite.prepare('SELECT url FROM capture_events').get()!.url).not.toContain('private');
    const page = (await (await request('/v1/sync/bootstrap', { headers: { cookie } })).json()) as {
      memories: { id: string; body: string }[];
    };
    expect(page.memories[0].id).toBe(event.id);
    expect(page.memories[0].body).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(
      (await send([{ ...event, id: crypto.randomUUID(), url: 'https://evil.example/' }])).status,
    ).toBe(400);
    expect((await send([{ ...event, id: crypto.randomUUID(), url: 'broken' }])).status).toBe(400);
    expect(
      (await send([{ ...event, id: crypto.randomUUID(), observedAt: '2099-01-01T00:00:00.000Z' }]))
        .status,
    ).toBe(400);
    expect((await send([{ ...event, body: 'not allowed' }])).status).toBe(400);
    expect(
      (await request(`/v1/devices/${id}`, { method: 'DELETE', headers: { origin, cookie } }))
        .status,
    ).toBe(200);
    expect((await send([event])).status).toBe(401);
    const list = await (await request('/v1/devices', { headers: { cookie } })).json();
    expect(JSON.stringify(list)).not.toContain(token);
  } finally {
    close();
  }
});
