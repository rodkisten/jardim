import { useEffect, useState, useRef } from 'react';
import { Button, Card, CardContent } from '@rodkisten/girassol/react';
import { Database, Download, WifiOff } from 'lucide-react';
import { getFaith } from '../utils/faith-cache';
import { today } from '../utils/faith';

export function OfflineSettings() {
  const [usage, setUsage] = useState<StorageEstimate>({});
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const controller = useRef<AbortController | null>(null);
  async function refresh() {
    try {
      setUsage(await navigator.storage.estimate());
      setPersistent(await navigator.storage.persisted());
    } catch {
      setStatus('Informações de armazenamento indisponíveis.');
    }
  }
  useEffect(() => {
    void refresh();
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      controller.current?.abort();
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  async function persist() {
    try {
      const granted = await navigator.storage.persist();
      setPersistent(granted);
      setStatus(
        granted ? 'Armazenamento persistente concedido.' : 'O navegador não concedeu persistência.',
      );
    } catch {
      setStatus('Persistência não suportada neste navegador.');
    }
  }
  async function prepare() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setProgress(0);
    setStatus('');
    let available = 0;
    try {
      for (let i = 0; i < 7 && !abort.signal.aborted; i++) {
        const day = new Date(today() + 'T12:00:00Z');
        day.setUTCDate(day.getUTCDate() + i);
        try {
          const data = await getFaith(day.toISOString().slice(0, 10), abort.signal);
          if (data.readings.status === 'available') available++;
        } catch {
          /* Continue when a particular day is unavailable. */
        }
        setProgress(i + 1);
      }
      setStatus(
        (abort.signal.aborted ? 'Download interrompido. ' : '') +
          available +
          ' de 7 liturgias disponíveis.',
      );
    } finally {
      controller.current = null;
      setProgress(null);
      void refresh();
    }
  }
  const mb = (value: number | undefined) =>
    value === undefined ? 'Indisponível' : (value / 1048576).toFixed(1) + ' MB';
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="size-5 text-primary" />
          <h2 className="font-semibold">Jardim offline</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {offline ? 'Sem conexão' : 'Conectado'} · Seus dados locais permanecem disponíveis.
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            Usado<p className="font-semibold">{mb(usage.usage)}</p>
          </div>
          <div>
            Cota estimada<p className="font-semibold">{mb(usage.quota)}</p>
          </div>
        </div>
        <p className="text-sm">
          Persistência:{' '}
          {persistent === null ? 'Não verificada' : persistent ? 'Concedida' : 'Não concedida'}
        </p>
        <Button variant="outline" disabled={persistent === true} onClick={() => void persist()}>
          Proteger armazenamento local
        </Button>
        <div className="border-t border-border pt-3 space-y-2">
          <h3 className="flex items-center gap-2 font-medium">
            <WifiOff className="size-4" /> Fé offline
          </h3>
          <p className="text-sm text-muted-foreground">
            Prepare as leituras de hoje e dos próximos seis dias, sem gerar estudos por IA.
          </p>
          {progress === null ? (
            <Button disabled={offline} onClick={() => void prepare()}>
              <Download className="size-4" /> Baixar 7 dias
            </Button>
          ) : (
            <>
              <progress className="w-full" max={7} value={progress} />
              <Button variant="outline" onClick={() => controller.current?.abort()}>
                Cancelar
              </Button>
            </>
          )}
        </div>
        {status && (
          <p role="status" className="text-sm">
            {status}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
