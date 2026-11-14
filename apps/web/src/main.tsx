import { createSignal, onCleanup } from 'solid-js';
import { render } from '@solidjs/web';
import { liveQuery } from 'dexie';
import { GardenDB } from '@rodkisten/jardim-local-db';
import type { Memory } from '@rodkisten/jardim-contracts';
import { fetchProtocol } from '@rodkisten/jardim-local-db/transport';
import { RetryBackoff } from '@rodkisten/jardim-local-db/retry';
import '@rodkisten/girassol/tokens.css';
import { Button, Input, Card, Badge } from '@rodkisten/girassol';
import './style.css';
import { Devices } from './Devices';
import { ThemeSwitch } from './ThemeSwitch';
import { MemoryCard } from './MemoryCard';
import { DiaryTools } from './DiaryTools';
import { Capsules } from './Capsules';
import { WeatherCard } from './WeatherCard';
import { Integrations } from './Integrations';
import { MediaComposer, type PendingFile } from './MediaComposer';
import { synchronizeDiary } from '@rodkisten/jardim-local-db/revisions';
const db = new GardenDB();
function App() {
  const [memories, setMemories] = createSignal<Memory[]>([]),
    [pending, setPending] = createSignal(0),
    [status, setStatus] = createSignal('Preparando seu jardim…'),
    [query, setQuery] = createSignal(''),
    [busy, setBusy] = createSignal(false),
    [error, setError] = createSignal(''),
    [editing, setEditing] = createSignal<Memory | null>(null),
    [day, setDay] = createSignal(''),
    [source, setSource] = createSignal('all'),
    [files, setFiles] = createSignal<PendingFile[]>([]),
    [recording, setRecording] = createSignal(false);
  let syncing = false,
    resyncRequested = false,
    resyncManual = false;
  const retry = new RetryBackoff();
  async function sync(manual = false) {
    // A save during the pull phase needs another exchange; coalescing must not lose that new intent.
    if (syncing) {
      resyncRequested = true;
      resyncManual ||= manual;
      return;
    }
    if (!manual && !retry.ready()) return;
    syncing = true;
    try {
      if (!navigator.onLine) {
        setStatus('Offline · suas memórias ficam neste dispositivo');
        return;
      }
      setStatus('Sincronizando…');
      await synchronizeDiary(db, fetchProtocol);
      retry.success();
      const conflicts = await db.conflicts.count();
      setStatus(
        conflicts
          ? `${conflicts} conflito(s) para revisar`
          : (await db.outbox.count()) +
              (await db.mutations.count()) +
              (await db.attachments.where('uploaded').equals(0).count()) +
              (await db.capsules.where('uploaded').equals(0).count())
            ? 'Há alterações aguardando envio'
            : 'Tudo sincronizado',
      );
    } catch (e) {
      retry.fail();
      setStatus(e instanceof Error ? e.message : 'Falha na sincronização');
    } finally {
      syncing = false;
      if (resyncRequested) {
        const immediate = resyncManual;
        resyncRequested = false;
        resyncManual = false;
        // Automatic follow-ups still respect failure backoff; only an explicit retry bypasses it.
        queueMicrotask(() => void sync(immediate));
      }
    }
  }
  {
    const sub = liveQuery(async () => ({
      memories: await db.memories.orderBy('createdAt').reverse().toArray(),
      pending:
        (await db.outbox.count()) +
        (await db.mutations.count()) +
        (await db.attachments.where('uploaded').equals(0).count()) +
        (await db.capsules.where('uploaded').equals(0).count()),
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
      const input = {
        title: String(data.get('title')),
        body: String(data.get('body')),
        tags: String(data.get('tags'))
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (editing()) await db.change(editing()!.id, input);
      else await db.plant(input, files());
      setFiles([]);
      setEditing(null);
      form.reset();
      void sync();
    } catch {
      setError(
        'Não foi possível guardar. Confira título, texto, até 12 tags e até 5 anexos de 12 MiB.',
      );
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
    memories().filter(
      (m) =>
        (!day() || new Date(m.createdAt).toLocaleDateString('en-CA') === day()) &&
        (source() === 'all' ||
          (source() === 'youtube' ? m.tags.includes('youtube') : !m.tags.includes('youtube'))) &&
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
          <ThemeSwitch />
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
            <button class="subtle" onClick={() => void sync(true)}>
              Atualizar
            </button>
          </div>
        </section>
        <WeatherCard db={db} memories={memories()} onChanged={() => void sync()} />
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
                value={editing()?.title || ''}
                id="title"
                name="title"
                placeholder="Uma coisa boa de hoje…"
                required
                maxlength={160}
              />
              <label for="body">Sua memória</label>
              <textarea
                value={editing()?.body || ''}
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
              <input
                value={editing()?.tags.join(', ') || ''}
                id="tags"
                name="tags"
                placeholder="vida, descobertas, gratidão"
              />
              {!editing() ? (
                <MediaComposer
                  files={files()}
                  onChange={setFiles}
                  onRecordingChange={setRecording}
                />
              ) : null}
              <button class="primary" disabled={busy() || recording()}>
                {busy() ? 'Guardando…' : editing() ? 'Salvar edição' : 'Plantar uma memória'}{' '}
                <span aria-hidden="true">↗</span>
              </button>
              {editing() ? (
                <button type="button" class="subtle" onClick={() => setEditing(null)}>
                  Cancelar edição
                </button>
              ) : null}
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
            <div class="filters">
              <label>
                Dia
                <input type="date" value={day()} onInput={(e) => setDay(e.currentTarget.value)} />
              </label>
              <label>
                Fonte
                <select value={source()} onChange={(e) => setSource(e.currentTarget.value)}>
                  <option value="all">Todas</option>
                  <option value="diary">Diário</option>
                  <option value="youtube">YouTube</option>
                </select>
              </label>
              <button
                class="subtle"
                onClick={() => {
                  setDay('');
                  setSource('all');
                  setQuery('');
                }}
              >
                Limpar filtros
              </button>
            </div>
            <div class="entries">
              {filtered().length ? (
                filtered().map((memory) => (
                  <MemoryCard
                    memory={memory}
                    onEdit={() => {
                      setEditing(memory);
                      document.getElementById('title')?.focus();
                    }}
                    onDelete={() =>
                      void db
                        .change(memory.id, null)
                        .then(() => sync())
                        .catch(() => setError('Não foi possível mover para a lixeira.'))
                    }
                    db={db}
                    onChanged={() => void sync()}
                  />
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
        <Integrations db={db} memories={memories()} onChanged={() => void sync()} />
        <Capsules db={db} memories={memories()} onChanged={() => void sync()} />
        <DiaryTools db={db} onChanged={() => void sync()} />
        <Devices />
        <details class="composer">
          <summary>🌻 Girassol · componentes</summary>
          <Card label="Galeria Girassol">
            <Badge>Design system</Badge>
            <h2>Pequenos detalhes, boas raízes.</h2>
            <label for="girassol-example">Campo de exemplo</label>
            <Input id="girassol-example" placeholder="Seu próximo momento" />
            <Button onClick={() => setStatus('Girassol · componentes Solid 2 ativos')}>
              Experimentar botão
            </Button>
          </Card>
        </details>
        <footer>
          JARDIM <span>Feito para lembrar de viver.</span> 🌱
        </footer>
      </main>
    </>
  );
}
render(() => <App />, document.getElementById('root')!);

// Cache only the application shell after authenticated load; API data remains in IndexedDB.
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js').catch(() => {
    console.info('O acesso offline completo será preparado na próxima conexão.');
  });
}
