import type { Memory } from '@rodkisten/jardim-contracts';
import { culturalIdentity } from './cultural-providers';
import { culturalIdentityKey, type CulturalIdentity } from './cultural-insights';
import { culturalRegistry as db } from './cultural-registry';

export function noteIdentities(memory: Pick<Memory, 'body' | 'title' | 'richDocument'>) {
  const identities = new Map<string, CulturalIdentity>();
  const scan = (text: string) => {
    for (const match of text.matchAll(/https:\/\/[^\s<>"\x27\x60\]\)]+|spotify:(?:track|album|artist|episode|show|playlist):[A-Za-z0-9]{22}/g)) {
      const identity = culturalIdentity(match[0].replace(/[.,;!?]+$/, ''));
      if (identity) identities.set(culturalIdentityKey(identity), identity);
    }
  };
  scan(memory.title);
  scan(memory.body);
  const visit = (value: unknown, depth = 0) => {
    if (depth > 80 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) { for (const child of value) visit(child, depth + 1); return; }
    const node = value as Record<string, unknown>;
    if (typeof node.text === 'string') scan(node.text);
    if (node.attrs && typeof node.attrs === 'object') {
      const attrs = node.attrs as Record<string, unknown>;
      for (const key of ['href', 'src', 'url']) if (typeof attrs[key] === 'string') scan(attrs[key] as string);
    }
    visit(node.content, depth + 1);
    visit(node.marks, depth + 1);
  };
  visit(memory.richDocument);
  return identities;
}

export async function reconcileCulturalNote(memory: Memory) {
  const identities = noteIdentities(memory);
  await db.transaction('rw', [db.works, db.interactions, db.enrichment], async () => {
    const previous = await db.interactions.where('memoryId').equals(memory.id).toArray();
    for (const item of previous) {
      if (item.kind === 'mention' && !identities.has(item.workKey)) await db.interactions.delete(item.id);
    }
    for (const [key, identity] of identities) {
      if (!(await db.works.get(key))) await db.works.add({ key, identity });
      if (!(await db.enrichment.get(key))) await db.enrichment.add({ workKey: key, status: 'pending', attempts: 0, nextAttemptAt: Date.now() });
      const id = JSON.stringify(['mention', memory.id, key]);
      await db.interactions.put({ id, workKey: key, identity, kind: 'mention', memoryId: memory.id, occurredAt: memory.createdAt });
    }
  });
}

export async function removeCulturalNote(memoryId: string) {
  await db.transaction('rw', [db.interactions, db.emotions], async () => {
    await db.interactions.where('memoryId').equals(memoryId).filter(item => item.kind === 'mention').delete();
    await db.emotions.delete(memoryId);
  });
}
