import { createSignal } from 'solid-js';
import { z, type Memory } from '@rodkisten/jardim-contracts';
import type { GardenDB } from '@rodkisten/jardim-local-db';
import { fetchProtocol } from '@rodkisten/jardim-local-db/transport';
const Status = z.object({
  spotify: z.object({
    configured: z.boolean(),
    connected: z.boolean(),
    clientId: z.string().optional(),
    redirectUri: z.string().optional(),
    missing: z.string().nullable().optional(),
  }),
  tmdb: z.object({ configured: z.boolean() }),
});
const Results = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      type: z.string(),
      title: z.string(),
      description: z.string(),
      year: z.string(),
    }),
  ),
});
const SpotifyRow = z.object({
  ts: z.string(),
  master_metadata_track_name: z.string().nullable().optional(),
  master_metadata_album_artist_name: z.string().nullable().optional(),
  spotify_track_uri: z.string().nullable().optional(),
  episode_name: z.string().nullable().optional(),
  spotify_episode_uri: z.string().nullable().optional(),
  ms_played: z.number().optional(),
});
async function eventId(value: string) {
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-8${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}
export function Integrations(props: { db: GardenDB; memories: Memory[]; onChanged: () => void }) {
  const [status, setStatus] = createSignal<z.infer<typeof Status> | null>(null),
    [message, setMessage] = createSignal(''),
    [busy, setBusy] = createSignal(false),
    [results, setResults] = createSignal<z.infer<typeof Results>['results']>([]),
    [selected, setSelected] = createSignal<z.infer<typeof Results>['results'][number] | null>(null),
    [kind, setKind] = createSignal('filme'),
    [cultureTitle, setCultureTitle] = createSignal(''),
    [clientId, setClientId] = createSignal('');
  let clientEdited = false;
  const oauthResult = new URLSearchParams(location.search).get('spotify');
  if (oauthResult === 'denied')
    setMessage('Autorização cancelada no Spotify. Você pode tentar novamente.');
  if (oauthResult === 'failed')
    setMessage(
      'Spotify não concluiu a conexão. Confira o Client ID, o endereço de retorno e os usuários autorizados na aplicação.',
    );
  async function load() {
    try {
      const response = await fetchProtocol('/v2/integrations');
      if (response.ok) {
        const next = Status.parse(await response.json());
        setStatus(next);
        if (!clientEdited) setClientId(next.spotify.clientId || '');
      }
    } catch {
      setMessage('Offline · importação e registros manuais continuam disponíveis.');
    }
  }
  async function spotify(action: 'start' | 'sync' | 'disconnect') {
    if (busy()) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetchProtocol(
        action === 'disconnect' ? '/v2/spotify' : `/v2/spotify/${action}`,
        { method: action === 'disconnect' ? 'DELETE' : 'POST' },
      );
      if (!response.ok) {
        const data = z.object({ error: z.string().optional() }).safeParse(await response.json());
        throw Error(
          data.success && data.data.error
            ? data.data.error
            : 'Spotify indisponível. Confira a configuração e tente novamente.',
        );
      }
      if (action === 'start') {
        const result = z
          .object({
            url: z
              .url()
              .refine((value) => new URL(value).origin === 'https://accounts.spotify.com'),
          })
          .parse(await response.json());
        window.location.assign(result.url);
      } else {
        setMessage(
          action === 'disconnect'
            ? 'Spotify desconectado. Os registros importados foram preservados.'
            : 'Músicas recentes recebidas. A cobertura não inclui todo o histórico ou podcasts.',
        );
        await load();
        props.onChanged();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha na integração.');
    } finally {
      setBusy(false);
    }
  }
  async function configureSpotify(event: SubmitEvent) {
    event.preventDefault();
    if (busy()) return;
    const id = String(new FormData(event.currentTarget as HTMLFormElement).get('clientId')).trim();
    setBusy(true);
    try {
      const response = await fetchProtocol('/v2/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotifyClientId: id }),
      });
      if (!response.ok) throw Error('Use o Client ID de 32 caracteres, sem o Client Secret.');
      clientEdited = false;
      await load();
      setMessage('Aplicação salva. Agora toque em Conectar Spotify para autorizar sua conta.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }
  async function copyRedirect() {
    try {
      await navigator.clipboard.writeText(
        status()?.spotify.redirectUri || location.origin + '/v2/spotify/callback',
      );
      setMessage('Endereço de retorno copiado.');
    } catch {
      setMessage('Copie o endereço de retorno exibido abaixo.');
    }
  }
  async function importSpotify(event: Event) {
    const input = event.currentTarget as HTMLInputElement,
      file = input.files?.[0];
    if (!file || busy()) return;
    if (file.size > 32 * 1024 * 1024) {
      setMessage('Use um JSON de até 32 MiB.');
      input.value = '';
      return;
    }
    setBusy(true);
    try {
      const rows = z
        .array(SpotifyRow)
        .max(10000)
        .parse(JSON.parse(await file.text()));
      const entries = new Map<string, Memory>();
      let skipped = 0;
      for (const row of rows) {
        const date = z.iso.datetime().safeParse(row.ts),
          uri = row.spotify_track_uri || row.spotify_episode_uri || '',
          match = uri.match(/^spotify:(track|episode):([A-Za-z0-9]{22})$/),
          title = row.master_metadata_track_name || row.episode_name;
        if (!date.success || !match || !title || row.ms_played === 0) {
          skipped++;
          continue;
        }
        const id = await eventId('spotify:' + row.ts + ':' + match[2]);
        entries.set(id, {
          id,
          title: title.slice(0, 160),
          body: `${row.master_metadata_album_artist_name || ''}\nReprodução registrada: ${row.ts}\nhttps://open.spotify.com/${match[1]}/${match[2]}\nFonte: exportação Spotify`,
          tags: ['spotify', match[1] === 'episode' ? 'podcast' : 'música'],
          createdAt: row.ts,
        });
      }
      const result = await props.db.restore({
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        memories: [...entries.values()],
      });
      setMessage(
        `${result.added} reprodução(ões) importada(s); ${result.skipped} já presentes; ${skipped} sem dados suficientes. Datas sem fuso não foram inventadas.`,
      );
      props.onChanged();
    } catch {
      setMessage(
        'Não foi possível importar. Use o JSON do histórico estendido do Spotify, com até 10.000 registros.',
      );
    } finally {
      setBusy(false);
      input.value = '';
    }
  }
  async function search(event: SubmitEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const query = String(new FormData(event.currentTarget as HTMLFormElement).get('query'));
      const response = await fetchProtocol('/v2/tmdb/search?q=' + encodeURIComponent(query));
      if (!response.ok) throw Error('Configure a conexão TMDB ou registre o título manualmente.');
      setResults(Results.parse(await response.json()).results);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Busca indisponível.');
    } finally {
      setBusy(false);
    }
  }
  async function culture(event: SubmitEvent) {
    event.preventDefault();
    if (busy()) return;
    setBusy(true);
    try {
      const form = event.currentTarget as HTMLFormElement,
        data = new FormData(form),
        title = String(data.get('title')).trim(),
        state = String(data.get('state')),
        rating = String(data.get('rating')),
        date = String(data.get('date')),
        season = String(data.get('season') || ''),
        episode = String(data.get('episode') || ''),
        comment = String(data.get('comment'));
      await props.db.plant({
        title: `${kind() === 'filme' ? 'Filme' : 'Série'} · ${title}`,
        body: [
          `Estado: ${state}`,
          date ? `Data da experiência: ${date}` : 'Data da experiência não informada',
          rating ? `Avaliação pessoal: ${rating}/10` : 'Sem avaliação',
          season ? `Temporada: ${season}` : '',
          episode ? `Episódio: ${episode}` : '',
          comment,
          selected() ? `https://www.themoviedb.org/${selected()!.type}/${selected()!.id}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        tags: ['cultura', kind(), state],
      });
      form.reset();
      setCultureTitle('');
      setSelected(null);
      setMessage('Registro cultural guardado.');
      props.onChanged();
    } catch {
      setMessage('Não foi possível guardar. Confira os campos e os limites.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      id="integracoes"
      class="composer"
      open={
        oauthResult === 'denied' || oauthResult === 'failed' || location.hash === '#integracoes'
      }
      ref={(element) => {
        if (location.hash === '#integracoes') {
          element.open = true;
          void load();
        }
      }}
      onToggle={(event) => {
        if (event.currentTarget.open) void load();
      }}
    >
      <summary>Cultura, Spotify e conexões</summary>
      <h2>Sua trilha sonora</h2>
      <p>
        Spotify ·{' '}
        {status()?.spotify.connected
          ? 'conectado'
          : status()?.spotify.configured
            ? 'pronto para conectar'
            : 'configuração da aplicação pendente'}
      </p>
      {status()?.spotify.connected ? (
        <>
          <button class="subtle" disabled={busy()} onClick={() => void spotify('sync')}>
            Importar músicas recentes
          </button>
          <button class="subtle" disabled={busy()} onClick={() => void spotify('disconnect')}>
            Desconectar Spotify
          </button>
        </>
      ) : (
        <button
          class="subtle"
          disabled={busy() || !status()?.spotify.configured}
          onClick={() => void spotify('start')}
        >
          Conectar Spotify
        </button>
      )}
      <details class="spotify-setup" open={!!status() && !status()!.spotify.configured}>
        <summary>Configurar aplicação Spotify</summary>
        <p>
          Cadastre uma aplicação no{' '}
          <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
            Spotify for Developers
          </a>
          . Adicione este endereço em Redirect URIs:
        </p>
        <code>{status()?.spotify.redirectUri || location.origin + '/v2/spotify/callback'}</code>
        <button type="button" class="subtle" onClick={() => void copyRedirect()}>
          Copiar endereço de retorno
        </button>
        <form onSubmit={configureSpotify}>
          <label for="spotify-client">Client ID do Spotify</label>
          <input
            id="spotify-client"
            name="clientId"
            value={clientId()}
            onInput={(event) => {
              clientEdited = true;
              setClientId(event.currentTarget.value);
            }}
            required
            pattern="[a-fA-F0-9]{32}"
            minlength={32}
            maxlength={32}
            autocomplete="off"
            spellcheck={false}
          />
          <button class="primary" disabled={busy()}>
            Salvar aplicação Spotify
          </button>
        </form>
        <p class="footnote">
          Use somente o Client ID. A conexão usa PKCE e não pede Client Secret. Se a aplicação
          estiver em desenvolvimento, sua conta deve estar autorizada no painel Spotify.
        </p>
        {status()?.spotify.missing === 'encryption_key' ? (
          <p role="status">A chave de criptografia ainda precisa ser configurada no servidor.</p>
        ) : null}
      </details>
      <p>
        Até 50 músicas recentes por consulta. Podcasts e o histórico completo podem ter lacunas.
      </p>
      <label for="spotify-history">Importar JSON do histórico estendido do Spotify</label>
      <input
        id="spotify-history"
        type="file"
        accept="application/json,.json"
        disabled={busy()}
        onChange={(event) => void importSpotify(event)}
      />
      <h2>Filmes e séries</h2>
      <p>
        {props.memories.filter((memory) => memory.tags.includes('cultura')).length} registro(s)
        cultural(is) no dispositivo.
      </p>
      <form onSubmit={search}>
        <label for="tmdb-query">Buscar no TMDB</label>
        <input id="tmdb-query" name="query" required minlength={2} maxlength={100} />
        <button class="subtle" disabled={busy() || !status()?.tmdb.configured}>
          Buscar título
        </button>
      </form>
      {results().map((item) => (
        <button
          class="subtle"
          onClick={() => {
            setSelected(item);
            setCultureTitle(item.title.slice(0, 140));
            setKind(item.type === 'movie' ? 'filme' : 'série');
          }}
        >
          {item.title} · {item.year}
        </button>
      ))}
      <form onSubmit={culture}>
        <label for="culture-title">Título</label>
        <input
          id="culture-title"
          name="title"
          required
          maxlength={140}
          value={cultureTitle()}
          onInput={(event) => setCultureTitle(event.currentTarget.value)}
        />
        <label for="culture-kind">Tipo</label>
        <select
          id="culture-kind"
          value={kind()}
          onChange={(event) => setKind(event.currentTarget.value)}
        >
          <option value="filme">Filme</option>
          <option value="série">Série</option>
        </select>
        <label for="culture-state">Estado</label>
        <select id="culture-state" name="state">
          <option value="quero-assistir">Quero assistir</option>
          <option value="assistindo">Assistindo</option>
          <option value="concluído">Concluído</option>
          <option value="abandonado">Abandonado</option>
          <option value="reassistido">Reassistido</option>
        </select>
        <label for="culture-date">Data da experiência</label>
        <input id="culture-date" name="date" type="date" />
        <label for="culture-rating">Sua avaliação · 0 a 10</label>
        <input id="culture-rating" name="rating" type="number" min={0} max={10} step={0.5} />
        {kind() === 'série' ? (
          <>
            <label for="culture-season">Temporada</label>
            <input id="culture-season" name="season" type="number" min={0} max={1000} />
            <label for="culture-episode">Episódio</label>
            <input id="culture-episode" name="episode" type="number" min={1} max={10000} />
          </>
        ) : null}
        <label for="culture-comment">Comentário</label>
        <textarea id="culture-comment" name="comment" maxlength={8000} />
        <button class="primary" disabled={busy()}>
          Guardar registro cultural
        </button>
      </form>
      <p>
        <a
          href={`https://www.imdb.com/find/?q=${encodeURIComponent(selected()?.title || '')}`}
          target="_blank"
          rel="noreferrer"
        >
          Buscar no IMDb
        </a>{' '}
        · avaliações são publicadas manualmente.
      </p>
      <p class="footnote">
        Este produto usa a API do{' '}
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
          TMDB
        </a>
        , sem endosso ou certificação do TMDB.
      </p>
      {message() ? <p role="status">{message()}</p> : null}
    </details>
  );
}
