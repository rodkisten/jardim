import { expect, test } from 'vitest';
import {
  isAnimatedWebp,
  normalizeImageOptions,
  savings,
} from '../apps/web/src/utils/image-options';
test('bounds encoder settings', () => {
  expect(normalizeImageOptions({ format: 'avif', quality: 200, maxDimension: 9000 })).toEqual({
    format: 'avif',
    quality: 100,
    maxDimension: 4096,
  });
});
test('calculates actual savings', () => {
  expect(savings(1000, 250)).toBe(75);
  expect(savings(0, 0)).toBe(0);
});
test('detects animated WebP chunk', () => {
  const bytes = new Uint8Array(22);
  bytes.set(new TextEncoder().encode('RIFF'), 0);
  bytes.set(new TextEncoder().encode('WEBPVP8X'), 8);
  bytes[16] = 2;
  bytes[20] = 2;
  expect(isAnimatedWebp(bytes)).toBe(true);
  bytes[20] = 0;
  expect(isAnimatedWebp(bytes)).toBe(false);
});
