import { createSignal, onCleanup } from 'solid-js';

const BAR_COUNT = 32;
const SILENCE = Array.from({ length: BAR_COUNT }, () => 0.06);

/**
 * Visualize the microphone waveform, not its frequency bins. Time-domain samples
 * remain meaningful for speech and avoid a blank spectrum on quiet iOS inputs.
 * The recording must continue even when Web Audio is unavailable or suspended.
 */
export function LiveLevels(props: { stream: MediaStream }) {
  const [levels, setLevels] = createSignal<number[]>(SILENCE);
  const [available, setAvailable] = createSignal(true);
  let context: AudioContext | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let source: MediaStreamAudioSourceNode | undefined;

  try {
    if (typeof AudioContext === 'undefined') {
      setAvailable(false);
    } else {
      context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.65;
      source = context.createMediaStreamSource(props.stream);
      source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      // Safari can suspend an AudioContext until user interaction. Recording
      // itself is independent of the visualization.
      void context.resume().catch(() => setAvailable(false));
      timer = setInterval(() => {
        if (context?.state !== 'running') return;
        analyser.getByteTimeDomainData(samples);
        const stride = Math.floor(samples.length / BAR_COUNT);
        const next = Array.from({ length: BAR_COUNT }, (_, index) => {
          let peak = 0;
          for (let i = index * stride; i < (index + 1) * stride; i++) {
            peak = Math.max(peak, Math.abs(samples[i] - 128) / 128);
          }
          return Math.max(0.06, Math.min(1, peak * 2.8));
        });
        setLevels(next);
      }, 70);
    }
  } catch {
    setAvailable(false);
  }

  onCleanup(() => {
    if (timer) clearInterval(timer);
    source?.disconnect();
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  });

  return (
    <div class="live-levels" role="img" aria-label="Forma de onda do microfone">
      <svg viewBox="0 0 128 40" aria-hidden="true">
        {levels().map((value, index) => (
          <rect
            x={index * 4 + 1}
            y={20 - Math.max(1, value * 18)}
            width="2"
            height={Math.max(2, value * 36)}
            rx="1"
          />
        ))}
      </svg>
      {!available() ? <span>Visualização indisponível; gravação continua ativa</span> : null}
    </div>
  );
}
