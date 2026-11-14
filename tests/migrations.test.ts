import { test, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
test('forward migrations preserve existing IDs and rowids and seed revision history', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync('infra/cloudflare/migrations/0001_foundation.sql', 'utf8'));
    db.prepare(
      'INSERT INTO memories(id,operation_id,title,body,tags,created_at) VALUES(?,?,?,?,?,?)',
    ).run(
      'old-id',
      'old-operation',
      'Antes da migração',
      'Conteúdo preservado',
      '["vida"]',
      '2026-11-13T00:00:00.000Z',
    );
    const before = db
      .prepare('SELECT rowid,id,operation_id,title,body,tags,created_at FROM memories')
      .get();
    for (const file of [
      '0002_capture.sql',
      '0003_revisions.sql',
      '0004_capsules.sql',
      '0005_integrations.sql',
      '0006_preferences.sql',
    ])
      db.exec(readFileSync('infra/cloudflare/migrations/' + file, 'utf8'));
    expect(
      db.prepare('SELECT rowid,id,operation_id,title,body,tags,created_at FROM memories').get(),
    ).toEqual(before);
    const revision = db.prepare('SELECT snapshot FROM memory_revisions').get()!;
    expect(JSON.parse(String(revision.snapshot))).toMatchObject({
      revision: 1,
      deletedAt: null,
      memory: { id: 'old-id', title: 'Antes da migração' },
    });
    expect(db.prepare('SELECT memory_id FROM memory_changes').get()!.memory_id).toBe('old-id');
  } finally {
    db.close();
  }
});
