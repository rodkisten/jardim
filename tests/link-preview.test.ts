import { expect, test } from 'vitest';
import { extractLinks, describeLink, safeWebUrl } from '../apps/web/src/utils/link-preview';
test('extracts and deduplicates pasted links', () => {
  expect(extractLinks('Veja https://example.com/story. https://example.com/story')).toEqual([
    'https://example.com/story',
  ]);
});
test('rejects unsafe protocols and credentials', () => {
  expect(safeWebUrl('javascript:alert(1)')).toBeNull();
  expect(safeWebUrl('https://user:pass@example.com')).toBeNull();
});
test('builds local preview without network', () => {
  expect(describeLink('https://example.com/my-story')?.title).toBe('my story');
});
