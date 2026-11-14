import { createEffect, createSignal, onCleanup } from 'solid-js';
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
import { Timeline } from './Timeline';
import { DiaryTools } from './DiaryTools';
import { Capsules } from './Capsules';
import { WeatherCard } from './WeatherCard';
import { Integrations } from './Integrations';
import { MediaComposer, type PendingFile } from './MediaComposer';
import { RichEditor } from './RichEditor';
import { synchronizeDiary } from '@rodkisten/jardim-local-db/revisions';
const db = new GardenDB();
const DRAFT_KEY = 'jardim:composer-draft:v1';
function readDraft(): { title: string; body: string; tags: string } {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') as Record<string, unknown>;
    return {
      title: typeof value.title === 'string' ? value.title.slice(0, 160) : '',
      body: typeof value.body === 'string' ? value.body.slice(0, 20000) : '',
      tags: typeof value.tags === 'string' ? value.tags.slice(0, 1000) : '',
    };
  } catch {
    return { title: '', body: '', tags: '' };
  }
}

function App() {
  const restoredDraft = readDraft();
  const [memories, setMemories] = createSignal<Memory[]>([]),
    [pending, setPending] = createSignal(0),
    [status, setStatus] = createSignal('Preparando seu jardim…'),
    [busy, setBusy] = createSignal(false),
    [error, setError] = createSignal(''),
    [editing, setEditing] = createSignal<Memory | null>(null),
    // Draft fields must survive unrelated sync and UI updates in Solid's reactive render.
    [draftTitle, setDraftTitle] = createSignal(restoredDraft.title),
    [draftBody, setDraftBody] = createSignal(restoredDraft.body),
    [draftTags, setDraftTags] = createSignal(restoredDraft.tags),
    [files, setFiles] = createSignal<PendingFile[]>([]),
    [recording, setRecording] = createSignal(false),
    [composerOpen, setComposerOpen] = createSignal(false);
  // Persist text drafts only; binary attachments remain in the local media queue.
  // Editing an existing memory must never overwrite the new-memory draft.
  createEffect(() => {
    if (editing()) return;
    const draft = { title: draftTitle(), body: draftBody(), tags: draftTags() };
    try {
      if (draft.title || draft.body || draft.tags) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Private browsing or exhausted storage must not block writing.
    }
  });
  let composerDialog: HTMLDialogElement | undefined;
  function openComposer() {
    if (composerDialog?.open) return;
    setComposerOpen(true);
    composerDialog?.showModal();
  }
  function startNewMemory() {
    setEditing(null);
    const draft = readDraft();
    setDraftTitle(draft.title);
    setDraftBody(draft.body);
    setDraftTags(draft.tags);
    openComposer();
  }
  function closeComposer() {
    composerDialog?.close();
    setComposerOpen(false);
  }
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
        title:
          String(data.get('title')).trim() ||
          (files().some((file) => file.blob.type.startsWith('video/'))
            ? 'Mensagem de vídeo'
            : files().some((file) => file.blob.type.startsWith('audio/'))
              ? 'Mensagem de voz'
              : 'Uma foto'),
        body: draftBody(),
        tags: String(data.get('tags'))
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (editing()) await db.change(editing()!.id, input);
      else await db.plant(input, files());
      setFiles([]);
      setEditing(null);
      setDraftTitle('');
      setDraftBody('');
      setDraftTags('');
      if (!editing()) {
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* Storage may be disabled. */ }
      }
      form.reset();
      closeComposer();
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
  return (
    <>
      <header>
        <a class="brand" href="/">
          <span class="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>Jardim</span>
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
        <nav class="page-nav" aria-label="Navegação principal">
          <a href="#memorias">Memórias</a>
          <a href="#capsulas">Cápsulas</a>
          <a href="#integracoes">Conexões</a>
        </nav>
        <section class="intro">
          <p class="eyebrow">SEU ARQUIVO PESSOAL</p>
          <h1>
            Sua vida,
            <br />
            <em>em detalhes.</em>
          </h1>
          <p class="lead">O que você vive, ouve e quer lembrar.</p>
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
        <div class="new-memory-bar">
          <p>Uma nota, uma foto, uma mensagem.</p>
          <button class="new-memory" onClick={startNewMemory}>
            + Nova memória
          </button>
        </div>
        <div class="layout">
          <dialog
            class="memory-dialog"
            ref={(element) => {
              composerDialog = element;
            }}
            onClose={() => setComposerOpen(false)}
            onCancel={() => setComposerOpen(false)}
            aria-labelledby="composer-heading"
          >
            <section class="composer">
              <div class="section-title">
                <span>{editing() ? 'EDITAR MEMÓRIA' : 'NOVA MEMÓRIA'}</span>
                <button class="subtle" type="button" onClick={closeComposer}>
                  Fechar editor
                </button>
              </div>
              <h2 id="composer-heading">O que você quer lembrar?</h2>
              <form onSubmit={save}>
                <label for="title">Dê um nome a esse momento</label>
                <input
                  value={draftTitle()}
                  onInput={(event) => setDraftTitle(event.currentTarget.value)}
                  id="title"
                  name="title"
                  placeholder="Um título para lembrar…"
                  required={!files().length}
                  maxlength={160}
                />
                <label for="body">Sua memória</label>
                <RichEditor value={draftBody()} onChange={setDraftBody} disabled={busy()} />
                <label for="tags">
                  Tags <span class="muted">· separadas por vírgula</span>
                </label>
                <input
                  value={draftTags()}
                  onInput={(event) => setDraftTags(event.currentTarget.value)}
                  id="tags"
                  name="tags"
                  placeholder="vida, descobertas, gratidão"
                />
                {!editing() ? (
                  <MediaComposer
                    active={composerOpen()}
                    files={files()}
                    onChange={setFiles}
                    onRecordingChange={setRecording}
                  />
                ) : null}
                <button class="primary" disabled={busy() || recording()}>
                  {busy() ? 'Guardando…' : editing() ? 'Salvar edição' : 'Salvar memória'}{' '}
                  <span aria-hidden="true">↗</span>
                </button>
                {editing() ? (
                  <button
                    type="button"
                    class="subtle"
                    onClick={() => {
                      setEditing(null);
                      setDraftTitle('');
                      setDraftBody('');
                      setDraftTags('');
                    }}
                  >
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
          </dialog>
          <Timeline
            memories={memories()}
            db={db}
            onEdit={(memory) => {
              setEditing(memory);
              openComposer();
              setDraftTitle(memory.title);
              setDraftBody(memory.body);
              setDraftTags(memory.tags.join(', '));
              document.getElementById('title')?.focus();
            }}
            onDelete={(memory) =>
              void db
                .change(memory.id, null)
                .then(() => sync())
                .catch(() => setError('Não foi possível mover para a lixeira.'))
            }
            onChanged={() => void sync()}
          />
        </div>
        <Integrations db={db} memories={memories()} onChanged={() => void sync()} />
        <Capsules db={db} memories={memories()} onChanged={() => void sync()} />
        <DiaryTools db={db} onChanged={() => void sync()} />
        <Devices />
        <details class="composer">
          <summary>Girassol · componentes</summary>
          <Card label="Galeria Girassol">
            <Badge>Design system</Badge>
            <h2>Cores, formas e interação.</h2>
            <label for="girassol-example">Campo de exemplo</label>
            <Input id="girassol-example" placeholder="Seu próximo momento" />
            <Button onClick={() => setStatus('Girassol · componentes Solid 2 ativos')}>
              Experimentar botão
            </Button>
          </Card>
        </details>
        <footer>
          JARDIM <span>Seu arquivo. Seu tempo.</span>
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
