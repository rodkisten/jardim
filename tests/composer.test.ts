import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import {
  ComposerDB,
  saveComposer,
  clearComposer,
  appendAttachments,
} from '../apps/web/src/utils/composer-store';
import { hasUpdateBlockers, setUpdateBlocker } from '../apps/web/src/utils/update-guard';
test('composer persists text and attachment bytes across database reopen', async () => {
  const name = 'composer-test-' + crypto.randomUUID(),
    db = new ComposerDB(name);
  const blob = new Blob(['photo'], { type: 'image/png' });
  await saveComposer(
    {
      id: 'current',
      draft: { title: 'Hoje', body: 'Memória', tags: 'fé', document: null },
      attachments: [{ blob, name: 'photo.png', lastModified: 1 }],
    },
    db,
  );
  db.close();
  const reopened = new ComposerDB(name);
  const saved = await reopened.drafts.get('current');
  expect(saved?.draft.body).toBe('Memória');
  expect(saved?.attachments[0].blob.size).toBe(5);
  await clearComposer(reopened);
  expect(await reopened.drafts.count()).toBe(0);
  await reopened.delete();
});
test('attachments reject unsupported media and duplicate selections', () => {
  const file = new File(['a'], 'a.png', { type: 'image/png', lastModified: 1 });
  expect(appendAttachments([], [file, file], ['image/png'])).toHaveLength(1);
  expect(() => appendAttachments([], [file], ['audio/mpeg'])).toThrow();
});
test('updates remain blocked until persistence completes', () => {
  setUpdateBlocker('draft', true);
  setUpdateBlocker('submit', true);
  setUpdateBlocker('draft', false);
  expect(hasUpdateBlockers()).toBe(true);
  setUpdateBlocker('submit', false);
  expect(hasUpdateBlockers()).toBe(false);
});
