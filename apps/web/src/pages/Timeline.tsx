import { useState } from 'react';
import { cn } from '@rodkisten/girassol/react';
import { localDay, selectMemories, sources, type Period, type Source } from '../utils/timeline';
import { useMemories } from '../hooks/useMemories';
import { MemoryList } from '../components/MemoryList';
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export function Timeline() {
  const state = useMemories(),
    [period, setPeriod] = useState<Period>('all'),
    [source, setSource] = useState<Source | 'all'>('all');
  const periods = [
    ['all', 'Tudo'],
    ['day', 'Hoje'],
    ['week', 'Semana'],
    ['month', 'Mês'],
    ['anniversary', 'Neste dia'],
  ] as const;
  const memories = selectMemories(state.memories, {
    period,
    source,
    anchor: localDay(new Date(), zone),
    query: '',
    timeZone: zone,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Timeline</h1>
      <div className="flex flex-wrap gap-2">
        {periods.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={period === value}
            onClick={() => setPeriod(value)}
            className={cn(
              'rounded-full border border-border px-3 py-2 text-xs',
              period === value && 'bg-primary text-primary-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="block text-xs text-muted-foreground">
        Origem
        <select
          className="mt-1 block w-full rounded-md border border-border bg-card p-2 text-foreground"
          value={source}
          onChange={(event) => setSource(event.target.value as Source | 'all')}
        >
          <option value="all">Todas</option>
          {Object.entries(sources).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <MemoryList {...state} memories={memories} />
    </div>
  );
}
