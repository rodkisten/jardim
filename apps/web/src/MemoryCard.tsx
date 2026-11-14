import { memorySource, sources } from './timeline';
import { Attachment } from './Attachment';
import { RichMemory } from './RichMemory';
import { createSignal } from 'solid-js';
import { z, Snapshot } from '@rodkisten/jardim-contracts';
import type { GardenDB } from '@rodkisten/jardim-local-db';
import { fetchProtocol } from '@rodkisten/jardim-local-db/transport';
import type { Memory } from '@rodkisten/jardim-contracts';
import styles from './MemoryCard.module.css';
export function MemoryCard(props: {
  memory: Memory;
  onEdit?: () => void;
  onDelete?: () => void;
  db?: GardenDB;
  onChanged?: () => void;
}) {
  const [history, setHistory] = createSignal<Snapshot[] | null>(null),
    [error, setError] = createSignal('');
  async function loadHistory() {
    try {
      const response = await fetchProtocol(`/v2/memories/${props.memory.id}/revisions`);
      if (!response.ok) throw Error('Histórico indisponível. Conecte-se e sincronize.');
      setHistory(
        z.object({ snapshots: z.array(Snapshot).max(50) }).parse(await response.json()).snapshots,
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao receber histórico.');
    }
  }
  async function restore(snapshot: Snapshot) {
    try {
      await props.db?.revive(props.memory.id, snapshot.memory);
      setHistory(null);
      props.onChanged?.();
    } catch {
      setError('Não foi possível restaurar a revisão.');
    }
  }
  const video = () =>
    props.memory.tags.includes('youtube')
      ? props.memory.body.match(
          /https:\/\/www\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}(?=\s|$)/,
        )?.[0]
      : undefined;
  return (
    <article class="memory" data-source={memorySource(props.memory)}>
      <div class="memory-topline">
        <span class="source-badge">{sources[memorySource(props.memory)]}</span>
        <time datetime={props.memory.createdAt}>
          {new Intl.DateTimeFormat('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(new Date(props.memory.createdAt))}
        </time>
      </div>
      <h3>{props.memory.title}</h3>
      <RichMemory memory={props.memory} />
      {Array.from(
        new Set(
          Array.from(props.memory.body.matchAll(/\[anexo:([a-f0-9-]{36})\]/g), (match) => match[1]),
        ),
      ).map((id) => (
        <Attachment id={id} db={props.db} />
      ))}
      {video() ? (
        <a class={styles.source} href={video()} target="_blank" rel="noreferrer">
          ▶ Abrir no YouTube
        </a>
      ) : null}
      <div class="actions">
        {props.onEdit ? (
          <button class="subtle" onClick={() => props.onEdit?.()}>
            Editar
          </button>
        ) : null}
        {props.onDelete ? (
          <button class="subtle" onClick={() => props.onDelete?.()}>
            Mover para a lixeira
          </button>
        ) : null}
        <button class="subtle" onClick={() => void loadHistory()}>
          Revisões
        </button>
      </div>
      {error() ? <p role="alert">{error()}</p> : null}
      {history() ? (
        <section aria-label="Histórico da memória">
          <button class="subtle" onClick={() => setHistory(null)}>
            Fechar histórico
          </button>
          {history()!.map((snapshot) => (
            <details>
              <summary>
                Revisão {snapshot.revision} ·{' '}
                {snapshot.deletedAt ? 'Na lixeira' : snapshot.memory.title}
              </summary>
              <p>{snapshot.memory.body}</p>
              <button onClick={() => void restore(snapshot)}>Restaurar esta revisão</button>
            </details>
          ))}
        </section>
      ) : null}
      <div class="tags">
        {props.memory.tags.map((tag) => (
          <span>#{tag}</span>
        ))}
      </div>
    </article>
  );
}
