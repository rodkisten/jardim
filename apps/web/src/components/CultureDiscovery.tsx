import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { BookOpen, Film, Search } from 'lucide-react';
import { z } from '@rodkisten/jardim-contracts';
import { Button, Input } from '@rodkisten/girassol/react';
import { db } from '../utils/db';
import { useMemories } from '../hooks/useMemories';
import { integrationRequest, Results, Status } from '../utils/integrations';

type Discovery = { id: string; title: string; subtitle: string; description: string; year: string; kind: string; source: string; url: string; cover?: string };
const Books = z.object({ docs: z.array(z.object({ key: z.string(), title: z.string(), author_name: z.array(z.string()).optional(), first_publish_year: z.number().optional(), cover_i: z.number().optional() })) });
async function discover(provider: 'tmdb' | 'books', query: string, signal: AbortSignal): Promise<Discovery[]> {
  if (provider === 'tmdb') {
    const data = Results.parse(await integrationRequest('/v2/tmdb/search?q=' + encodeURIComponent(query), { signal }));
    return data.results.map(item => ({ id: 'tmdb:' + item.type + ':' + item.id, title: item.title, subtitle: item.type === 'movie' ? 'Filme' : 'Série', description: item.description, year: item.year, kind: item.type === 'movie' ? 'filme' : 'série', source: 'TMDB', url: 'https://www.themoviedb.org/' + item.type + '/' + item.id, cover: item.poster }));
  }
  const url = new URL('https://openlibrary.org/search.json');
  url.search = new URLSearchParams({ q: query, limit: '12', fields: 'key,title,author_name,first_publish_year,cover_i' }).toString();
  const response = await fetch(url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error('Open Library indisponível.');
  const data = Books.parse(await response.json());
  return data.docs.filter(item => /^\/works\/OL[0-9]+W$/.test(item.key)).map(item => ({ id: 'openlibrary:' + item.key, title: item.title, subtitle: item.author_name?.slice(0, 3).join(', ') || 'Autoria desconhecida', description: '', year: item.first_publish_year?.toString() || '', kind: 'livro', source: 'Open Library', url: 'https://openlibrary.org' + item.key, cover: item.cover_i ? 'https://covers.openlibrary.org/b/id/' + item.cover_i + '-M.jpg' : undefined }));
}
export function CultureDiscovery() {
  const [provider, setProvider] = useState<'tmdb' | 'books'>('tmdb');
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState('');
  const state = useMemories();
  const status = useQuery({ queryKey: ['integrations'], queryFn: async () => Status.parse(await integrationRequest('/v2/integrations')), retry: false });
  const results = useQuery({ queryKey: ['culture-discovery', provider, submitted], queryFn: ({ signal }) => discover(provider, submitted, signal), enabled: submitted.length >= 2 && (provider === 'books' || !!status.data?.tmdb.configured), staleTime: 300000, retry: false });
  const save = useMutation({ mutationFn: async (item: Discovery) => {
    if (state.memories.some(m => m.tags.includes('cultura') && m.body.includes(item.url))) return;
    await db.plant({ title: item.title.slice(0, 140), body: [item.subtitle, item.year, item.description.slice(0, 3000), item.url, 'Fonte: ' + item.source].filter(Boolean).join('\n\n'), tags: ['cultura', item.kind, item.source.toLowerCase()] });
  } });
  return (
    <section className="space-y-4">
      <h2 className="jardim-editorial text-2xl">Descobrir</h2>
      <div className="flex gap-2">
        <button type="button" className="jardim-filter" aria-pressed={provider === 'tmdb'} onClick={() => { setProvider('tmdb'); setSubmitted(''); }}><Film className="mr-1 inline size-4" /> Cinema</button>
        <button type="button" className="jardim-filter" aria-pressed={provider === 'books'} onClick={() => { setProvider('books'); setSubmitted(''); }}><BookOpen className="mr-1 inline size-4" /> Livros</button>
      </div>
      {provider === 'tmdb' && !status.isPending && !status.data?.tmdb.configured && <p className="text-sm text-muted-foreground">TMDB indisponível. <Link to="/integrations" className="underline">Ver integrações</Link></p>}
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setSubmitted(input.trim()); }}>
        <Input aria-label="Busca cultural" placeholder={provider === 'books' ? 'Título ou autor' : 'Filme ou série'} value={input} onChange={e => setInput(e.target.value)} minLength={2} maxLength={100} required />
        <Button disabled={input.trim().length < 2 || (provider === 'tmdb' && !status.data?.tmdb.configured)}><Search className="size-4" /> Buscar</Button>
      </form>
      {results.isFetching && <p role="status" className="text-sm">Buscando…</p>}
      {results.isError && <p role="alert" className="text-sm">{results.error.message}</p>}
      {results.isSuccess && !results.data.length && <p className="text-sm text-muted-foreground">Nenhum resultado encontrado.</p>}
      {save.isError && <p role="alert" className="text-sm">{save.error.message}</p>}
      <div className="space-y-3">
        {results.data?.map(item => {
          const saved = state.memories.some(m => m.tags.includes('cultura') && m.body.includes(item.url));
          return <article key={item.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
            {item.cover && /^https:\/\/(image\.tmdb\.org|covers\.openlibrary\.org)\//.test(item.cover) ? <img src={item.cover} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-28 w-20 shrink-0 rounded-lg object-cover" /> : <div className="grid h-28 w-20 shrink-0 place-items-center rounded-lg bg-muted"><BookOpen className="size-6 text-muted-foreground" /></div>}
            <div className="min-w-0 flex-1 space-y-2"><h3 className="jardim-editorial text-lg">{item.title}</h3><p className="text-xs text-muted-foreground">{[item.subtitle, item.year].filter(Boolean).join(' · ')}</p>
              {item.description && <details className="text-xs"><summary>Sinopse</summary><p className="mt-1">{item.description}</p></details>}
              <div className="flex flex-wrap items-center gap-2"><Button disabled={saved || save.isPending || state.loading || !!state.error} onClick={() => save.mutate(item)}>{saved ? 'Guardado' : 'Guardar'}</Button><a href={item.url} target="_blank" rel="noreferrer" className="text-xs underline">{item.source}</a></div>
            </div>
          </article>;
        })}
      </div>
      <p className="text-xs text-muted-foreground">Buscas de livros são enviadas diretamente à Open Library. Dados de cinema fornecidos pelo TMDB, sem endosso ou certificação.</p>
    </section>
  );
}
