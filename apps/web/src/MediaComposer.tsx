import { createEffect, createSignal, onCleanup } from 'solid-js';
import { MediaPlayer } from './MediaPlayer';
import { LiveLevels } from './LiveLevels';
import { mediaTime } from './audio';
export type PendingFile = { blob: Blob; name: string; duration?: number };
const LIMIT = 12 * 1024 * 1024;
function Preview(props: { file: PendingFile; remove: () => void }) {
  const url = URL.createObjectURL(props.file.blob);
  onCleanup(() => URL.revokeObjectURL(url));
  return (
    <li class="file-preview">
      {props.file.blob.type.startsWith('image/') ? (
        <img src={url} alt="Prévia do anexo" />
      ) : (
        <MediaPlayer
          source={url}
          type={props.file.blob.type}
          blob={props.file.blob}
          durationHint={props.file.duration}
        />
      )}
      <div class="file-caption">
        <span>
          {props.file.name} · {(props.file.blob.size / 1024 / 1024).toFixed(1)} MiB
        </span>
        <button class="subtle" type="button" onClick={props.remove}>
          Remover anexo
        </button>
      </div>
    </li>
  );
}
export function MediaComposer(props: {
  files: PendingFile[];
  onChange: (files: PendingFile[]) => void;
  onRecordingChange?: (value: boolean) => void;
  active?: boolean;
}) {
  const [recording, setRecording] = createSignal(false),
    [paused, setPaused] = createSignal(false),
    [stream, setStream] = createSignal<MediaStream | null>(null),
    [video, setVideo] = createSignal(false),
    [seconds, setSeconds] = createSignal(0),
    [facing, setFacing] = createSignal('user'),
    [error, setError] = createSignal('');
  let recorder: MediaRecorder | undefined,
    media: MediaStream | undefined,
    timer: ReturnType<typeof setInterval> | undefined,
    disposed = false,
    generation = 0,
    keep = true,
    elapsed = 0,
    lastTick = 0;
  function state(value: boolean) {
    setRecording(value);
    props.onRecordingChange?.(value);
  }
  function stop(accept = true) {
    keep = accept;
    if (timer) clearInterval(timer);
    if (recorder?.state === 'recording') {
      elapsed += performance.now() - lastTick;
      lastTick = performance.now();
    }
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    else {
      generation++;
      state(false);
      setStream(null);
    }
    media?.getTracks().forEach((track) => track.stop());
  }
  createEffect(
    () => props.active,
    (active) => {
      if (active === false) stop(false);
    },
  );
  onCleanup(() => {
    disposed = true;
    stop(false);
  });
  async function start(withVideo: boolean) {
    if (recording()) return;
    setError('');
    if (props.files.length >= 5) {
      setError('Use até 5 anexos por memória.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(
        'Use o seletor de arquivos ou a câmera do dispositivo. Gravação indisponível neste navegador.',
      );
      return;
    }
    const request = ++generation;
    state(true);
    setVideo(withVideo);
    setPaused(false);
    setSeconds(0);
    keep = true;
    let acquired: MediaStream | undefined;
    try {
      acquired = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo
          ? { facingMode: facing(), width: { ideal: 480 }, height: { ideal: 480 } }
          : false,
      });
      const tracks = acquired;
      if (disposed || request !== generation) {
        tracks.getTracks().forEach((track) => track.stop());
        return;
      }
      media = tracks;
      const candidates = withVideo
        ? ['video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm']
        : ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
      const mime = candidates.find((type) => MediaRecorder.isTypeSupported(type));
      const instance = new MediaRecorder(tracks, mime ? { mimeType: mime } : undefined);
      recorder = instance;
      const chunks: Blob[] = [];
      let size = 0,
        failed = false;
      instance.ondataavailable = (event) => {
        if (!event.data.size) return;
        size += event.data.size;
        if (size > LIMIT) {
          failed = true;
          setError('Gravação excedeu 12 MiB. Tente um vídeo mais curto.');
          stop(false);
        } else chunks.push(event.data);
      };
      instance.onerror = () => {
        failed = true;
        setError('A gravação falhou. Tente novamente.');
        stop(false);
      };
      instance.onstop = () => {
        const type = instance.mimeType || chunks[0]?.type || '';
        tracks.getTracks().forEach((track) => track.stop());
        if (disposed || request !== generation) return;
        if (timer) clearInterval(timer);
        if (keep && !failed && chunks.length)
          props.onChange([
            ...props.files,
            {
              name: `${withVideo ? 'video' : 'audio'}-${Date.now()}.${type.includes('mp4') ? 'mp4' : 'webm'}`,
              blob: new Blob(chunks, { type }),
              duration: Math.max(0.01, Math.min(30, elapsed / 1000)),
            },
          ]);
        state(false);
        setStream(null);
        setPaused(false);
        recorder = undefined;
        media = undefined;
      };
      instance.start(1000);
      setStream(tracks);
      elapsed = 0;
      lastTick = performance.now();
      timer = setInterval(() => {
        const now = performance.now();
        if (instance.state === 'recording') elapsed += now - lastTick;
        lastTick = now;
        setSeconds(Math.min(30, elapsed / 1000));
        if (elapsed >= 30000) stop();
      }, 100);
    } catch {
      acquired?.getTracks().forEach((track) => track.stop());
      if (disposed || request !== generation) return;
      stop(false);
      state(false);
      setStream(null);
      setError('Confira a permissão da câmera ou microfone e tente novamente.');
    }
  }
  function pause() {
    if (!recorder) return;
    if (recorder.state === 'paused') {
      recorder.resume();
      setPaused(false);
    } else if (recorder.state === 'recording') {
      recorder.pause();
      setPaused(true);
    }
    lastTick = performance.now();
  }
  function choose(event: Event) {
    const input = event.currentTarget as HTMLInputElement,
      files = Array.from(input.files || []);
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
      <div class="record-actions">
        <label class="file-button" for="media-files">
          Anexar arquivo
          <input
            id="media-files"
            type="file"
            accept="image/*,audio/*,video/*"
            multiple
            disabled={recording()}
            onChange={choose}
          />
        </label>
        {!recording() ? (
          <>
            <button type="button" class="record-choice" onClick={() => void start(false)}>
              Gravar voz
            </button>
            <button type="button" class="record-choice" onClick={() => void start(true)}>
              Gravar vídeo circular
            </button>
            <button
              class="subtle"
              type="button"
              onClick={() => setFacing(facing() === 'user' ? 'environment' : 'user')}
            >
              Câmera: {facing() === 'user' ? 'frontal' : 'traseira'}
            </button>
          </>
        ) : null}
      </div>
      {recording() ? (
        <section class="record-session" aria-label="Gravação em andamento">
          <p role="status">
            {stream()
              ? paused()
                ? 'Gravação pausada'
                : 'Gravando · até 30 segundos'
              : 'Aguardando permissão…'}
          </p>
          {stream() && video() ? (
            <div class="record-circle" style={`--record-progress: ${(seconds() / 30) * 360}deg`}>
              <video
                ref={(element) => {
                  element.srcObject = stream();
                }}
                autoplay
                muted
                playsinline
                aria-label="Prévia da câmera"
              />
            </div>
          ) : null}
          {stream() ? <LiveLevels stream={stream()!} /> : null}
          <p class="record-time">
            {mediaTime(seconds())} <span>/ 0:30</span>
          </p>
          <div class="record-actions">
            <button type="button" class="subtle" onClick={() => stop(false)}>
              Descartar gravação
            </button>
            {stream() ? (
              <button type="button" class="record-choice" onClick={pause}>
                {paused() ? 'Retomar gravação' : 'Pausar gravação'}
              </button>
            ) : null}
            <button type="button" class="record-stop" onClick={() => stop()}>
              Parar gravação
            </button>
          </div>
        </section>
      ) : null}
      <ul class="file-previews">
        {props.files.map((file, index) => (
          <Preview
            file={file}
            remove={() => props.onChange(props.files.filter((_, position) => position !== index))}
          />
        ))}
      </ul>
      <p class="footnote">Até 5 anexos · 12 MiB cada. Revise antes de salvar.</p>
      {error() ? <p role="alert">{error()}</p> : null}
    </fieldset>
  );
}
