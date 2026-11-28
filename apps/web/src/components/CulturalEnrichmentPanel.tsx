import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Card, CardContent } from '@rodkisten/girassol/react';
import { culturalRegistry as db } from '../utils/cultural-registry';
import { enrichNext } from '../utils/cultural-enrichment';
import { openLibraryProvider } from '../utils/cultural-providers';

import { spotifyProvider, musicBrainzProvider } from '../utils/music-providers';

export function CulturalEnrichmentPanel() {
  const jobs = useLiveQuery(() => db.enrichment.toArray(), []);
  const [allowed, setAllowed] = useState(false);
  const [spotify, setSpotify] = useState(false);
  const [musicBrainz, setMusicBrainz] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function start() {
    if (!(allowed || spotify || musicBrainz) || controller.current) return;
    const task = new AbortController();
    controller.current = task;
    setRunning(true);
    setError('');
    try {
      while (!task.signal.aborted && await enrichNext([...(allowed ? [openLibraryProvider] : []), ...(spotify ? [spotifyProvider] : []), ...(musicBrainz ? [musicBrainzProvider] : [])], task.signal)) {
        await new Promise<void>(resolve => setTimeout(resolve, 1100));
      }
    } catch {
      if (!task.signal.aborted) setError('Não foi possível processar a fila.');
    } finally {
      controller.current = null;
      setRunning(false);
    }
  }
  async function retry() {
    try {
      await db.enrichment.where('[status+nextAttemptAt]').between(['failed', 0], ['failed', Number.MAX_SAFE_INTEGER], true, true)
        .modify({ status: 'pending', attempts: 0, nextAttemptAt: Date.now() });
    } catch { setError('Não foi possível reagendar as tarefas.'); }
  }
  return (
    <Card><CardContent className="space-y-3">
      <h2 className="font-semibold">Metadados culturais</h2>
      <p className="text-xs text-muted-foreground">A fila é local. Consultas externas enviam apenas identificadores culturais, não o texto das notas.</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={allowed} onChange={event => { setAllowed(event.target.checked); if (!event.target.checked) controller.current?.abort(); }} />
        Permitir consultas ao Open Library nesta sessão
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={spotify} disabled={running} onChange={event => setSpotify(event.target.checked)} />Spotify</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={musicBrainz} disabled={running} onChange={event => setMusicBrainz(event.target.checked)} />MusicBrainz (ISRC)</label>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {(['pending', 'running', 'complete', 'failed'] as const).map((status, index) => <div key={status} className="rounded-md border border-border p-2"><span className="text-muted-foreground">{['Pendentes', 'Processando', 'Concluídos', 'Falhas'][index]}</span><p className="font-semibold">{jobs ? jobs.filter(job => job.status === status).length : '…'}</p></div>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!(allowed || spotify || musicBrainz) || running} onClick={() => void start()}>Processar fila</Button>
        <Button variant="outline" disabled={!running} onClick={() => controller.current?.abort()}>Pausar</Button>
        <Button variant="outline" disabled={running} onClick={() => void retry()}>Reagendar falhas</Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </CardContent></Card>
  );
}
