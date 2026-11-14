export function audioPeaks(samples: Float32Array, bars = 48): number[] {
  if (!samples.length) return [];
  const result: number[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const start = Math.floor((bar * samples.length) / bars),
      end = Math.max(start + 1, Math.floor(((bar + 1) * samples.length) / bars));
    let sum = 0;
    for (let index = start; index < Math.min(end, samples.length); index++)
      sum += samples[index] * samples[index];
    result.push(Math.sqrt(sum / Math.max(1, Math.min(end, samples.length) - start)));
  }
  const max = Math.max(...result);
  return result.map((value) => (max ? value / max : 0));
}
export function mediaTime(seconds: number): string {
  const value = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
