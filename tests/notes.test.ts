import { expect, test } from 'vitest';
import { combineNotes, moveNote, type Note } from '../apps/web/src/utils/notes';
const notes: Note[] = [
  { id: 'a', title: 'Primeira', body: 'Texto A', document: null },
  { id: 'b', title: 'Segunda', body: 'Texto B', document: null },
];
test('preserves note order and separators', () => {
  const result = combineNotes(
    { title: 'Publicação', body: '', tags: '', document: null },
    moveNote(notes, 'b', -1),
  );
  expect(result.body).toBe('Segunda\nTexto B\n\nPrimeira\nTexto A');
  expect(result.document?.content?.map((n) => (n as { type: string }).type)).toEqual([
    'heading',
    'paragraph',
    'horizontalRule',
    'heading',
    'paragraph',
  ]);
});
test('does not move beyond boundaries', () => {
  expect(moveNote(notes, 'a', -1)).toBe(notes);
});
