import Dexie, { type EntityTable } from 'dexie';
import { Memory, PullPage, PushReceipt, type Operation } from '@rodkisten/jardim-contracts';
export class GardenDB extends Dexie {
  memories!: EntityTable<Memory, 'id'>;
  outbox!: EntityTable<Operation, 'operationId'>;
  meta!: EntityTable<{ key: string; value: number }, 'key'>;
  constructor(name = 'jardim-v1') {
    super(name);
    this.version(1).stores({ memories: 'id,createdAt', outbox: 'operationId', meta: 'key' });
  }
  async plant(input: { title: string; body: string; tags: string[] }) {
    const memory = Memory.parse({
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
    const op = { operationId: crypto.randomUUID(), memory };
    // A memory must never commit without its delivery operation, even if the tab closes.
    await this.transaction('rw', this.memories, this.outbox, async () => {
      await this.memories.add(memory);
      await this.outbox.add(op);
    });
    return memory;
  }
}

// Coalesce concurrent callers in this tab; other tabs remain safe through idempotency and transactions.
const activeSyncs = new WeakMap<GardenDB, Promise<void>>();
export function synchronize(db: GardenDB, fetcher: typeof fetch = fetch): Promise<void> {
  const active = activeSyncs.get(db);
  if (active) return active;
  const task = exchange(db, fetcher).finally(() => activeSyncs.delete(db));
  activeSyncs.set(db, task);
  return task;
}

export function encodeBatch(candidates: Operation[]) {
  const operations: Operation[] = [];
  let body = '';
  for (const candidate of candidates.slice(0, 50)) {
    const next = JSON.stringify({ operations: [...operations, candidate] });
    // The API accepts 1 MiB. Reserve headroom and measure UTF-8 bytes, not JS characters.
    if (new TextEncoder().encode(next).byteLength > 512 * 1024) break;
    operations.push(candidate);
    body = next;
  }
  if (!operations.length) throw new Error('Memória excede o limite de sincronização.');
  return { operations, body };
}

async function exchange(db: GardenDB, fetcher: typeof fetch) {
  while (true) {
    const candidates = await db.outbox.limit(50).toArray();
    if (!candidates.length) break;
    const { operations, body } = encodeBatch(candidates);
    const res = await fetcher('/v1/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok)
      throw new Error(
        res.status === 401
          ? 'Entre novamente para sincronizar.'
          : 'Não foi possível enviar. Suas memórias estão neste dispositivo.',
      );
    const data = PushReceipt.parse(await res.json());
    const sent = new Set(operations.map((o) => o.operationId));
    const acknowledged = new Set(data.acknowledged);
    // Unknown/duplicate acknowledgements must never delete unrelated local operations.
    if (
      acknowledged.size !== data.acknowledged.length ||
      data.acknowledged.some((id) => !sent.has(id))
    )
      throw new Error('Confirmação de sincronização inválida.');
    await db.outbox.bulkDelete(data.acknowledged);
    // A partial acknowledgement needs attention, not an immediate infinite retry loop.
    if (acknowledged.size !== operations.length)
      throw new Error('Algumas memórias não foram confirmadas. Elas continuam neste dispositivo.');
  }
  let more = true;
  while (more) {
    const cursor = (await db.meta.get('cursor'))?.value || 0;
    // Cursor zero is a paginated bootstrap: a new device receives the complete remote diary.
    const endpoint = cursor === 0 ? '/v1/sync/bootstrap' : `/v1/sync/pull?cursor=${cursor}`;
    const res = await fetcher(endpoint);
    if (!res.ok)
      throw new Error(
        res.status === 401
          ? 'Entre novamente para sincronizar.'
          : 'Não foi possível receber memórias.',
      );
    const data = PullPage.parse(await res.json());
    if (data.cursor < cursor || (data.hasMore && (data.cursor === cursor || !data.memories.length)))
      throw new Error('Resposta de sincronização inválida');
    await db.transaction('rw', db.memories, db.meta, async () => {
      await db.memories.bulkPut(data.memories);
      // Another tab may have advanced while this response was in flight. Never rewind it.
      const current = (await db.meta.get('cursor'))?.value || 0;
      await db.meta.put({ key: 'cursor', value: Math.max(current, data.cursor) });
    });
    more = data.hasMore;
  }
}
