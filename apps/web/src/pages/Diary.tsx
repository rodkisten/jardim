import { SurfacePanels } from '../components/SurfacePanels';
import { inlineMediaIds } from '../utils/inline-media';
import { MediaContext } from '../components/MediaNode';
import { prepareImages, optimizeImage, type CompressionResult } from '../utils/image-compression';
import { defaultImageOptions } from '../utils/image-options';
import { CompressionPanel } from '../components/CompressionPanel';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Input } from '@rodkisten/girassol/react';
import { PublicationNotes } from '../components/PublicationNotes';
import { combineNotes, newNote } from '../utils/notes';
import { db } from '../utils/db';
import { DRAFT_KEY } from '../utils/draft';
import {
  loadComposer,
  saveComposer,
  clearComposer,
  appendAttachments,
  replaceAttachment,
  type ComposerSnapshot,
} from '../utils/composer-store';
import { setUpdateBlocker, hasMarkdownBlockers } from '../utils/update-guard';
import { Memory, mediaTypes } from '@rodkisten/jardim-contracts';
import { ComposerMedia } from '../components/ComposerMedia';
import { LinkPreviews } from '../components/LinkPreviews';
export function Diary() {
  const [options, setOptions] = useState(defaultImageOptions),
    [results, setResults] = useState<CompressionResult[]>([]),
    [progress, setProgress] = useState(''),
    [processing, setProcessing] = useState(false);
  const [snapshot, setSnapshot] = useState<ComposerSnapshot | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [storageError, setStorageError] = useState(false),
    [pending, setPending] = useState(false);
  const compressionLock = useRef(false);
  const current = useRef<ComposerSnapshot | null>(null),
    queue = useRef<Promise<unknown>>(Promise.resolve());
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    loadComposer()
      .then((value) => {
        if (active) {
          const restored = {
            ...value,
            attachments: value.attachments.map((a) => ({ ...a, id: a.id ?? crypto.randomUUID() })),
            notes: value.notes?.length
              ? value.notes
              : [{ ...newNote(), body: value.draft.body, document: value.draft.document }],
          };
          current.current = restored;
          setSnapshot(restored);
        }
      })
      .catch(() => {
        if (active) setError('Não foi possível recuperar o rascunho.');
      });
    return () => {
      active = false;
    };
  }, []);
  function change(value: ComposerSnapshot) {
    current.current = value;
    setSnapshot(value);
    setPending(true);
    setUpdateBlocker('composer', true);
    const write = queue.current.catch(() => undefined).then(() => saveComposer(value));
    queue.current = write;
    void write
      .then(() => {
        if (current.current === value) {
          setPending(false);
          setStorageError(false);
          setUpdateBlocker('composer', false);
        }
      })
      .catch(() => {
        if (current.current === value) {
          setPending(false);
          setStorageError(true);
        }
      });
  }
  async function importFiles(files: File[]) {
    if (compressionLock.current || busy) return;
    compressionLock.current = true;
    setProcessing(true);
    setUpdateBlocker('image-compression', true);
    try {
      const optimized = await prepareImages(files, options, (done, total) =>
        setProgress('Processando ' + done + ' de ' + total),
      );
      setResults(optimized);
      const failures = optimized.filter((r) => r.status === 'fallback');
      const latest = current.current;
      if (latest) {
        const attachments = appendAttachments(
          latest.attachments,
          optimized.map((r) => r.file),
          mediaTypes,
        ).map((a) => {
          if (latest.attachments.some((old) => old.id === a.id)) return a;
          const result = optimized.find(
            (r) =>
              r.file.name === a.name &&
              r.file.size === a.blob.size &&
              r.file.lastModified === a.lastModified,
          );
          return result && result.original.size <= 24 * 1024 * 1024
            ? { ...a, original: result.original, originalName: result.original.name }
            : a;
        });
        change({ ...latest, attachments });
      }
      setError(
        failures.length ? failures.map((r) => r.original.name + ': ' + r.reason).join('; ') : '',
      );
    } catch (err) {
      setError(String(err));
    } finally {
      compressionLock.current = false;
      setProgress('');
      setProcessing(false);
      setUpdateBlocker('image-compression', false);
    }
  }
  async function recompress(id: string) {
    if (compressionLock.current || busy) return;
    const attachment = current.current?.attachments.find((a) => a.id === id);
    if (!attachment) return;
    compressionLock.current = true;
    setProcessing(true);
    setUpdateBlocker('image-compression', true);
    setProgress('Recomprimindo…');
    try {
      const source = new File(
        [attachment.original ?? attachment.blob],
        attachment.originalName ?? attachment.name,
        {
          type: (attachment.original ?? attachment.blob).type,
          lastModified: attachment.lastModified,
        },
      );
      const result = await optimizeImage(source, options);
      setResults([result]);
      if (result.status === 'fallback') {
        setError(result.reason);
        return;
      }
      const latest = current.current;
      if (latest?.attachments.some((a) => a.id === id))
        change({
          ...latest,
          attachments: replaceAttachment(latest.attachments, id, result.file, mediaTypes),
        });
      setError('');
    } catch (e) {
      setError(String(e));
    } finally {
      compressionLock.current = false;
      setProcessing(false);
      setProgress('');
      setUpdateBlocker('image-compression', false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasMarkdownBlockers()) {
      setError('Corrija o Markdown antes de publicar.');
      return;
    }
    if (busy || compressionLock.current || !current.current) return;
    setBusy(true);
    setUpdateBlocker('composer-submit', true);
    setError('');
    const value = current.current;
    try {
      await queue.current;
      const draft = value.notes ? combineNotes(value.draft, value.notes) : value.draft;
      const ids = inlineMediaIds(draft.document);
      if ([...ids].some((id) => !value.attachments.some((a) => a.id === id)))
        throw Error('Existe um bloco com anexo indisponível.');
      const input = {
        title: draft.title,
        body: draft.body || (value.attachments.length ? 'Memória multimídia' : ''),
        tags: [
          ...new Set(
            draft.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
          ),
        ],
        richDocument: draft.document ?? undefined,
      };
      Memory.parse({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
      await db.plant(
        input,
        value.attachments.map(({ blob, name, id }) => ({ blob, name, id })),
      );
      await clearComposer();
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* Legacy draft cleanup is best effort. */
      }
      setUpdateBlocker('composer', false);
      await navigate({ to: '/timeline' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
      setUpdateBlocker('composer-submit', false);
    }
  }
  if (!snapshot) return <p role="status">{error || 'Recuperando rascunho…'}</p>;
  const { draft, attachments } = snapshot;
  return (
    <form
      className="space-y-4"
      onSubmit={submit}
      onPaste={(e) => {
        const files = Array.from(e.clipboardData.files);
        if (files.length) {
          e.preventDefault();
          void importFiles(files);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
      }}
      onDrop={(e) => {
        const files = Array.from(e.dataTransfer.files);
        if (files.length) {
          e.preventDefault();
          void importFiles(files);
        }
      }}
    >
      <h1 className="text-2xl font-semibold">Nova memória</h1>
      <p role="status" className="text-xs text-muted-foreground">
        {storageError
          ? 'Rascunho não persistido'
          : pending
            ? 'Salvando rascunho…'
            : 'Rascunho disponível offline'}
      </p>
      <fieldset disabled={busy} className="space-y-4">
        <SurfacePanels
          surface="diary"
          labels={{
            title: 'Título',
            notes: 'Editor de notas',
            tags: 'Tags',
            previews: 'Links',
            compression: 'Compressão',
            attachments: 'Anexos',
          }}
          panels={{
            title: (
              <label className="block space-y-1 text-sm">
                Título
                <Input
                  required
                  maxLength={160}
                  value={draft.title}
                  onChange={(e) =>
                    change({ ...snapshot, draft: { ...draft, title: e.target.value } })
                  }
                />
              </label>
            ),
            notes: (
              <MediaContext.Provider value={attachments}>
                <PublicationNotes
                  notes={snapshot.notes ?? []}
                  onChange={(notes) => {
                    const latest = current.current;
                    if (latest)
                      change({ ...latest, notes, draft: combineNotes(latest.draft, notes) });
                  }}
                />
              </MediaContext.Provider>
            ),
            tags: (
              <label className="block space-y-1 text-sm">
                Tags
                <Input
                  value={draft.tags}
                  onChange={(e) =>
                    change({ ...snapshot, draft: { ...draft, tags: e.target.value } })
                  }
                />
              </label>
            ),
            previews: <LinkPreviews text={draft.body} />,
            compression: (
              <div>
                <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  Cole ou arraste arquivos para adicionar à publicação.
                </p>
                <CompressionPanel
                  options={options}
                  onChange={setOptions}
                  results={results}
                  progress={progress}
                  onClear={() => setResults([])}
                  attachments={attachments}
                  processing={processing}
                  onRecompress={recompress}
                />
              </div>
            ),
            attachments: (
              <ComposerMedia
                attachments={attachments}
                onError={setError}
                onFiles={importFiles}
                onRemove={(i) => {
                  const latest = current.current;
                  if (latest) {
                    const id = latest.attachments[i]?.id;
                    if (id && inlineMediaIds(latest.draft.document).has(id)) {
                      setError('Remova primeiro os blocos que utilizam este anexo.');
                      return;
                    }
                    change({
                      ...latest,
                      attachments: latest.attachments.filter((_, j) => j !== i),
                    });
                  }
                }}
              />
            ),
          }}
        />
      </fieldset>
      {storageError && (
        <Button type="button" variant="outline" onClick={() => change(snapshot)}>
          Tentar salvar rascunho novamente
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || storageError || processing} className="w-full">
        {busy ? 'Salvando…' : 'Plantar memória'}
      </Button>
    </form>
  );
}
