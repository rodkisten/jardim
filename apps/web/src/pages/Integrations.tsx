import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from '@rodkisten/jardim-contracts';
import { Button, Card, CardContent, Input } from '@rodkisten/girassol/react';
import { Status, Results, importSpotify, integrationRequest } from '../utils/integrations';
import { db } from '../utils/db';
import { isPreview } from '../utils/preview';
export function IntegrationsPage() {
  const client = useQueryClient(),
    [id, setId] = useState(''),
    [q, setQ] = useState(''),
    [title, setTitle] = useState(''),
    [kind, setKind] = useState('filme'),
    [message, setMessage] = useState(''),
    [selected, setSelected] = useState<z.infer<typeof Results>['results'][number] | null>(null);
  const status = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => Status.parse(await integrationRequest('/v2/integrations')),
    retry: false,
    enabled: !isPreview,
  });
  const action = useMutation({
    mutationFn: async (action: 'start' | 'sync' | 'disconnect') => {
      const data = await integrationRequest(
        action === 'disconnect' ? '/v2/spotify' : '/v2/spotify/' + action,
        { method: action === 'disconnect' ? 'DELETE' : 'POST' },
      );
      if (action === 'start') {
        const url = z.string().url().parse(data.url);
        if (new URL(url).origin !== 'https://accounts.spotify.com')
          throw new Error('Destino OAuth inválido.');
        location.assign(url);
      }
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['integrations'] });
      setMessage('Operação concluída.');
    },
  });
  const configure = useMutation({
    mutationFn: async () => {
      const value = id.trim() || status.data?.spotify.clientId || '';
      if (!/^[a-fA-F0-9]{32}$/.test(value)) throw Error('Informe um Client ID hexadecimal de 32 caracteres.');
      await integrationRequest('/v2/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotifyClientId: value }),
      });
      const current = Status.parse(await integrationRequest('/v2/integrations'));
      client.setQueryData(['integrations'], current);
      if (!current.spotify.configured) throw Error('Spotify indisponível: verifique INTEGRATION_KEY no servidor.');
      const data = await integrationRequest('/v2/spotify/start', { method: 'POST' });
      const url = z.string().url().parse(data.url);
      if (new URL(url).origin !== 'https://accounts.spotify.com') throw Error('Destino OAuth inválido.');
      location.assign(url);
    },
  });
  const search = useMutation({
    mutationFn: async () =>
      Results.parse(await integrationRequest('/v2/tmdb/search?q=' + encodeURIComponent(q))),
  });
  const history = useMutation({
    mutationFn: importSpotify,
    onSuccess: (r) =>
      setMessage(
        r.added + ' importados; ' + r.skipped + ' existentes; ' + r.invalid + ' inválidos.',
      ),
  });
  const culture = useMutation({
    mutationFn: async () =>
      db.plant({
        title: (kind === 'filme' ? 'Filme' : 'Série') + ' · ' + title.trim(),
        body: selected
          ? 'https://www.themoviedb.org/' + selected.type + '/' + selected.id
          : 'Registro cultural manual',
        tags: ['cultura', kind],
      }),
    onSuccess: () => {
      setTitle('');
      setSelected(null);
      setMessage('Registro cultural guardado.');
    },
  });
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Integrações</h1>
      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-semibold">Spotify</h2>
          {isPreview && (
            <p role="status" className="rounded-lg border border-border p-3 text-sm">
              Este preview usa armazenamento local e não possui API de autenticação. Para conectar sua conta, abra o <a className="text-primary underline" href="https://jardim.migos.club">Jardim em produção</a>. A importação JSON continua disponível aqui.
            </p>
          )}
          {!isPreview && <>
          <p>
            {status.data?.spotify.connected
              ? 'Conectado'
              : status.data?.spotify.configured
                ? 'Pronto para conectar'
                : 'Configuração pendente'}
          </p>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage('');
              configure.mutate();
            }}
          >
            <Input
              aria-label="Client ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder={status.data?.spotify.clientId || 'Client ID'}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <Button type="submit" disabled={configure.isPending || action.isPending}>
              {configure.isPending ? 'Conectando…' : 'Salvar e conectar ao Spotify'}
            </Button>
            {configure.error && <p role="alert" className="text-sm text-destructive">{configure.error.message}</p>}
          </form>
          {status.data?.spotify.missing === 'encryption_key' && (
            <p role="alert" className="text-sm text-destructive">Falta configurar INTEGRATION_KEY no servidor.</p>
          )}
          {message && <p role="status">{message}</p>}
          {[status.error, configure.error, action.error].filter(Boolean).map((error, i) => (
            <p key={i} role="alert" className="text-sm text-destructive">{error?.message}</p>
          ))}
          <p className="break-all text-xs">
            {status.data?.spotify.redirectUri || location.origin + '/v2/spotify/callback'}
          </p>
          {status.data?.spotify.connected ? (
            <>
              <Button disabled={action.isPending} onClick={() => action.mutate('sync')}>
                Importar recentes
              </Button>
              <Button
                variant="outline"
                disabled={action.isPending}
                onClick={() => action.mutate('disconnect')}
              >
                Desconectar
              </Button>
            </>
          ) : (
            <Button
              disabled={action.isPending || !status.data?.spotify.configured}
              onClick={() => action.mutate('start')}
            >
              Conectar Spotify
            </Button>
          )}
          </>}
          <label className="block text-sm">
            Importar histórico JSON
            <input
              type="file"
              accept=".json,application/json"
              disabled={history.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) history.mutate(file);
                e.target.value = '';
              }}
            />
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-semibold">Filmes e séries</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              search.mutate();
            }}
            className="flex gap-2"
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              placeholder="Buscar no TMDB"
            />
            <Button disabled={search.isPending || !status.data?.tmdb.configured}>Buscar</Button>
          </form>
          {search.data?.results.map((item) => (
            <button
              key={item.type + item.id}
              className="block text-left text-sm"
              onClick={() => {
                setSelected(item);
                setTitle(item.title.slice(0, 140));
                setKind(item.type === 'movie' ? 'filme' : 'série');
              }}
            >
              {item.title} · {item.year}
            </button>
          ))}
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              culture.mutate();
            }}
          >
            <Input
              required
              maxLength={140}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSelected(null);
              }}
              placeholder="Título"
            />
            <select
              aria-label="Tipo"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setSelected(null);
              }}
              className="w-full rounded border border-border bg-background p-2"
            >
              <option>filme</option>
              <option>série</option>
            </select>
            <Button disabled={culture.isPending}>Guardar registro</Button>
          </form>
          <p className="text-xs">
            Dados do{' '}
            <a href="https://www.themoviedb.org" className="underline">
              TMDB
            </a>
            , sem endosso ou certificação.
          </p>
        </CardContent>
      </Card>
      {[search.error, history.error, culture.error]
        .filter(Boolean)
        .map((error, i) => (
          <p key={i} role="alert">
            {error?.message}
          </p>
        ))}
    </section>
  );
}
