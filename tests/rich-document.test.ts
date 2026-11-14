import { describe, expect, it } from 'vitest';
import { Memory, RichDocument } from '@rodkisten/jardim-contracts';

describe('Tiptap document contract', () => {
  const base = {
    id: 'f83f5fa2-8f38-43ae-86e9-97962ad19db4',
    title: 'Memória',
    body: 'Uma lembrança',
    tags: [],
    createdAt: '2026-11-14T12:00:00.000Z',
  };
  it('accepts old plain-text memories without richDocument', () => {
    expect(Memory.parse(base)).toEqual(base);
  });
  it('accepts JSON Tiptap content without executable HTML', () => {
    const richDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Olá', marks: [{ type: 'bold' }] }] }] };
    expect(Memory.parse({ ...base, richDocument }).richDocument).toEqual(richDocument);
  });
  it('rejects malformed root nodes and oversized content', () => {
    expect(RichDocument.safeParse({ type: 'script', content: [] }).success).toBe(false);
    expect(RichDocument.safeParse({ type: 'doc', content: [{ text: 'a'.repeat(81000) }] }).success).toBe(false);
  });
  it('rejects unknown memory fields', () => {
    expect(Memory.safeParse({ ...base, unsafeHtml: '<script />' }).success).toBe(false);
  });
});
