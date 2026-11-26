import { isPreview } from '../utils/preview';
import { useEffect, useState, useCallback } from 'react';
import { liveQuery } from 'dexie';
import { synchronizeDiary } from '@rodkisten/jardim-local-db/revisions';
import { fetchProtocol } from '@rodkisten/jardim-local-db/transport';
import { RetryBackoff } from '@rodkisten/jardim-local-db/retry';
import { db } from '../utils/db';
export function useSync() {
  const [status, setStatus] = useState('Preparando sincronização…'),
    [pending, setPending] = useState(0),
    [conflicts, setConflicts] = useState(0),
    [busy, setBusy] = useState(false);
  const [request, setRequest] = useState<((manual?: boolean) => void) | null>(null);
  useEffect(() => {
    if (isPreview) {
      setStatus('Preview · armazenamento local');
      return;
    }
    let disposed = false,
      running = false,
      queued = false,
      manualQueued = false;
    const retry = new RetryBackoff();
    const count = async () => ({
      pending:
        (await db.outbox.count()) +
        (await db.mutations.count()) +
        (await db.attachments.where('uploaded').equals(0).count()) +
        (await db.capsules.where('uploaded').equals(0).count()),
      conflicts: await db.conflicts.count(),
    });
    async function sync(manual = false) {
      if (disposed) return;
      if (running) {
        queued = true;
        manualQueued ||= manual;
        return;
      }
      if (!navigator.onLine) {
        setStatus('Offline · memórias neste dispositivo');
        return;
      }
      if (!manual && !retry.ready()) return;
      running = true;
      setBusy(true);
      setStatus('Sincronizando…');
      try {
        await synchronizeDiary(db, fetchProtocol);
        retry.success();
        const result = await count();
        if (!disposed)
          setStatus(
            result.conflicts
              ? 'Conflitos para revisar'
              : result.pending
                ? 'Alterações aguardando envio'
                : 'Tudo sincronizado',
          );
      } catch (error) {
        retry.fail();
        if (!disposed) setStatus(error instanceof Error ? error.message : 'Falha na sincronização');
      } finally {
        running = false;
        if (!disposed) {
          setBusy(false);
          if (queued) {
            const next = manualQueued;
            queued = false;
            manualQueued = false;
            queueMicrotask(() => void sync(next));
          }
        }
      }
    }
    setRequest(() => sync);
    let previous = -1;
    const sub = liveQuery(count).subscribe({
      next: (result) => {
        if (disposed) return;
        setPending(result.pending);
        setConflicts(result.conflicts);
        if (result.pending > 0 && result.pending !== previous) void sync();
        previous = result.pending;
      },
      error: () => {
        if (!disposed) setStatus('Não foi possível ler a fila local.');
      },
    });
    const online = () => void sync(true),
      offline = () => setStatus('Offline · memórias neste dispositivo'),
      visible = () => {
        if (document.visibilityState === 'visible') void sync();
      };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', visible);
    const timer = window.setInterval(() => void sync(), 30000);
    void sync();
    return () => {
      disposed = true;
      sub.unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  const syncNow = useCallback(() => request?.(true), [request]);
  return { status, pending, conflicts, busy, syncNow };
}
