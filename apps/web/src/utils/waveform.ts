export function waveform(samples: Float32Array, bars = 48): number[] {
  const count = Math.max(1, Math.min(128, Math.floor(bars) || 48));
  if (!samples.length) return [];
  const peaks = Array.from({ length: count }, (_, i) => {
    let peak = 0;
    const start = Math.floor((i * samples.length) / count),
      end = Math.max(start + 1, Math.floor(((i + 1) * samples.length) / count));
    for (let j = start; j < Math.min(end, samples.length); j++)
      peak = Math.max(peak, Math.abs(samples[j]));
    return peak;
  });
  const max = Math.max(...peaks, 0.001);
  return peaks.map((p) => p / max);
}
export function mediaTime(seconds: number) {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
