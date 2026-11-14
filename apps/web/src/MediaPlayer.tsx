import { createEffect, createSignal, onCleanup } from 'solid-js';
import { audioPeaks, mediaTime } from './audio';
import styles from './MediaPlayer.module.css';
// Only one message plays at a time, including previews in the composer.
const playEvent = 'jardim:media-play';
export function MediaPlayer(props: {
  source: string;
  type: string;
  blob?: Blob;
  durationHint?: number;
}) {
  const video = props.type.startsWith('video/');
  const [playing, setPlaying] = createSignal(false),
    [position, setPosition] = createSignal(0),
    [duration, setDuration] = createSignal(props.durationHint || 0),
    [speed, setSpeed] = createSignal(1),
    [expanded, setExpanded] = createSignal(false),
    [peaks, setPeaks] = createSignal<number[]>([]),
    [waveState, setWaveState] = createSignal('loading'),
    [error, setError] = createSignal('');
  let element: HTMLMediaElement | undefined,
    observer: IntersectionObserver | undefined,
    controller: AbortController | undefined,
    disposed = false,
    audioContext: AudioContext | undefined;
  const pauseOthers = (event: Event) => {
    if ((event as CustomEvent).detail !== element) element?.pause();
  };
  document.addEventListener(playEvent, pauseOthers);
  onCleanup(() => {
    disposed = true;
    controller?.abort();
    observer?.disconnect();
    element?.pause();
    document.removeEventListener(playEvent, pauseOthers);
    void audioContext?.close().catch(() => {});
  });
  function connect(media: HTMLMediaElement) {
    element = media;
  }
  async function waveform() {
    if (video || disposed || controller) return;
    controller = new AbortController();
    try {
      let blob = props.blob;
      if (!blob) {
        const response = await fetch(props.source, { signal: controller.signal });
        if (!response.ok) throw Error('offline');
        blob = await response.blob();
      }
      if (disposed) return;
      if (blob.size > 12 * 1024 * 1024 || typeof AudioContext === 'undefined')
        throw Error('unsupported');
      audioContext = new AudioContext();
      const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
      if (disposed) return;
      setPeaks(audioPeaks(decoded.getChannelData(0)));
      setDuration(decoded.duration);
      setWaveState('ready');
    } catch {
      if (!disposed) setWaveState('unavailable');
    } finally {
      void audioContext?.close().catch(() => {});
      audioContext = undefined;
    }
  }
  const onMetadata = (event: Event) => {
    const media = event.currentTarget as HTMLMediaElement;
    if (Number.isFinite(media.duration)) setDuration(media.duration);
  };
  async function toggle() {
    if (!element) return;
    setError('');
    if (!element.paused) {
      element.pause();
      return;
    }
    try {
      document.dispatchEvent(new CustomEvent(playEvent, { detail: element }));
      await element.play();
    } catch {
      setError('Não foi possível reproduzir. Tente novamente ou baixe o original.');
    }
  }
  function seek(event: Event) {
    if (!element || !duration()) return;
    element.currentTime =
      (Number((event.currentTarget as HTMLInputElement).value) * duration()) / 1000;
    setPosition(element.currentTime);
  }
  createEffect(
    () => speed(),
    (value) => {
      if (element) element.playbackRate = value;
    },
  );
  const attrs = {
    onLoadedMetadata: onMetadata,
    onDurationChange: onMetadata,
    onTimeUpdate: (event: Event) =>
      setPosition((event.currentTarget as HTMLMediaElement).currentTime),
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => {
      setPlaying(false);
    },
    onError: () => setError('Arquivo indisponível ou formato sem suporte neste navegador.'),
  };
  const progress = () => (duration() ? Math.min(1, position() / duration()) : 0);
  return (
    <div
      class={`${styles.player} ${video ? styles.videoMessage : styles.audioMessage}`}
      data-playing={playing() ? 'true' : 'false'}
      data-expanded={expanded() ? 'true' : 'false'}
    >
      {video ? (
        <div class={styles.videoFrame}>
          <video
            ref={connect}
            {...attrs}
            src={props.source}
            playsinline
            preload="metadata"
            aria-label="Mensagem de vídeo"
          />
          <button
            type="button"
            class={styles.videoToggle}
            aria-label={playing() ? 'Pausar vídeo' : 'Reproduzir vídeo'}
            onClick={() => void toggle()}
          >
            <span aria-hidden="true">{playing() ? 'Ⅱ' : '▶'}</span>
          </button>
          <svg class={styles.ring} viewBox="0 0 100 100" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r="48"
              pathLength="100"
              stroke-dasharray={`${progress() * 100} 100`}
            />
          </svg>
        </div>
      ) : (
        <audio ref={connect} {...attrs} preload="metadata" src={props.source} />
      )}
      <div class={styles.controls}>
        {!video ? (
          <button
            type="button"
            class={styles.play}
            aria-label={playing() ? 'Pausar áudio' : 'Reproduzir áudio'}
            onClick={() => void toggle()}
          >
            {playing() ? 'Ⅱ' : '▶'}
          </button>
        ) : null}
        <div class={styles.track}>
          {!video ? (
            <div
              class={styles.wave}
              data-waveform={waveState()}
              ref={(node) => {
                if (typeof IntersectionObserver === 'undefined') {
                  void waveform();
                  return;
                }
                observer = new IntersectionObserver((entries) => {
                  if (entries.some((entry) => entry.isIntersecting)) {
                    void waveform();
                    observer?.disconnect();
                  }
                });
                observer.observe(node);
              }}
            >
              {peaks().length ? (
                <svg viewBox="0 0 192 40" role="img" aria-label="Forma de onda do áudio">
                  {peaks().map((peak, index) => (
                    <rect
                      x={index * 4}
                      y={20 - Math.max(1, peak * 18)}
                      width="2.5"
                      height={Math.max(2, peak * 36)}
                      rx="1.25"
                      fill={
                        index / 48 <= progress() && position() > 0
                          ? 'var(--g-accent)'
                          : 'var(--g-muted)'
                      }
                    />
                  ))}
                </svg>
              ) : (
                <span>
                  {waveState() === 'loading' ? 'Analisando áudio…' : 'Forma de onda indisponível'}
                </span>
              )}
            </div>
          ) : null}
          <label class="sr-only">{video ? 'Posição do vídeo' : 'Posição do áudio'}</label>
          <input
            type="range"
            min="0"
            max="1000"
            step="1"
            aria-label={video ? 'Posição do vídeo' : 'Posição do áudio'}
            value={Math.round(progress() * 1000)}
            disabled={!duration()}
            onInput={seek}
          />
          <span class={styles.time}>
            {mediaTime(position())} / {duration() ? mediaTime(duration()) : '—'}
          </span>
        </div>
        <button
          type="button"
          class={styles.speed}
          aria-label="Velocidade de reprodução"
          onClick={() => setSpeed(speed() === 1 ? 1.5 : speed() === 1.5 ? 2 : 1)}
        >
          {speed()}×
        </button>
        {video ? (
          <button
            type="button"
            class={styles.speed}
            aria-label={expanded() ? 'Recolher vídeo' : 'Ampliar vídeo'}
            aria-expanded={expanded() ? 'true' : 'false'}
            onClick={() => setExpanded(!expanded())}
          >
            {expanded() ? '↙' : '↗'}
          </button>
        ) : null}
      </div>
      {error() ? <p role="status">{error()}</p> : null}
    </div>
  );
}
