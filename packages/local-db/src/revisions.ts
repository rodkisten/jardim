import { MutationReceipt, RevisionPage, type Snapshot } from '@rodkisten/jardim-contracts';
import { sendCreations, type GardenDB } from './index';
const tasks = new WeakMap<GardenDB, Promise<void>>();
export function synchronizeDiary(db: GardenDB, fetcher: typeof fetch = fetch) {
  const active = tasks.get(db);
  if (active) return active;
  const task = exchange(db, fetcher).finally(() => tasks.delete(db));
  tasks.set(db, task);
  return task;
}
async function apply(db: GardenDB, snapshot: Snapshot) {
  const id = snapshot.memory.id;
  const previous = await db.versions.get(id);
  if (previous && previous.revision > snapshot.revision) return;
  await db.versions.put({ ...snapshot, memoryId: id });
  const conflict = await db.conflicts.get(id);
  if (conflict && snapshot.revision >= conflict.remote.revision)
    await db.conflicts.put({ ...conflict, remote: snapshot });
  if ((await db.mutations.get(id)) || conflict) return;
  if (snapshot.deletedAt) await db.memories.delete(id);
  else await db.memories.put(snapshot.memory);
}
async function exchange(db: GardenDB, fetcher: typeof fetch) {
  const files = await db.attachments.where('uploaded').equals(0).toArray();
  for (const file of files) {
    const response = await fetcher(`/v2/media/${file.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': file.blob.type },
      body: file.blob,
    });
    if (!response.ok) throw Error('Anexos preservados neste dispositivo. Não foi possível enviar.');
    const receipt = (await response.json()) as { id?: unknown; size?: unknown; type?: unknown };
    if (
      receipt.id !== file.id ||
      receipt.size !== file.blob.size ||
      receipt.type !== file.blob.type.split(';')[0]
    )
      throw Error('Confirmação de anexo inválida.');
    await db.attachments.update(file.id, { uploaded: 1 });
  }
  await sendCreations(db, fetcher);
  while (true) {
    const operation = await db.mutations.toCollection().first();
    if (!operation) break;
    const response = await fetcher('/v2/mutations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation),
    });
    if (!response.ok)
      throw Error(
        response.status === 401
          ? 'Entre novamente para sincronizar.'
          : 'Alterações preservadas. Não foi possível enviar.',
      );
    const receipt = MutationReceipt.parse(await response.json());
    if (
      receipt.operationId !== operation.operationId ||
      receipt.snapshot.memory.id !== operation.memoryId
    )
      throw Error('Confirmação de revisão inválida.');
    await db.transaction('rw', db.memories, db.mutations, db.versions, db.conflicts, async () => {
      const latest = await db.mutations.get(operation.memoryId);
      if (latest?.operationId === operation.operationId) {
        await db.mutations.delete(operation.memoryId);
        if (receipt.status === 'conflict')
          await db.conflicts.put({
            memoryId: operation.memoryId,
            operation,
            remote: receipt.snapshot,
          });
      } else if (
        latest &&
        receipt.status === 'accepted' &&
        latest.baseRevision === operation.baseRevision
      ) {
        // A user may keep typing while a request is in flight. Rebase only their direct next local edit.
        await db.mutations.put({
          ...latest,
          baseRevision: receipt.snapshot.revision,
          kind: latest.kind === 'create' ? 'edit' : latest.kind,
        });
      }
      await apply(db, receipt.snapshot);
    });
  }
  for (const record of await db.capsules.where('uploaded').equals(0).toArray()) {
    const body = JSON.stringify(record.payload);
    const response = await fetcher('/v2/capsules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!response.ok) throw Error('Cápsula selada neste dispositivo. O envio será retomado.');
    const receipt = (await response.json()) as { id?: unknown; payloadHash?: unknown };
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('');
    if (receipt.id !== record.id || receipt.payloadHash !== digest)
      throw Error('Confirmação de cápsula inválida.');
    await db.capsules.update(record.id, { uploaded: 1 });
  }
  let more = true;
  while (more) {
    const cursor = (await db.meta.get('revisionCursor'))?.value || 0;
    const response = await fetcher(`/v2/sync/pull?cursor=${cursor}`);
    if (!response.ok)
      throw Error('Não foi possível receber revisões. Suas alterações continuam salvas.');
    const page = RevisionPage.parse(await response.json());
    if (
      page.cursor < cursor ||
      (page.hasMore && (page.cursor === cursor || !page.snapshots.length))
    )
      throw Error('Página de revisões inválida.');
    await db.transaction(
      'rw',
      db.memories,
      db.mutations,
      db.versions,
      db.conflicts,
      db.meta,
      async () => {
        for (const snapshot of page.snapshots) await apply(db, snapshot);
        const current = (await db.meta.get('revisionCursor'))?.value || 0;
        await db.meta.put({ key: 'revisionCursor', value: Math.max(current, page.cursor) });
      },
    );
    more = page.hasMore;
  }
}
