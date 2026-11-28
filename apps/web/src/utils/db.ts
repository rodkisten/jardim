import { getInsightSettings } from '../hooks/useInsightSettings';
import { analyzeNoteEmotions } from './sentio';
import { GardenDB } from '@rodkisten/jardim-local-db';
import { liveQuery } from 'dexie';
import { reconcileCulturalNote, removeCulturalNote } from './cultural-notes';
import { culturalRegistry } from './cultural-registry';

export const db = new GardenDB();

// Observe committed snapshots, including remote sync and restored memories.
if (typeof window !== 'undefined') {
  const indexedContent = new Map<string, string>();
  const analyzedContent = new Map<string, string>();
  let pending = Promise.resolve();
  const subscription = liveQuery(() => db.memories.toArray()).subscribe({
    next(memories) {
      pending = pending.then(async () => {
        const ids = new Set(memories.map(memory => memory.id));
        const indexed = await culturalRegistry.interactions.where('memoryId').above('').toArray();
        const emotions = await culturalRegistry.emotions.toCollection().primaryKeys();
        const removed = new Set([
          ...indexed.flatMap(item => item.kind === 'mention' && item.memoryId && !ids.has(item.memoryId) ? [item.memoryId] : []),
          ...emotions.filter(id => !ids.has(id)),
        ]);
        for (const id of removed) await removeCulturalNote(id);
        for (const id of indexedContent.keys()) if (!ids.has(id)) indexedContent.delete(id);
        for (const id of analyzedContent.keys()) if (!ids.has(id)) analyzedContent.delete(id);
        for (const memory of memories) {
          const fingerprint = JSON.stringify([memory.title, memory.body, memory.richDocument, memory.createdAt]);
          if (indexedContent.get(memory.id) !== fingerprint) {
            await reconcileCulturalNote(memory);
            indexedContent.set(memory.id, fingerprint);
          }
          if (getInsightSettings().sentioAutomatic && analyzedContent.get(memory.id) !== fingerprint) {
            await analyzeNoteEmotions(memory, { enabled: true });
            analyzedContent.set(memory.id, fingerprint);
          }
        }
      }).catch(error => { console.error('Cultural index reconciliation failed', error); });
    },
    error(error) { console.error('Cultural memory observation failed', error); },
  });
  if (import.meta.hot) import.meta.hot.dispose(() => subscription.unsubscribe());
}
