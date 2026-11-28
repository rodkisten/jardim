import { useState } from 'react';
import { Button } from '@rodkisten/girassol/react';
import { z } from 'zod';
type Item = { id: string; title: string; body: string };
export function SemanticSearch({ items }: { items: Item[] }) {
  const [query, setQuery] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [results, setResults] = useState<{ id: string; score: number }[]>([]);
  const [filter, setFilter] = useState('');
  const visible = items.filter((i) =>
    i.title.toLocaleLowerCase('pt-BR').includes(filter.toLocaleLowerCase('pt-BR')),
  );
  const candidates = items.filter((i) => selected.includes(i.id)).slice(0, 12);
  async function run() {
    if (!consent || busy || !candidates.length || query.trim().length < 2) return;
    setBusy(true);
    setConsent(false);
    setError('');
    setResults([]);
    try {
      const response = await fetch('/v2/intelligence/search', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent: true,
          query,
          items: candidates.map((i) => ({
            id: i.id,
            text: (i.title + '\n' + i.body).slice(0, 1500),
          })),
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok)
        throw Error(response.status === 429 ? 'Quota diária atingida.' : 'Busca indisponível.');
      setResults(
        z
          .object({ results: z.array(z.object({ id: z.string(), score: z.number() })) })
          .parse(await response.json()).results,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Busca indisponível.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="jardim-editorial text-xl">Busca por significado</h2>
      <p className="text-xs text-muted-foreground">
        Escolha até 12 memórias. Somente os primeiros 1.500 caracteres de cada seleção e sua
        consulta serão enviados à Cloudflare. O Jardim não guarda os vetores.
      </p>
      <input
        className="w-full rounded-lg border border-border bg-background p-2 text-base"
        value={query}
        maxLength={500}
        disabled={busy}
        onChange={(e) => {
          setQuery(e.target.value);
          setConsent(false);
          setResults([]);
        }}
        placeholder="O que quero reencontrar?"
      />
      <input
        aria-label="Filtrar memórias candidatas"
        className="w-full rounded-lg border border-border bg-background p-2 text-base"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrar títulos"
      />
      <p className="text-xs text-muted-foreground">{candidates.length}/12 selecionadas</p>
      <div className="max-h-60 space-y-2 overflow-auto">
        {visible.map((i) => (
          <label key={i.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(i.id)}
              disabled={busy || (!selected.includes(i.id) && selected.length >= 12)}
              onChange={(e) => {
                setSelected((s) =>
                  e.target.checked ? [...s, i.id] : s.filter((id) => id !== i.id),
                );
                setConsent(false);
                setResults([]);
              }}
            />
            {i.title}
          </label>
        ))}
      </div>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Autorizo o processamento dos textos selecionados nesta consulta.
      </label>
      <Button
        type="button"
        disabled={busy || !consent || !candidates.length || query.trim().length < 2}
        onClick={() => void run()}
      >
        {busy ? 'Buscando…' : 'Buscar por significado'}
      </Button>
      {error && <p role="alert">{error}</p>}
      {results.length > 0 && (
        <ol className="space-y-2">
          {results.map((r) => (
            <li key={r.id} className="rounded-lg border border-border p-2 text-sm">
              {items.find((i) => i.id === r.id)?.title ?? 'Memória removida'}{' '}
              <span className="text-xs text-muted-foreground">
                · similaridade {r.score.toFixed(2)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
