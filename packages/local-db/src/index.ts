import Dexie, { type EntityTable } from 'dexie';
import {
  Memory,
  mediaTypes,
  PullPage,
  PushReceipt,
  type Operation,
  Capsule,
  Mutation,
  Snapshot,
  Backup,
} from '@rodkisten/jardim-contracts';
export class GardenDB extends Dexie {
  memories!: EntityTable<Memory, 'id'>;
  outbox!: EntityTable<Operation, 'operationId'>;
  meta!: EntityTable<{ key: string; value: number }, 'key'>;
  mutations!: EntityTable<Mutation, 'memoryId'>;
  versions!: EntityTable<Snapshot & { memoryId: string }, 'memoryId'>;
  conflicts!: EntityTable<{ memoryId: string; operation: Mutation; remote: Snapshot }, 'memoryId'>;
  attachments!: EntityTable<
    { id: string; blob: Blob; name: string; uploaded: number; duration?: number },
    'id'
  >;
  capsules!: EntityTable<{ id: string; payload: Capsule; uploaded: number }, 'id'>;
  constructor(name = 'jardim-v1') {
    super(name);
    this.version(1).stores({ memories: 'id,createdAt', outbox: 'operationId', meta: 'key' });
    this.version(2).stores({
      mutations: 'memoryId,operationId',
      versions: 'memoryId',
      conflicts: 'memoryId',
    });
    this.version(3).stores({ attachments: 'id,uploaded' });
    this.version(4).stores({ capsules: 'id,uploaded' });
  }
  async plant(
    input: { title: string; body: string; tags: string[] },
    files: { blob: Blob; name: string; duration?: number }[] = [],
  ) {
    if (
      files.length > 5 ||
      files.some(
        (file) =>
          (file.duration !== undefined &&
            (!Number.isFinite(file.duration) || file.duration <= 0 || file.duration > 86400)) ||
          file.blob.size > 12 * 1024 * 1024 ||
          !file.blob.size ||
          !(mediaTypes as readonly string[]).includes(file.blob.type.split(';')[0].toLowerCase()),
      )
    )
      throw Error('Use até 5 arquivos de no máximo 12 MiB.');
    const attachments = files.map((file) => ({ ...file, id: crypto.randomUUID(), uploaded: 0 }));
    const memory = Memory.parse({
      ...input,
      body: input.body + attachments.map((file) => `\n\n[anexo:${file.id}]`).join(''),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
    const op = { operationId: crypto.randomUUID(), memory };
    // A memory must never commit without its delivery operation, even if the tab closes.
    await this.transaction('rw', this.memories, this.outbox, this.attachments, async () => {
      await this.memories.add(memory);
      await this.outbox.add(op);
      await this.attachments.bulkAdd(attachments);
    });
    return memory;
  }
  async change(id: string, input: { title: string; body: string; tags: string[] } | null) {
    await this.transaction(
      'rw',
      this.memories,
      this.mutations,
      this.versions,
      this.conflicts,
      async () => {
        const current = await this.memories.get(id);
        if (!current) throw Error('Memória indisponível neste dispositivo.');
        const pending = await this.mutations.get(id);
        const version = await this.versions.get(id);
        const memory = Memory.parse(input ? { ...current, ...input } : current);
        if (!input && pending?.kind === 'create') {
          await this.mutations.delete(id);
          await this.memories.delete(id);
          return;
        }
        const operation = Mutation.parse({
          operationId: crypto.randomUUID(),
          memoryId: id,
          baseRevision: pending?.baseRevision ?? version?.revision ?? 1,
          kind: pending?.kind === 'create' && input ? 'create' : input ? 'edit' : 'delete',
          memory,
        });
        // Keep the latest local intent; an in-flight receipt may only remove the exact operation it sent.
        await this.mutations.put(operation);
        await this.conflicts.delete(id);
        if (input) await this.memories.put(memory);
        else await this.memories.delete(id);
      },
    );
  }
  async resolve(id: string, choice: 'local' | 'remote') {
    await this.transaction(
      'rw',
      this.memories,
      this.mutations,
      this.versions,
      this.conflicts,
      async () => {
        const conflict = await this.conflicts.get(id);
        if (!conflict) return;
        await this.versions.put({ ...conflict.remote, memoryId: id });
        if (choice === 'remote') {
          if (conflict.remote.deletedAt) await this.memories.delete(id);
          else await this.memories.put(conflict.remote.memory);
        } else {
          const operation = Mutation.parse({
            ...conflict.operation,
            operationId: crypto.randomUUID(),
            baseRevision: conflict.remote.revision,
            kind: conflict.operation.kind === 'delete' ? 'delete' : 'edit',
          });
          await this.mutations.put(operation);
          if (operation.kind !== 'delete') await this.memories.put(operation.memory);
        }
        await this.conflicts.delete(id);
      },
    );
  }
  async revive(id: string, previous?: Memory) {
    await this.transaction(
      'rw',
      this.memories,
      this.mutations,
      this.versions,
      this.conflicts,
      async () => {
        const version = await this.versions.get(id);
        if (!version) throw Error('Sincronize antes de restaurar.');
        const memory = Memory.parse({
          ...version.memory,
          ...previous,
          id,
          createdAt: version.memory.createdAt,
        });
        await this.mutations.put(
          Mutation.parse({
            operationId: crypto.randomUUID(),
            memoryId: id,
            baseRevision: version.revision,
            kind: 'edit',
            memory,
          }),
        );
        await this.memories.put(memory);
        await this.conflicts.delete(id);
      },
    );
  }
  async restore(input: unknown) {
    const backup = Backup.parse(input);
    let added = 0,
      skipped = 0;
    await this.transaction(
      'rw',
      this.memories,
      this.mutations,
      this.versions,
      this.conflicts,
      async () => {
        for (const memory of backup.memories) {
          const local = await this.memories.get(memory.id);
          const version = await this.versions.get(memory.id);
          // Never overwrite local edits or resurrect a known deletion through import.
          if (
            local ||
            version ||
            (await this.mutations.get(memory.id)) ||
            (await this.conflicts.get(memory.id))
          ) {
            skipped++;
            continue;
          }
          await this.memories.add(memory);
          await this.mutations.add(
            Mutation.parse({
              operationId: crypto.randomUUID(),
              memoryId: memory.id,
              baseRevision: 0,
              kind: 'create',
              memory,
            }),
          );
          added++;
        }
      },
    );
    return { added, skipped };
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

export async function sendCreations(db: GardenDB, fetcher: typeof fetch) {
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
}

async function exchange(db: GardenDB, fetcher: typeof fetch) {
  await sendCreations(db, fetcher);
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
