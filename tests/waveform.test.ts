import { expect, test } from 'vitest';
import { waveform, mediaTime } from '../apps/web/src/utils/waveform';
test('normalizes real peaks', () =>
  expect(waveform(new Float32Array([0, 0.25, -0.5, 1]), 2)).toEqual([0.25, 1]));
test('handles silence and unknown duration', () => {
  expect(waveform(new Float32Array(4), 2)).toEqual([0, 0]);
  expect(mediaTime(Infinity)).toBe('0:00');
  expect(mediaTime(84)).toBe('1:24');
});
