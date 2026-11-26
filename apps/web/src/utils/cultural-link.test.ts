import { describe, it, expect } from 'vitest';
import { culturalLink } from './cultural-link';
describe('cultural links', () => {
  it('normalizes video and removes tracking', () =>
    expect(culturalLink('https://youtu.be/dQw4w9WgXcQ?si=abc')?.href).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    ));
  it('rejects lookalikes and credentials', () => {
    expect(culturalLink('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(culturalLink('https://user@youtu.be/dQw4w9WgXcQ')).toBeNull();
  });
  it('canonicalizes movies', () =>
    expect(culturalLink('https://www.themoviedb.org/movie/123-name?x=1')?.href).toBe(
      'https://www.themoviedb.org/movie/123',
    ));
});
