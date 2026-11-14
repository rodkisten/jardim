import { createSignal, onCleanup } from 'solid-js';
export function LiveLevels(props: { stream: MediaStream }) {
  const [levels, setLevels] = createSignal<number[]>([]);
  let context: AudioContext | undefined, timer: ReturnType<typeof setInterval> | undefined;
  try {
    if (typeof AudioContext !== 'undefined') {
      context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      context.createMediaStreamSource(props.stream).connect(analyser);
      void context.resume().catch(() => {});
      const values = new Uint8Array(analyser.frequencyBinCount);
      timer = setInterval(() => {
        analyser.getByteFrequencyData(values);
        setLevels(Array.from(values.slice(0, 32), (value) => value / 255));
      }, 80);
    }
  } catch {
    /* Recording still works when Web Audio visualization is unsupported. */
  }
  onCleanup(() => {
    if (timer) clearInterval(timer);
    void context?.close().catch(() => {});
  });
  return (
    <div class="live-levels" aria-label="Nível do microfone">
      {levels().length ? (
        <svg viewBox="0 0 128 40" aria-hidden="true">
          {levels().map((value, index) => (
            <rect
              x={index * 4}
              y={20 - Math.max(1, value * 19)}
              width="2"
              height={Math.max(2, value * 38)}
              rx="1"
            />
          ))}
        </svg>
      ) : (
        <span>Microfone ativo</span>
      )}
    </div>
  );
}
