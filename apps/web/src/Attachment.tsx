import { MediaPlayer } from './MediaPlayer';
import { createSignal, onCleanup } from 'solid-js';
import type { GardenDB } from '@rodkisten/jardim-local-db';
export function Attachment(props: { id: string; db?: GardenDB }) {
  const [source, setSource] = createSignal(''),
    [type, setType] = createSignal(''),
    [error, setError] = createSignal(''),
    [blob, setBlob] = createSignal<Blob | undefined>(undefined),
    [duration, setDuration] = createSignal<number | undefined>(undefined);
  let localUrl = '',
    disposed = false;
  async function load() {
    setError('');
    try {
      const local = await props.db?.attachments.get(props.id);
      if (disposed) return;
      if (local) {
        if (localUrl) URL.revokeObjectURL(localUrl);
        localUrl = URL.createObjectURL(local.blob);
        setType(local.blob.type);
        setBlob(local.blob);
        setDuration(local.duration);
        setSource(localUrl);
        return;
      }
      const url = `/v2/media/${props.id}`;
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok)
        throw Error('Anexo ainda não recebido. Conecte o dispositivo de origem para enviar.');
      if (!disposed) {
        setType(response.headers.get('Content-Type') || '');
        const hint = Number(response.headers.get('X-Media-Duration'));
        if (Number.isFinite(hint) && hint > 0 && hint <= 86400) setDuration(hint);
        setSource(url);
      }
    } catch (error) {
      if (!disposed)
        setError(error instanceof Error ? error.message : 'Não foi possível abrir o anexo.');
    }
  }
  void load();
  onCleanup(() => {
    disposed = true;
    if (localUrl) URL.revokeObjectURL(localUrl);
  });
  return (
    <figure class="attachment">
      {source() ? (
        <>
          {type().startsWith('image/') ? (
            <img src={source()} alt="Foto da memória" loading="lazy" />
          ) : type().startsWith('audio/') || type().startsWith('video/') ? (
            <MediaPlayer source={source()} type={type()} blob={blob()} durationHint={duration()} />
          ) : null}
          <figcaption>
            <a href={source()} download="anexo">
              Baixar original
            </a>
          </figcaption>
        </>
      ) : (
        <p>
          {error() || 'Abrindo anexo…'}{' '}
          <button class="subtle" onClick={() => void load()}>
            Tentar novamente
          </button>
        </p>
      )}
    </figure>
  );
}
