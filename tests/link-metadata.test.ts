import { expect, test } from 'vitest';
import { previewTarget, parseMetadata, linkPreview } from '../apps/api/src/link-preview';
test('rejects private and arbitrary hosts', () => {
  for (const url of [
    'https://127.0.0.1',
    'https://github.com.evil.test',
    'https://github.com@evil.test',
    'http://github.com',
  ])
    expect(previewTarget(url)).toBeNull();
});
test('extracts metadata without rendering HTML', () =>
  expect(
    parseMetadata(
      '<meta content="A &amp; B" property="og:title"><meta name="description" content="Example">',
    ),
  ).toMatchObject({ title: 'A & B', description: 'Example' }));
test('does not follow redirects', async () => {
  const result = await linkPreview(
    new URL('https://jardim.test/v2/link-preview?url=https://github.com/test'),
    async () => new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1' } }),
  );
  expect(result.status).toBe(422);
});
