import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import { createTestDatabase } from './helpers/d1';
import worker from '../apps/api/src/index';
import { GardenDB } from '@rodkisten/jardim-local-db';
import { synchronizeDiary } from '@rodkisten/jardim-local-db/revisions';
import { Capsule } from '@rodkisten/jardim-contracts';
test('sealed capsule survives source edits and lost receipts without creating another version', async () => {
  const remote = createTestDatabase(),
    db = new GardenDB(crypto.randomUUID()),
    origin = 'https://jardim.migos.club';
  const env = { DB: remote.binding, JARDIM_PASSWORD: 'test', APP_ORIGIN: origin } as Env;
  const login = await worker.fetch(
    new Request(origin + '/auth/login', {
      method: 'POST',
      headers: { origin },
      body: 'password=test',
    }),
    env,
  );
  const cookie = login.headers.get('set-cookie')!.split(';')[0];
  const fetcher: typeof fetch = async (input, init = {}) =>
    worker.fetch(
      new Request(origin + input, { ...init, headers: { origin, cookie, ...init.headers } }),
      env,
    );
  try {
    const memory = await db.plant({ title: 'Original', body: 'Uma memória', tags: [] });
    await synchronizeDiary(db, fetcher);
    const payload = Capsule.parse({
      id: crypto.randomUUID(),
      month: '2026-11',
      title: 'Novembro',
      introduction: 'Meu mês',
      memories: [memory],
    });
    await db.capsules.add({ id: payload.id, payload, uploaded: 0 });
    await expect(
      synchronizeDiary(db, async (input, init) => {
        const response = await fetcher(input, init);
        if (input === '/v2/capsules') throw Error('lost');
        return response;
      }),
    ).rejects.toThrow('lost');
    expect((await db.capsules.get(payload.id))?.uploaded).toBe(0);
    await synchronizeDiary(db, fetcher);
    expect((await db.capsules.get(payload.id))?.uploaded).toBe(1);
    expect(remote.sqlite.prepare('SELECT count(*) AS n FROM capsules').get()!.n).toBe(1);
    await db.change(memory.id, { ...memory, title: 'Editada depois de selar' });
    await synchronizeDiary(db, fetcher);
    const saved = (await (await fetcher('/v2/capsules/' + payload.id)).json()) as {
      capsule: Capsule;
    };
    expect(saved.capsule.memories[0].title).toBe('Original');
    expect(
      (
        await fetcher('/v2/capsules', {
          method: 'POST',
          body: JSON.stringify({ ...payload, title: 'Overwrite' }),
        })
      ).status,
    ).toBe(409);
    expect(
      (await worker.fetch(new Request(origin + '/v2/capsules/' + payload.id), env)).status,
    ).toBe(401);
  } finally {
    await db.delete();
    remote.close();
  }
});
