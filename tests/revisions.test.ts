import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import { GardenDB } from '@rodkisten/jardim-local-db';
import { synchronizeDiary } from '@rodkisten/jardim-local-db/revisions';
import worker from '../apps/api/src/index';
import { createTestDatabase } from './helpers/d1';
import type { Mutation } from '@rodkisten/jardim-contracts';

async function setup() {
  const remote = createTestDatabase();
  const origin = 'https://jardim.migos.club';
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
  const a = new GardenDB(crypto.randomUUID()),
    b = new GardenDB(crypto.randomUUID());
  return {
    a,
    b,
    fetcher,
    ...remote,
    async done() {
      await a.delete();
      await b.delete();
      remote.close();
    },
  };
}
test('two-device edits conflict explicitly, preserve both contents, resolve, delete and restore revision', async () => {
  const { a, b, fetcher, sqlite, done } = await setup();
  try {
    const m = await a.plant({ title: 'Original', body: 'Uma memória', tags: [] });
    await synchronizeDiary(a, fetcher);
    await synchronizeDiary(b, fetcher);
    expect((await b.memories.get(m.id))?.title).toBe('Original');
    await a.change(m.id, { ...m, title: 'Primeira edição' });
    await b.change(m.id, { ...m, title: 'Outra edição offline' });
    await synchronizeDiary(a, fetcher);
    await synchronizeDiary(b, fetcher);
    const conflict = await b.conflicts.get(m.id);
    expect(conflict?.operation.memory.title).toBe('Outra edição offline');
    expect(conflict?.remote.memory.title).toBe('Primeira edição');
    expect((await b.memories.get(m.id))?.title).toBe('Outra edição offline');
    await b.resolve(m.id, 'local');
    await synchronizeDiary(b, fetcher);
    await synchronizeDiary(a, fetcher);
    expect((await a.memories.get(m.id))?.title).toBe('Outra edição offline');
    expect(await b.conflicts.count()).toBe(0);
    await a.change(m.id, null);
    await synchronizeDiary(a, fetcher);
    await synchronizeDiary(b, fetcher);
    expect(await b.memories.get(m.id)).toBeUndefined();
    expect((await b.versions.get(m.id))?.deletedAt).not.toBeNull();
    const snapshots = (await (await fetcher(`/v2/memories/${m.id}/revisions`)).json()) as {
      snapshots: { revision: number; memory: typeof m }[];
    };
    expect(snapshots.snapshots).toHaveLength(4);
    expect(snapshots.snapshots.at(-1)?.memory.title).toBe('Original');
    expect(sqlite.prepare('SELECT count(*) AS n FROM memories').get()!.n).toBe(1);
  } finally {
    await done();
  }
});
test('lost mutation receipt retries exactly once; reused operation cannot mutate a different record', async () => {
  const { a, fetcher, sqlite, done } = await setup();
  try {
    const m = await a.plant({ title: 'Original', body: 'Texto', tags: [] });
    await synchronizeDiary(a, fetcher);
    await a.change(m.id, { ...m, title: 'Editada' });
    const op = (await a.mutations.get(m.id))!;
    let lost = true;
    await expect(
      synchronizeDiary(a, async (input, init) => {
        const response = await fetcher(input, init);
        if (input === '/v2/mutations' && lost) {
          lost = false;
          throw Error('lost response');
        }
        return response;
      }),
    ).rejects.toThrow('lost response');
    expect(await a.mutations.count()).toBe(1);
    await synchronizeDiary(a, fetcher);
    expect(await a.mutations.count()).toBe(0);
    expect(sqlite.prepare('SELECT revision FROM memories').get()!.revision).toBe(2);
    const bad: Mutation = {
      ...op,
      kind: 'create',
      baseRevision: 0,
      memoryId: crypto.randomUUID(),
      memory: { ...m, id: crypto.randomUUID() },
    };
    bad.memory.id = bad.memoryId;
    expect(
      (await fetcher('/v2/mutations', { method: 'POST', body: JSON.stringify(bad) })).status,
    ).toBe(409);
    expect(sqlite.prepare('SELECT count(*) AS n FROM memories').get()!.n).toBe(1);
  } finally {
    await done();
  }
});
test('an edit made during an in-flight save survives its earlier receipt', async () => {
  const { a, fetcher, done } = await setup();
  try {
    const m = await a.plant({ title: 'Original', body: 'Texto', tags: [] });
    await synchronizeDiary(a, fetcher);
    await a.change(m.id, { ...m, title: 'Edição 1' });
    let edited = false;
    await synchronizeDiary(a, async (input, init) => {
      const response = await fetcher(input, init);
      if (input === '/v2/mutations' && !edited) {
        edited = true;
        await a.change(m.id, { ...m, title: 'Edição 2' });
      }
      return response;
    });
    expect((await a.memories.get(m.id))?.title).toBe('Edição 2');
    expect((await a.versions.get(m.id))?.revision).toBe(3);
    expect(await a.mutations.count()).toBe(0);
  } finally {
    await done();
  }
});
test('backup import is atomic, idempotent and cannot overwrite a newer remote version', async () => {
  const { a, b, fetcher, done } = await setup();
  try {
    const m = await a.plant({ title: 'Original', body: 'Texto', tags: [] });
    await synchronizeDiary(a, fetcher);
    const backup = { schemaVersion: 1, exportedAt: new Date().toISOString(), memories: [m] };
    expect(await b.restore(backup)).toEqual({ added: 1, skipped: 0 });
    await synchronizeDiary(b, fetcher);
    expect(await b.conflicts.count()).toBe(0);
    expect(await b.restore(backup)).toEqual({ added: 0, skipped: 1 });
    await a.change(m.id, { ...m, title: 'Versão nova' });
    await synchronizeDiary(a, fetcher);
    await b.delete();
    await b.open();
    await b.restore(backup);
    await synchronizeDiary(b, fetcher);
    expect((await b.conflicts.get(m.id))?.remote.memory.title).toBe('Versão nova');
    await b.resolve(m.id, 'remote');
    expect((await b.memories.get(m.id))?.title).toBe('Versão nova');
    await expect(
      b.restore({ ...backup, memories: [m, { ...m, id: 'invalid' }] }),
    ).rejects.toThrow();
    expect(await b.memories.count()).toBe(1);
  } finally {
    await done();
  }
});
