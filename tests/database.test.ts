import { expect, test } from 'vitest';
import { createDatabase, findReceipts, findSession } from '@rodkisten/jardim-database';
import { createTestDatabase } from './helpers/d1';

test('Prisma D1 reads the existing migration without changing memory IDs or cursor rowids', async () => {
  const { binding, sqlite, close } = createTestDatabase();
  const id = crypto.randomUUID(),
    operationId = crypto.randomUUID();
  sqlite
    .prepare('INSERT INTO memories(id,operation_id,title,body,tags,created_at) VALUES(?,?,?,?,?,?)')
    .run(id, operationId, 'Preservar', 'Memória existente', '["vida"]', '2026-11-13T00:00:00.000Z');
  const before = sqlite.prepare('SELECT rowid,* FROM memories').get();
  const prisma = createDatabase(binding);
  try {
    const memory = await prisma.memory.findUniqueOrThrow({ where: { id } });
    expect(memory).toEqual({
      id,
      operationId,
      title: 'Preservar',
      body: 'Memória existente',
      tags: '["vida"]',
      createdAt: '2026-11-13T00:00:00.000Z',
      revision: 1,
      deletedAt: null,
      revisionOperation: null,
    });
    expect(await findReceipts(binding, [id, crypto.randomUUID()])).toEqual([{ id, operationId }]);
    expect(sqlite.prepare('SELECT rowid,* FROM memories').get()).toEqual(before);
  } finally {
    await prisma.$disconnect();
    close();
  }
});

test('Prisma BigInt expiry matches millisecond sessions and rejects expired sessions', async () => {
  const { binding, sqlite, close } = createTestDatabase();
  try {
    const now = Date.now();
    sqlite
      .prepare('INSERT INTO sessions(token_hash,expires_at) VALUES(?,?)')
      .run('valid', now + 60000);
    sqlite
      .prepare('INSERT INTO sessions(token_hash,expires_at) VALUES(?,?)')
      .run('expired', now - 1);
    expect(await findSession(binding, 'valid', now)).toEqual({ tokenHash: 'valid' });
    expect(await findSession(binding, 'expired', now)).toBeNull();
    expect(await findSession(binding, 'missing', now)).toBeNull();
  } finally {
    close();
  }
});
