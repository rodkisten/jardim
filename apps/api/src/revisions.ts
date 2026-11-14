import { Mutation, Snapshot } from '@rodkisten/jardim-contracts';
import { hash } from './auth';
export async function mutate(env: Env, text: string) {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const parsed = Mutation.safeParse(input);
  if (!parsed.success) return Response.json({ error: 'Alteração inválida' }, { status: 400 });
  const op = parsed.data,
    m = op.memory;
  const digest = await hash(JSON.stringify(op));
  const prior = await env.DB.prepare(
    'SELECT payload_hash,snapshot FROM mutation_receipts WHERE operation_id=?',
  )
    .bind(op.operationId)
    .first<{ payload_hash: string; snapshot: string }>();
  if (prior)
    return prior.payload_hash === digest
      ? Response.json({
          operationId: op.operationId,
          status: 'accepted',
          snapshot: Snapshot.parse(JSON.parse(prior.snapshot)),
        })
      : Response.json({ error: 'ID de operação já utilizado' }, { status: 409 });
  const current = await env.DB.prepare('SELECT created_at FROM memories WHERE id=?')
    .bind(op.memoryId)
    .first<{ created_at: string }>();
  if (!current && op.kind !== 'create')
    return Response.json({ error: 'Memória ainda não recebida' }, { status: 409 });
  if (current && current.created_at !== m.createdAt)
    return Response.json({ error: 'A data original não pode ser alterada' }, { status: 400 });
  // Compare-and-swap and its receipt commit atomically. A lost response cannot apply the revision twice.
  await env.DB.batch([
    ...(op.kind === 'create'
      ? [
          env.DB.prepare(
            'INSERT INTO memories(id,operation_id,title,body,tags,created_at,revision_operation) SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM mutation_receipts WHERE operation_id=?) ON CONFLICT DO NOTHING',
          ).bind(
            m.id,
            op.operationId,
            m.title,
            m.body,
            JSON.stringify(m.tags),
            m.createdAt,
            op.operationId,
            op.operationId,
          ),
        ]
      : []),
    env.DB.prepare(
      'UPDATE memories SET title=?,body=?,tags=?,deleted_at=?,revision=revision+1,revision_operation=? WHERE id=? AND revision=? AND NOT EXISTS(SELECT 1 FROM mutation_receipts WHERE operation_id=?)',
    ).bind(
      m.title,
      m.body,
      JSON.stringify(m.tags),
      op.kind === 'delete' ? new Date().toISOString() : null,
      op.operationId,
      m.id,
      op.baseRevision,
      op.operationId,
    ),
    env.DB.prepare(
      'INSERT OR IGNORE INTO mutation_receipts(operation_id,payload_hash,snapshot) SELECT ?,?,r.snapshot FROM memories m JOIN memory_revisions r ON r.memory_id=m.id AND r.revision=m.revision WHERE m.id=? AND m.revision_operation=?',
    ).bind(op.operationId, digest, m.id, op.operationId),
  ]);
  if (op.kind === 'create')
    await env.DB.prepare(
      'INSERT OR IGNORE INTO mutation_receipts(operation_id,payload_hash,snapshot) SELECT ?,?,r.snapshot FROM memories m JOIN memory_revisions r ON r.memory_id=m.id AND r.revision=m.revision WHERE m.id=? AND m.title=? AND m.body=? AND m.tags=? AND m.created_at=? AND m.deleted_at IS NULL',
    )
      .bind(op.operationId, digest, m.id, m.title, m.body, JSON.stringify(m.tags), m.createdAt)
      .run();
  const receipt = await env.DB.prepare(
    'SELECT payload_hash,snapshot FROM mutation_receipts WHERE operation_id=?',
  )
    .bind(op.operationId)
    .first<{ payload_hash: string; snapshot: string }>();
  if (receipt && receipt.payload_hash !== digest)
    return Response.json({ error: 'ID de operação já utilizado' }, { status: 409 });
  const row =
    receipt ||
    (await env.DB.prepare(
      'SELECT r.snapshot FROM memory_revisions r JOIN memories m ON m.id=r.memory_id AND m.revision=r.revision WHERE m.id=?',
    )
      .bind(m.id)
      .first<{ snapshot: string }>());
  if (!row) return Response.json({ error: 'Revisão indisponível' }, { status: 409 });
  return Response.json({
    operationId: op.operationId,
    status: receipt ? 'accepted' : 'conflict',
    snapshot: Snapshot.parse(JSON.parse(row.snapshot)),
  });
}
export async function revisionPage(env: Env, cursor: number) {
  const rows = await env.DB.prepare(
    'SELECT c.sequence,r.snapshot FROM memory_changes c JOIN memories m ON m.id=c.memory_id JOIN memory_revisions r ON r.memory_id=m.id AND r.revision=m.revision WHERE c.sequence>? ORDER BY c.sequence LIMIT 100',
  )
    .bind(cursor)
    .all<{ sequence: number; snapshot: string }>();
  return Response.json({
    snapshots: rows.results.map((row) => Snapshot.parse(JSON.parse(row.snapshot))),
    cursor: rows.results.at(-1)?.sequence || cursor,
    hasMore: rows.results.length === 100,
  });
}
export async function history(env: Env, id: string) {
  const rows = await env.DB.prepare(
    'SELECT snapshot FROM memory_revisions WHERE memory_id=? ORDER BY revision DESC LIMIT 50',
  )
    .bind(id)
    .all<{ snapshot: string }>();
  return Response.json({
    snapshots: rows.results.map((row) => Snapshot.parse(JSON.parse(row.snapshot))),
  });
}
