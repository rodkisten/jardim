import { useInsightSettings } from '../hooks/useInsightSettings';
import { useMemo, useState } from 'react';
import type { LocalListening } from '../utils/music-insights-local';
import type { AtlasPeriod } from '../utils/music-atlas';
import { solarProfile } from '../utils/music-helios';
export function MusicHelios({
  rows,
  periods,
}: {
  rows: readonly LocalListening[];
  periods: readonly AtlasPeriod[];
}) {
  const { solar } = useInsightSettings();
  const [artist, setArtist] = useState('');
  const artists = useMemo(() => {
    const result = new Map<string, string>();
    for (const row of rows) for (const id of row.artistIds) result.set(id, row.artist);
    return [...result].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);
  const data = useMemo(
    () => solarProfile(rows, periods, artist, solar),
    [rows, periods, artist, solar],
  );
  return (
    <section className="space-y-3 border-t border-border pt-4">
      <h3 className="jardim-editorial text-xl">Hélios · Ritmos solares</h3>
      <p className="text-xs text-muted-foreground">
        Ative Atlas e cadastre coordenadas para calcular a elevação geométrica do Sol no instante de
        cada escuta. Sem consulta externa.
      </p>
      <label className="block text-sm">
        Artista
        <select
          className="block w-full rounded-lg border border-border bg-background p-2 text-base"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        >
          <option value="">Todos</option>
          {artists.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        {data.known} escutas contextualizadas · {data.unknown} sem contexto solar
      </p>
      {['Noite', 'Crepúsculo', 'Hora azul', 'Faixa dourada', 'Dia'].map((phase) => {
        const count = data.counts.get(phase) ?? 0;
        return (
          <div key={phase} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{phase}</span>
              <span>{count}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: (100 * count) / Math.max(1, data.known) + '%' }}
              />
            </div>
          </div>
        );
      })}
      <details className="text-xs text-muted-foreground">
        <summary>Critérios solares</summary>
        <p>
          Noite abaixo de {solar[0]}°, crepúsculo de {solar[0]}° a {solar[1]}°, azul de {solar[1]}°
          a {solar[2]}°, faixa dourada de {solar[2]}° a {solar[3]}°, dia acima. Faixas aproximadas
          por elevação, não condições reais de iluminação. Não distingue manhã de tarde.
        </p>
      </details>
    </section>
  );
}
