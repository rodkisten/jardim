import 'fake-indexeddb/auto';
import { afterEach, expect, test } from 'vitest';
import { GardenDB, synchronize, encodeBatch } from '@rodkisten/jardim-local-db';
import { RetryBackoff } from '@rodkisten/jardim-local-db/retry';
import type { Memory, Operation } from '@rodkisten/jardim-contracts';
const databases: GardenDB[] = [];
function database() {
  const db = new GardenDB(crypto.randomUUID());
  databases.push(db);
  return db;
}
function memory(body = 'Memória'): Memory {
  return {
    id: crypto.randomUUID(),
    title: 'Dia',
    body,
    tags: [],
    createdAt: new Date().toISOString(),
  };
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});
test('one pass drains more than 50 pending memories', async () => {
  const db = database();
  const operations: Operation[] = Array.from({ length: 123 }, () => ({
    operationId: crypto.randomUUID(),
    memory: memory(),
  }));
  await db.outbox.bulkAdd(operations);
  const sizes: number[] = [];
  await synchronize(db, async (_url, init) => {
    if (init) {
      const { operations } = JSON.parse(String(init.body)) as { operations: Operation[] };
      sizes.push(operations.length);
      return Response.json({ acknowledged: operations.map((o) => o.operationId) });
    }
    return Response.json({ memories: [], cursor: 0, hasMore: false });
  });
  expect(sizes).toEqual([50, 50, 23]);
  expect(await db.outbox.count()).toBe(0);
});
test('UTF-8 batch budget counts emoji bytes and never loses candidates', () => {
  const candidates = Array.from({ length: 50 }, () => ({
    operationId: crypto.randomUUID(),
    memory: memory('🌻'.repeat(10000)),
  }));
  const batch = encodeBatch(candidates);
  expect(new TextEncoder().encode(batch.body).byteLength).toBeLessThanOrEqual(512 * 1024);
  expect(batch.operations.length).toBeLessThan(50);
  expect(batch.operations[0]).toEqual(candidates[0]);
});
test('malformed or foreign acknowledgements cannot delete the outbox', async () => {
  const db = database();
  await db.plant({ title: 'Local', body: 'Preservar', tags: [] });
  for (const acknowledged of [undefined, [crypto.randomUUID()], ['invalid']]) {
    await expect(synchronize(db, async () => Response.json({ acknowledged }))).rejects.toThrow();
    expect(await db.outbox.count()).toBe(1);
  }
});
test('partial acknowledgement removes only confirmed operations and stops retry loops', async () => {
  const db = database();
  await db.plant({ title: 'A', body: 'A', tags: [] });
  await db.plant({ title: 'B', body: 'B', tags: [] });
  const operations = await db.outbox.toArray();
  let calls = 0;
  await expect(
    synchronize(db, async () => {
      calls++;
      return Response.json({ acknowledged: [operations[0].operationId] });
    }),
  ).rejects.toThrow('continuam neste dispositivo');
  expect(calls).toBe(1);
  expect((await db.outbox.toArray()).map((o) => o.operationId)).toEqual([
    operations[1].operationId,
  ]);
});
test('fresh device bootstraps all pages; concurrent callers share one exchange', async () => {
  const db = database();
  const all = Array.from({ length: 135 }, () => memory());
  const paths: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    paths.push(String(input));
    return Response.json(
      paths.length === 1
        ? { memories: all.slice(0, 100), cursor: 100, hasMore: true }
        : { memories: all.slice(100), cursor: 135, hasMore: false },
    );
  };
  await Promise.all([synchronize(db, fetcher), synchronize(db, fetcher)]);
  expect(paths).toEqual(['/v1/sync/bootstrap', '/v1/sync/pull?cursor=100']);
  expect(await db.memories.count()).toBe(135);
  expect((await db.meta.get('cursor'))?.value).toBe(135);
});
test('a delayed page cannot rewind a cursor advanced by another tab', async () => {
  const db = database();
  await db.meta.put({ key: 'cursor', value: 10 });
  await synchronize(db, async () => {
    await db.meta.put({ key: 'cursor', value: 30 });
    return Response.json({ memories: [memory()], cursor: 20, hasMore: false });
  });
  expect((await db.meta.get('cursor'))?.value).toBe(30);
});
test('malformed pagination leaves the local cursor and data unchanged', async () => {
  for (const page of [
    { memories: [], cursor: 0, hasMore: true },
    { memories: [], cursor: 1, hasMore: 'yes' },
    { memories: [{}], cursor: 1, hasMore: false },
  ]) {
    const db = database();
    await expect(synchronize(db, async () => Response.json(page))).rejects.toThrow();
    expect(await db.meta.get('cursor')).toBeUndefined();
    expect(await db.memories.count()).toBe(0);
  }
});
test('retry backoff grows, caps, and resets after success', () => {
  const retry = new RetryBackoff();
  expect(retry.fail(0, 0.5)).toBe(5000);
  expect(retry.ready(4999)).toBe(false);
  expect(retry.ready(5000)).toBe(true);
  expect(retry.fail(5000, 0.5)).toBe(10000);
  for (let i = 0; i < 20; i++) expect(retry.fail(0, 1)).toBeLessThanOrEqual(300000);
  retry.success();
  expect(retry.ready(0)).toBe(true);
  expect(retry.fail(0, 0.5)).toBe(5000);
});

test('transport rejects oversized streamed bodies and aborts stalled requests', async () => {
  const { fetchProtocol } = await import('@rodkisten/jardim-local-db/transport');
  await expect(
    fetchProtocol('/v1/sync/pull', undefined, async () => new Response('12345'), 1000, 4),
  ).rejects.toThrow('excede');
  const stalled: typeof fetch = async (_input, init) =>
    new Promise((_resolve, reject) =>
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
    );
  await expect(fetchProtocol('/v1/sync/pull', undefined, stalled, 10)).rejects.toThrow('aborted');
});
