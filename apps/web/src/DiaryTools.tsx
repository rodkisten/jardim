import { createSignal, onCleanup } from 'solid-js';
import { liveQuery } from 'dexie';
import type { GardenDB } from '@rodkisten/jardim-local-db';
import type { Mutation, Snapshot } from '@rodkisten/jardim-contracts';
export function DiaryTools(props: { db: GardenDB; onChanged: () => void }) {
  const [conflicts, setConflicts] = createSignal<
    { memoryId: string; operation: Mutation; remote: Snapshot }[]
  >([]);
  const [trash, setTrash] = createSignal<Snapshot[]>([]);
  const [message, setMessage] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const sub = liveQuery(async () => ({
    conflicts: await props.db.conflicts.toArray(),
    trash: (await props.db.versions.toArray()).filter((snapshot) => snapshot.deletedAt),
  })).subscribe({
    next: (value) => {
      setConflicts(value.conflicts);
      setTrash(value.trash);
    },
    error: () => setMessage('Não foi possível ler os registros locais.'),
  });
  onCleanup(() => sub.unsubscribe());
  async function importFile(event: Event) {
    if (busy()) return;
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 32 * 1024 * 1024) {
      setMessage('O backup deve ter no máximo 32 MiB.');
      input.value = '';
      return;
    }
    setBusy(true);
    try {
      const result = await props.db.restore(JSON.parse(await file.text()));
      setMessage(
        `${result.added} memória(s) importada(s); ${result.skipped} já existente(s) preservada(s).`,
      );
      props.onChanged();
    } catch {
      setMessage('Backup inválido. Nenhuma memória foi importada.');
    } finally {
      setBusy(false);
      input.value = '';
    }
  }
  async function resolve(id: string, choice: 'local' | 'remote') {
    try {
      await props.db.resolve(id, choice);
      props.onChanged();
    } catch {
      setMessage('Não foi possível resolver. As duas versões continuam salvas.');
    }
  }
  async function revive(id: string) {
    try {
      await props.db.revive(id);
      props.onChanged();
    } catch {
      setMessage('Não foi possível restaurar agora.');
    }
  }
  return (
    <section class="diary-tools">
      {conflicts().length ? (
        <section aria-label="Conflitos de sincronização">
          <h2>Vamos escolher o que fica?</h2>
          <p>As duas versões foram preservadas. Escolha uma para continuar a sincronização.</p>
          {conflicts().map((conflict) => (
            <article class="memory">
              <h3>{conflict.operation.memory.title}</h3>
              <h4>
                Neste dispositivo ·{' '}
                {conflict.operation.kind === 'delete' ? 'mover para a lixeira' : 'sua edição'}
              </h4>
              <p>{conflict.operation.memory.body}</p>
              <h4>
                No outro dispositivo · revisão {conflict.remote.revision}
                {conflict.remote.deletedAt ? ' · na lixeira' : ''}
              </h4>
              <p>{conflict.remote.memory.title}</p>
              <p>{conflict.remote.memory.body}</p>
              <button onClick={() => void resolve(conflict.memoryId, 'local')}>
                Manter minha alteração
              </button>
              <button onClick={() => void resolve(conflict.memoryId, 'remote')}>
                Usar versão sincronizada
              </button>
            </article>
          ))}
        </section>
      ) : null}
      <details class="composer">
        <summary>Lixeira e restauração</summary>
        <p>
          Memórias na lixeira e suas revisões ficam preservadas para permitir recuperação e
          sincronização entre dispositivos.
        </p>
        {trash().length ? (
          trash().map((snapshot) => (
            <article class="memory">
              <h3>{snapshot.memory.title}</h3>
              <button onClick={() => void revive(snapshot.memory.id)}>Restaurar memória</button>
            </article>
          ))
        ) : (
          <p>A lixeira está vazia.</p>
        )}
      </details>
      <details class="composer">
        <summary>Importar backup</summary>
        <p>
          Importe o JSON exportado pelo Jardim. IDs são preservados; memórias existentes não são
          sobrescritas. Diferenças encontradas em outro dispositivo aparecem como conflitos.
        </p>
        <p>
          A exportação inclui as memórias presentes neste dispositivo; lixeira, histórico de
          revisões e anexos não fazem parte deste formato.
        </p>
        <label for="backup-file">Selecionar backup JSON</label>
        <input
          id="backup-file"
          type="file"
          accept="application/json,.json"
          disabled={busy()}
          onChange={(e) => void importFile(e)}
        />
      </details>
      {message() ? <p role="status">{message()}</p> : null}
    </section>
  );
}
