import { createSignal, onCleanup } from 'solid-js';
export type PendingFile = { blob: Blob; name: string };
const LIMIT = 12 * 1024 * 1024;
export function MediaComposer(props: {
  files: PendingFile[];
  onChange: (files: PendingFile[]) => void;
  onRecordingChange?: (value: boolean) => void;
}) {
  const [recording, setRecording] = createSignal(false),
    [stream, setStream] = createSignal<MediaStream | null>(null),
    [error, setError] = createSignal('');
  let recorder: MediaRecorder | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    disposed = false;
  let generation = 0;
  function recordingState(value: boolean) {
    setRecording(value);
    props.onRecordingChange?.(value);
  }
  function stop() {
    generation++;
    if (!recorder || recorder.state === 'inactive') recordingState(false);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    stream()
      ?.getTracks()
      .forEach((track) => track.stop());
    if (timer) clearTimeout(timer);
  }
  onCleanup(() => {
    disposed = true;
    stop();
  });
  async function start(video: boolean) {
    if (recording()) return;
    setError('');
    if (props.files.length >= 5) {
      setError('Use até 5 anexos por memória.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Gravação indisponível. Use o seletor de arquivos ou a câmera do dispositivo.');
      return;
    }
    const sequence = ++generation;
    recordingState(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video
          ? { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }
          : false,
      });
      if (disposed || sequence !== generation) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      setStream(media);
      const candidates = video
        ? ['video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm']
        : ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
      const mime = candidates.find((type) => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      let size = 0,
        overflow = false,
        failed = false;
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        size += event.data.size;
        if (size > LIMIT) {
          overflow = true;
          stop();
        } else chunks.push(event.data);
      };
      recorder.onerror = () => {
        failed = true;
        setError('A gravação falhou. Tente selecionar um arquivo.');
        stop();
      };
      recorder.onstop = () => {
        const type = recorder?.mimeType || chunks[0]?.type || '';
        if (!disposed) {
          if (overflow) setError('Gravação excedeu 12 MiB e não foi adicionada.');
          else if (!failed && chunks.length)
            props.onChange([
              ...props.files,
              {
                name: `${video ? 'video' : 'audio'}-${Date.now()}.${type.includes('mp4') ? 'mp4' : 'webm'}`,
                blob: new Blob(chunks, { type }),
              },
            ]);
          recordingState(false);
          setStream(null);
        }
        media.getTracks().forEach((track) => track.stop());
        if (timer) clearTimeout(timer);
      };
      recorder.start(1000);
      recordingState(true);
      timer = setTimeout(stop, 30000);
    } catch {
      stop();
      recordingState(false);
      setStream(null);
      setError(
        'Não foi possível acessar a câmera ou microfone. Confira a permissão e tente novamente.',
      );
    }
  }
  function choose(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (
      props.files.length + files.length > 5 ||
      files.some((file) => !file.size || file.size > LIMIT)
    ) {
      setError('Use até 5 arquivos de no máximo 12 MiB cada.');
      input.value = '';
      return;
    }
    props.onChange([...props.files, ...files.map((file) => ({ name: file.name, blob: file }))]);
    input.value = '';
    setError('');
  }
  return (
    <fieldset class="media-composer">
      <legend>Fotos, voz e vídeo</legend>
      <label for="media-files">Selecionar arquivos · até 12 MiB cada</label>
      <input
        id="media-files"
        type="file"
        accept="image/*,audio/*,video/*"
        multiple
        disabled={recording()}
        onChange={(event) => choose(event)}
      />
      <div class="actions">
        {recording() ? (
          <button type="button" onClick={stop}>
            Parar gravação
          </button>
        ) : (
          <>
            <button type="button" onClick={() => void start(false)}>
              Gravar voz
            </button>
            <button type="button" onClick={() => void start(true)}>
              Gravar vídeo circular
            </button>
          </>
        )}
      </div>
      {stream() ? (
        <div>
          <p role="status">Gravando · até 30 segundos</p>
          <video
            class="circular-video"
            ref={(element) => {
              element.srcObject = stream();
            }}
            autoplay
            muted
            playsinline
          />
        </div>
      ) : null}
      <ul>
        {props.files.map((file, index) => (
          <li>
            {file.name} · {(file.blob.size / 1024 / 1024).toFixed(1)} MiB{' '}
            <button
              class="subtle"
              type="button"
              onClick={() =>
                props.onChange(props.files.filter((_, position) => position !== index))
              }
            >
              Remover anexo
            </button>
          </li>
        ))}
      </ul>
      {error() ? <p role="alert">{error()}</p> : null}
    </fieldset>
  );
}
