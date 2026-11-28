import { useState } from 'react';
import { Button, Input } from '@rodkisten/girassol/react';
import { findRecordings, spotifyTrack, type RecordingCandidate } from '../utils/music-metadata';
export function MusicMetadata({
  title,
  artist,
  onSelect,
}: {
  title: string;
  artist: string;
  onSelect: (title: string, artist: string) => void;
}) {
  const [link, setLink] = useState(''),
    [results, setResults] = useState<RecordingCandidate[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const id = spotifyTrack(link);
  async function lookup() {
    setBusy(true);
    setError('');
    setResults([]);
    try {
      const rows = await findRecordings(title, artist, AbortSignal.timeout(15000));
      setResults(rows);
      if (!rows.length) setError('Nenhuma gravação encontrada.');
    } catch {
      setError('Consulta indisponível. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="space-y-2 rounded-lg border border-border p-3">
      <summary className="text-sm font-medium">Identificar música</summary>
      <Input
        aria-label="Link Spotify"
        placeholder="Link ou URI Spotify"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      {id ? (
        <a
          className="block break-all text-xs text-primary"
          href={'https://open.spotify.com/track/' + id}
          target="_blank"
          rel="noreferrer"
        >
          Abrir faixa identificada · {id}
        </a>
      ) : (
        link && <p className="text-xs text-muted-foreground">Informe um link de faixa válido.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Consultar MusicBrainz envia somente o nome da música e do artista ao serviço externo.
        Escolha a gravação correta; nenhuma associação é automática.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={busy || !title.trim() || !artist.trim()}
        onClick={() => void lookup()}
      >
        {busy ? 'Consultando…' : 'Consultar MusicBrainz'}
      </Button>
      {error && (
        <p role="status" className="text-xs">
          {error}
        </p>
      )}
      {results.map((row) => (
        <div key={row.id} className="space-y-1 border-t border-border py-2">
          <p className="text-sm font-medium">{row.title}</p>
          <p className="text-xs text-muted-foreground">
            {row['artist-credit']?.map((a) => a.name).join(', ')} ·{' '}
            {row['first-release-date'] ?? 'Data desconhecida'}
            {row.length ? ' · ' + Math.round(row.length / 1000) + 's' : ''}
          </p>
          <a
            className="block text-xs text-primary"
            href={'https://musicbrainz.org/recording/' + row.id}
            target="_blank"
            rel="noreferrer"
          >
            Ver gravação
          </a>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              onSelect(row.title, row['artist-credit']?.map((a) => a.name).join(', ') || artist)
            }
          >
            Usar título e artista
          </Button>
        </div>
      ))}
    </details>
  );
}
