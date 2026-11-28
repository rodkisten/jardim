import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@rodkisten/girassol/react';
import type { Memory } from '@rodkisten/jardim-contracts';
import { culturalRegistry, confirmEmotions } from '../utils/cultural-registry';
import { analyzeNoteEmotions } from '../utils/sentio';

export function SentioPanel({ memory }: { memory: Memory }) {
  const record = useLiveQuery(() => culturalRegistry.emotions.get(memory.id), [memory.id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [custom, setCustom] = useState('');
  const confirmed = record?.confirmed ?? [];
  const labels = [...new Set([...(record?.suggestions.map(item => item.label) ?? []), ...confirmed])];
  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await action(); } catch { setError('Não foi possível salvar a análise.'); }
    finally { setBusy(false); }
  }
  return (
    <section className="space-y-3 rounded-lg border border-border p-3">
      <h2 className="text-sm font-semibold">Sentimentos</h2>
      <p className="text-xs text-muted-foreground">Análise opcional neste dispositivo. Sugestões não representam diagnóstico nem substituem sua interpretação.</p>
      <Button disabled={busy} variant="outline" onClick={() => void run(() => analyzeNoteEmotions(memory, { enabled: true }))}>Analisar esta nota</Button>
      <div className="flex flex-wrap gap-2">
        {labels.map(label => (
          <Button key={label} size="sm" variant={confirmed.includes(label) ? 'default' : 'outline'} aria-pressed={confirmed.includes(label)} disabled={busy} onClick={() => void run(() => confirmEmotions(memory.id, confirmed.includes(label) ? confirmed.filter(item => item !== label) : [...confirmed, label]))}>{label}</Button>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={event => { event.preventDefault(); const label = custom.trim().slice(0, 80); if (label) void run(async () => { await confirmEmotions(memory.id, [...confirmed, label]); setCustom(''); }); }}>
        <input className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm" aria-label="Sentimento personalizado" placeholder="Outro sentimento" value={custom} onChange={event => setCustom(event.target.value)} maxLength={80} />
        <Button type="submit" size="sm" disabled={busy || !custom.trim()}>Adicionar</Button>
      </form>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
