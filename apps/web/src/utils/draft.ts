import { RichDocument } from '@rodkisten/jardim-contracts';
export const DRAFT_KEY = 'jardim:composer-draft:v1';
export type Draft = { title: string; body: string; tags: string; document: RichDocument | null };
export function readDraft(): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    const doc = RichDocument.safeParse(value.document);
    return {
      title: typeof value.title === 'string' ? value.title.slice(0, 160) : '',
      body: typeof value.body === 'string' ? value.body.slice(0, 20000) : '',
      tags: typeof value.tags === 'string' ? value.tags.slice(0, 1000) : '',
      document: doc.success ? doc.data : null,
    };
  } catch {
    return { title: '', body: '', tags: '', document: null };
  }
}
export function saveDraft(draft: Draft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}
