import 'fake-indexeddb/auto';
import { afterEach, expect, test } from 'vitest';
import { GardenDB, synchronize } from '../packages/local-db/src/index';
import { Memory, Push } from '../packages/contracts/src/index';
import { equalSecret, sessionToken } from '../apps/api/src/auth';
import worker, { limitedBody } from '../apps/api/src/index';
const databases: GardenDB[] = [];
function database() {
  const db = new GardenDB(crypto.randomUUID());
  databases.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});
test('password comparison and strict session parsing', async () => {
  expect(await equalSecret('correct', 'correct')).toBe(true);
  expect(await equalSecret('wrong', 'correct')).toBe(false);
  expect(
    sessionToken(
      new Request('https://a', { headers: { cookie: 'evil__Host-jardim=' + 'a'.repeat(64) } }),
    ),
  ).toBeUndefined();
});
test('contracts reject oversize and malformed memory', () => {
  expect(Memory.safeParse({ title: 'x' }).success).toBe(false);
  expect(Push.safeParse({ operations: [] }).success).toBe(false);
});
test('memory and outbox commit together; survives reopening', async () => {
  const db = database();
  const m = await db.plant({ title: 'Hoje', body: 'Uma memória', tags: [] });
  expect(await db.outbox.count()).toBe(1);
  db.close();
  await db.open();
  expect(await db.memories.get(m.id)).toEqual(m);
});
test('offline failure keeps outbox and same operation for retry', async () => {
  const db = database();
  await db.plant({ title: 'Hoje', body: 'Teste', tags: [] });
  const first = (await db.outbox.toArray())[0];
  await expect(
    synchronize(db, async () => {
      throw Error('offline');
    }),
  ).rejects.toThrow('offline');
  expect((await db.outbox.toArray())[0]).toEqual(first);
  const remote: unknown[] = [];
  await synchronize(db, async (url, init) => {
    if (init) {
      const data = JSON.parse(String(init.body));
      remote.push(data.operations[0].memory);
      return Response.json({ acknowledged: [first.operationId] });
    }
    return Response.json({ memories: remote, cursor: 1, hasMore: false });
  });
  expect(await db.outbox.count()).toBe(0);
  expect(await db.memories.count()).toBe(1);
});
test('unacknowledged items retained; cursor does not advance on invalid payload', async () => {
  const db = database();
  await db.plant({ title: 'A', body: 'B', tags: [] });
  await expect(
    synchronize(db, async (_url, init) =>
      Response.json(init ? { acknowledged: [] } : { memories: [{}], cursor: 1, hasMore: false }),
    ),
  ).rejects.toThrow();
  expect(await db.outbox.count()).toBe(1);
  expect(await db.meta.get('cursor')).toBeUndefined();
});
test('bounded request reader rejects streamed oversize', async () => {
  expect(
    await limitedBody(new Request('https://a', { method: 'POST', body: '12345' }), 4),
  ).toBeNull();
});
test('API fails closed without password and blocks cross origin writes', async () => {
  const env = {
    JARDIM_PASSWORD: 'test',
    APP_ORIGIN: 'https://jardim.migos.club',
    DB: {} as D1Database,
  } as Env;
  expect(
    (await worker.fetch(new Request('https://jardim.migos.club/v1/memories'), {} as Env)).status,
  ).toBe(503);
  expect(
    (
      await worker.fetch(
        new Request('https://jardim.migos.club/auth/login', {
          method: 'POST',
          headers: { origin: 'https://evil.example' },
          body: 'password=test',
        }),
        env,
      )
    ).status,
  ).toBe(403);
  expect(
    (await worker.fetch(new Request('https://jardim.migos.club/v1/memories'), env)).status,
  ).toBe(401);
});
