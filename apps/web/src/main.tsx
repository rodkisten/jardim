import { createSignal, onCleanup } from 'solid-js';
import { render } from '@solidjs/web';
import { liveQuery } from 'dexie';
import { GardenDB, synchronize } from '../../../packages/local-db/src/index';
import type { Memory } from '../../../packages/contracts/src/index';
import './style.css';
const db = new GardenDB();
function App() {
  const [memories, setMemories] = createSignal<Memory[]>([]),
    [pending, setPending] = createSignal(0),
    [status, setStatus] = createSignal('Preparando seu jardim…'),
    [query, setQuery] = createSignal(''),
    [busy, setBusy] = createSignal(false),
    [error, setError] = createSignal('');
  let syncing = false;
  async function sync() {
    if (syncing) return;
    syncing = true;
    try {
      if (!navigator.onLine) {
        setStatus('Offline · suas memórias ficam neste dispositivo');
        return;
      }
      setStatus('Sincronizando…');
      await synchronize(db);
      setStatus((await db.outbox.count()) ? 'Há memórias aguardando envio' : 'Tudo sincronizado');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Falha na sincronização');
    } finally {
      syncing = false;
    }
  }
  {
    const sub = liveQuery(async () => ({
      memories: await db.memories.orderBy('createdAt').reverse().toArray(),
      pending: await db.outbox.count(),
    })).subscribe({
      next: (data) => {
        setMemories(data.memories);
        setPending(data.pending);
      },
      error: () =>
        setError(
          'Não foi possível acessar o armazenamento local. Verifique as permissões do navegador.',
        ),
    });
    void sync();
    const online = () => void sync();
    const visible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visible);
    const timer = setInterval(() => void sync(), 30000);
    onCleanup(() => {
      sub.unsubscribe();
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', visible);
      clearInterval(timer);
    });
  }
  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (busy()) return;
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    setBusy(true);
    setError('');
    try {
      await db.plant({
        title: String(data.get('title')),
        body: String(data.get('body')),
        tags: String(data.get('tags'))
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      form.reset();
      void sync();
    } catch {
      setError('Não foi possível guardar. Use título, texto e até 12 tags de 40 caracteres.');
    } finally {
      setBusy(false);
    }
  }
  async function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            memories: await db.memories.toArray(),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jardim-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const filtered = () =>
    memories().filter((m) =>
      `${m.title} ${m.body} ${m.tags.join(' ')}`
        .toLocaleLowerCase('pt-BR')
        .includes(query().toLocaleLowerCase('pt-BR')),
    );
  return (
    <>
      <header>
        <a class="brand" href="/">
          ✳ <span>Jardim</span>
        </a>
        <div class="actions">
          <button class="subtle" onClick={() => void exportData()}>
            Exportar
          </button>
          <form method="post" action="/auth/logout">
            <button class="subtle">Sair</button>
          </form>
        </div>
      </header>
      <main>
        <section class="intro">
          <p class="eyebrow">SEU JARDIM PESSOAL</p>
          <h1>
            A vida acontece.
            <br />
            <em>Guarde o que floresce.</em>
          </h1>
          <p class="lead">
            Pequenas descobertas, dias especiais e pensamentos
            <br class="desktop" /> que merecem ficar. Tudo tem lugar aqui.
          </p>
          <div class="sync" role="status">
            <span class="dot" />
            {status()}
            {pending() > 0 ? ` · ${pending()} pendente(s)` : ''}
            <button class="subtle" onClick={() => void sync()}>
              Atualizar
            </button>
          </div>
        </section>
        <div class="layout">
          <section class="composer">
            <div class="section-title">
              <span>01 / CULTIVAR</span>
              <span>✺</span>
            </div>
            <h2>O que você quer lembrar?</h2>
            <form onSubmit={save}>
              <label for="title">Dê um nome a esse momento</label>
              <input
                id="title"
                name="title"
                placeholder="Uma coisa boa de hoje…"
                required
                maxlength={160}
              />
              <label for="body">Sua memória</label>
              <textarea
                id="body"
                name="body"
                placeholder="Escreva sem pressa."
                rows={6}
                required
                maxlength={20000}
              />
              <label for="tags">
                Tags <span class="muted">· separadas por vírgula</span>
              </label>
              <input id="tags" name="tags" placeholder="vida, descobertas, gratidão" />
              <button class="primary" disabled={busy()}>
                {busy() ? 'Guardando…' : 'Plantar uma memória'} <span>↗</span>
              </button>
              <p class="footnote">
                Salva primeiro neste dispositivo. Sincronizada quando houver conexão.
              </p>
            </form>
            {error() ? (
              <p role="alert" class="error">
                {error()}
              </p>
            ) : null}
          </section>
          <section class="timeline">
            <div class="section-title">
              <span>02 / FLORESCER</span>
              <span>{memories().length} MEMÓRIAS</span>
            </div>
            <h2>O que já criou raízes</h2>
            <label class="sr-only" for="search">
              Buscar memórias
            </label>
            <input
              id="search"
              type="search"
              placeholder="Buscar no seu jardim…"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
            <div class="entries">
              {filtered().length ? (
                filtered().map((memory) => (
                  <article class="memory">
                    <time datetime={memory.createdAt}>
                      {new Intl.DateTimeFormat('pt-BR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }).format(new Date(memory.createdAt))}
                    </time>
                    <h3>{memory.title}</h3>
                    <p>{memory.body}</p>
                    <div class="tags">
                      {memory.tags.map((tag) => (
                        <span>#{tag}</span>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <div class="empty">
                  <span aria-hidden="true">☘</span>
                  <h3>
                    {query()
                      ? 'Ainda não encontramos por aqui.'
                      : 'Todo jardim começa com uma semente.'}
                  </h3>
                  <p>
                    {query()
                      ? 'Experimente outra palavra.'
                      : 'Sua primeira memória pode ser um pensamento, uma descoberta ou só um pedacinho do dia.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
        <footer>
          JARDIM <span>Feito para lembrar de viver.</span> 🌱
        </footer>
      </main>
    </>
  );
}
render(() => <App />, document.getElementById('root')!);
