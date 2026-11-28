import { useMemo, useState } from 'react';
import { Button, Input } from '@rodkisten/girassol/react';
import {
  contextualProfile,
  filterListening,
  type InsightDimension,
  type InsightFilter,
} from '../utils/insights';
import type { LocalListening } from '../utils/music-insights-local';

const dimensions: { key: InsightDimension; label: string }[] = [
  { key: 'mood', label: 'Humor' },
  { key: 'weather', label: 'Clima' },
  { key: 'season', label: 'Estação' },
  { key: 'moonSign', label: 'Lua' },
];
const selectClass = 'block w-full rounded-lg border border-border bg-background p-2 text-base';

export function MusicExplorer({ rows }: { rows: readonly LocalListening[] }) {
  const [query, setQuery] = useState(''),
    [artist, setArtist] = useState(''),
    [track, setTrack] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [bpm, setBpm] = useState(''),
    [context, setContext] = useState<Partial<Record<InsightDimension, string>>>({}),
    [dimension, setDimension] = useState<InsightDimension>('mood'),
    [limit, setLimit] = useState(30);
  const catalog = useMemo(() => {
    const artists = new Map<string, string>(),
      tracks = new Map<string, string>(),
      values = new Map<InsightDimension, Set<string>>();
    for (const row of rows) {
      if (row.source === 'reference') continue;
      for (const id of row.artistIds) artists.set(id, row.artist);
      tracks.set(row.trackId, row.title + ' · ' + row.artist);
      for (const { key } of dimensions) {
        const value = row.context?.[key];
        if (value) {
          if (!values.has(key)) values.set(key, new Set());
          values.get(key)?.add(value);
        }
      }
    }
    return { artists, tracks, values };
  }, [rows]);
  const invalid =
    Boolean(from && to && from > to) ||
    Boolean(bpm && (!Number.isFinite(Number(bpm)) || Number(bpm) <= 0));
  const filter: InsightFilter = {
    artistId: artist || undefined,
    trackId: track || undefined,
    from: from || undefined,
    to: to || undefined,
    maxBpm: bpm ? Number(bpm) : undefined,
    context,
  };
  const q = query.trim().toLocaleLowerCase('pt-BR');
  const matches = invalid
    ? []
    : (filterListening(rows, filter).filter((row) => {
        const item = row as LocalListening;
        return !q || (item.title + ' ' + item.artist).toLocaleLowerCase('pt-BR').includes(q);
      }) as LocalListening[]);
  const profile = contextualProfile(rows, dimension, filter);
  const totalMs = matches.reduce((sum, row) => sum + (row.playedMs ?? 0), 0);
  const knownDuration = matches.filter((row) => row.playedMs !== undefined).length;
  function reset() {
    setQuery('');
    setArtist('');
    setTrack('');
    setFrom('');
    setTo('');
    setBpm('');
    setContext({});
    setLimit(30);
  }
  return (
    <section className="space-y-4 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="jardim-editorial text-xl">Explorador musical</h3>
        <Button type="button" variant="ghost" onClick={reset}>
          Limpar filtros
        </Button>
      </div>
      <Input
        aria-label="Buscar música ou artista"
        placeholder="Buscar música ou artista"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <label className="block text-sm">
        Artista
        <select
          className={selectClass}
          value={artist}
          onChange={(e) => {
            setArtist(e.target.value);
            setTrack('');
          }}
        >
          <option value="">Todos</option>
          {[...catalog.artists]
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
        </select>
      </label>
      <label className="block text-sm">
        Música
        <select className={selectClass} value={track} onChange={(e) => setTrack(e.target.value)}>
          <option value="">Todas</option>
          {[...catalog.tracks]
            .filter(
              ([id]) =>
                !artist || rows.some((row) => row.trackId === id && row.artistIds.includes(artist)),
            )
            .map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0 text-sm">
          De
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="min-w-0 text-sm">
          Até
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <Input
        type="number"
        min={1}
        aria-label="BPM máximo"
        placeholder="BPM máximo"
        value={bpm}
        onChange={(e) => setBpm(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        {dimensions.map(({ key, label }) => (
          <label key={key} className="min-w-0 text-sm">
            {label}
            <select
              className={selectClass}
              value={context[key] ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setContext((old) => {
                  const next = { ...old };
                  if (value) next[key] = value;
                  else delete next[key];
                  return next;
                });
              }}
            >
              <option value="">Todos</option>
              {[...(catalog.values.get(key) ?? [])].sort().map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {invalid ? (
        <p role="alert">Confira as datas e o BPM.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border p-3">
              <strong className="text-xl">{matches.length}</strong>
              <p className="text-xs text-muted-foreground">Escutas encontradas</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <strong className="text-xl">{Math.round(totalMs / 60000)} min</strong>
              <p className="text-xs text-muted-foreground">
                Duração conhecida ({knownDuration}/{matches.length})
              </p>
            </div>
          </div>
          <label className="block text-sm">
            Distribuição contextual
            <select
              className={selectClass}
              value={dimension}
              onChange={(e) => setDimension(e.target.value as InsightDimension)}
            >
              {dimensions.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            Perfil dos filtros estruturados (sem busca textual): {profile.known}/{profile.total} com
            contexto. Base geral no período: {profile.baselineKnown} com contexto.
          </p>
          {profile.groups.map((g) => (
            <div key={g.value} className="space-y-1">
              <div className="flex justify-between gap-2 text-sm">
                <span>{g.value}</span>
                <span>
                  {g.count} · {Math.round(g.share * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: g.share * 100 + '%' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Base: {Math.round(g.baselineShare * 100)}%
                {g.lift !== null && profile.known >= 10
                  ? ' · ' + g.lift.toFixed(1) + '× frequência relativa'
                  : ''}
              </p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Associações descritivas, não causas. Frequência relativa exibida a partir de 10 escutas
            contextualizadas.
          </p>
          <div className="space-y-2">
            {matches.slice(0, limit).map((row) => (
              <article key={row.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{row.title}</p>
                <p className="text-xs text-muted-foreground">
                  {row.artist} · {row.localDate}
                  {row.bpm ? ' · ' + row.bpm + ' BPM' : ''}
                </p>
                <p className="text-xs">
                  {dimensions
                    .map((d) => row.context?.[d.key])
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setArtist('');
                      setTrack(row.trackId);
                    }}
                  >
                    Perfil da música
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTrack('');
                      setArtist(row.artistIds[0] ?? '');
                    }}
                  >
                    Perfil do artista
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {matches.length > limit && (
            <Button type="button" variant="outline" onClick={() => setLimit((n) => n + 30)}>
              Mostrar mais
            </Button>
          )}
          {!matches.length && (
            <p className="text-sm text-muted-foreground">Nenhuma escuta encontrada.</p>
          )}
        </>
      )}
    </section>
  );
}
