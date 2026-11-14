import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import worker from '../apps/api/src/index';
import { createTestDatabase } from './helpers/d1';
import { GardenDB } from '@rodkisten/jardim-local-db';
import { synchronizeDiary } from '@rodkisten/jardim-local-db/revisions';

test('private immutable media uploads validate size/type and serve Safari byte ranges', async () => {
  const remote = createTestDatabase();
  const files = new Map<string, { bytes: ArrayBuffer; type: string; sha256: string }>();
  const MEDIA = {
    head: async (id: string) => {
      const file = files.get(id);
      return file
        ? {
            size: file.bytes.byteLength,
            customMetadata: { sha256: file.sha256 },
            httpMetadata: { contentType: file.type },
            httpEtag: '"test"',
          }
        : null;
    },
    put: async (
      id: string,
      bytes: ArrayBuffer,
      options: { httpMetadata: { contentType: string }; customMetadata: { sha256: string } },
    ) => {
      if (files.has(id)) return null;
      files.set(id, {
        bytes,
        type: options.httpMetadata.contentType,
        sha256: options.customMetadata.sha256,
      });
      return { key: id };
    },
    get: async (id: string, options?: { range: { offset: number; length: number } }) => {
      const file = files.get(id);
      return file
        ? {
            body: new Response(
              options
                ? file.bytes.slice(
                    options.range.offset,
                    options.range.offset + options.range.length,
                  )
                : file.bytes,
            ).body,
          }
        : null;
    },
  } as R2Bucket;
  const origin = 'https://jardim.migos.club',
    env = { DB: remote.binding, MEDIA, JARDIM_PASSWORD: 'test', APP_ORIGIN: origin } as Env;
  const request = (path: string, init: RequestInit = {}) =>
    worker.fetch(new Request(origin + path, init), env);
  try {
    const id = crypto.randomUUID(),
      path = '/v2/media/' + id;
    expect((await request(path)).status).toBe(401);
    const login = await request('/auth/login', {
      method: 'POST',
      headers: { origin },
      body: 'password=test',
    });
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const put = (body: string, type = 'audio/mp4', headers: Record<string, string> = {}) =>
      request(path, {
        method: 'PUT',
        headers: { origin, cookie, 'Content-Type': type, ...headers },
        body,
      });
    expect((await put('123456')).status).toBe(201);
    expect((await put('123456')).status).toBe(200);
    expect((await put('different')).status).toBe(409);
    expect((await put('123456', 'image/png')).status).toBe(409);
    expect((await put('x', 'text/html')).status).toBe(415);
    expect(
      (await put('x', 'audio/mp4', { 'Content-Length': String(12 * 1024 * 1024 + 1) })).status,
    ).toBe(413);
    const partial = await request(path, { headers: { cookie, Range: 'bytes=1-3' } });
    expect(partial.status).toBe(206);
    expect(await partial.text()).toBe('234');
    expect(partial.headers.get('Content-Range')).toBe('bytes 1-3/6');
    expect(await (await request(path, { headers: { cookie, Range: 'bytes=-2' } })).text()).toBe(
      '56',
    );
    expect((await request(path, { headers: { cookie, Range: 'bytes=90-' } })).status).toBe(416);
    expect((await request(path, { headers: { cookie, Range: 'bytes=0-1,3-4' } })).status).toBe(416);
    const head = await request(path, { method: 'HEAD', headers: { cookie } });
    expect(head.headers.get('Content-Length')).toBe('6');
    expect(await head.text()).toBe('');
  } finally {
    remote.close();
  }
});
test('attachment, memory and outbox persist atomically; failed upload retains bytes and pending work', async () => {
  const db = new GardenDB(crypto.randomUUID());
  try {
    const memory = await db.plant({ title: 'Áudio', body: 'Gravação', tags: [] }, [
      { blob: new Blob(['recording'], { type: 'audio/mp4' }), name: 'voz.mp4' },
    ]);
    expect(memory.body).toMatch(/\[anexo:[a-f0-9-]{36}\]/);
    const file = (await db.attachments.toArray())[0];
    db.close();
    await db.open();
    expect(await (await db.attachments.get(file.id))!.blob.text()).toBe('recording');
    await expect(
      synchronizeDiary(db, async () => new Response('', { status: 503 })),
    ).rejects.toThrow('Anexos preservados');
    expect(await db.outbox.count()).toBe(1);
    expect((await db.attachments.get(file.id))?.uploaded).toBe(0);
    await expect(
      synchronizeDiary(db, async () =>
        Response.json({ id: crypto.randomUUID(), size: 9, type: 'audio/mp4' }),
      ),
    ).rejects.toThrow('Confirmação de anexo inválida');
    expect((await db.attachments.get(file.id))?.uploaded).toBe(0);
    await expect(
      db.plant(
        { title: 'x', body: 'y', tags: [] },
        Array.from({ length: 6 }, () => ({ name: 'x', blob: new Blob(['x']) })),
      ),
    ).rejects.toThrow();
    expect(await db.memories.count()).toBe(1);
  } finally {
    await db.delete();
  }
});
