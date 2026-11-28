import Dexie, { type Table } from 'dexie';
import { culturalIdentityKey, type CulturalWork, type CulturalInteraction, type NoteEmotions } from './cultural-insights';

type StoredWork = CulturalWork & { key: string };
type StoredInteraction = CulturalInteraction & { workKey: string };
export type EnrichmentJob = {
  workKey: string;
  status: 'pending' | 'running' | 'failed' | 'complete';
  attempts: number;
  nextAttemptAt: number;
};
export type ImportCheckpoint = { id: string; entry: string; offset: number; updatedAt: number };

class CulturalRegistry extends Dexie {
  works!: Table<StoredWork, string>;
  interactions!: Table<StoredInteraction, string>;
  emotions!: Table<NoteEmotions, string>;
  enrichment!: Table<EnrichmentJob, string>;
  imports!: Table<ImportCheckpoint, string>;

  constructor() {
    super('jardim-cultural-registry');
    this.version(1).stores({
      works: 'key',
      interactions: 'id,workKey,memoryId,occurredAt,[workKey+occurredAt]',
      emotions: 'memoryId',
      enrichment: 'workKey,[status+nextAttemptAt]',
      imports: 'id',
    });
  }
}

export const culturalRegistry = new CulturalRegistry();

export async function ingestCulturalBatch(
  works: CulturalWork[],
  interactions: CulturalInteraction[],
  checkpoint?: ImportCheckpoint,
) {
  if (works.length > 1000 || interactions.length > 1000) throw new Error('Batch exceeds 1000 records');
  const db = culturalRegistry;
  await db.transaction('rw', [db.works, db.interactions, db.enrichment, db.imports], async () => {
    for (const work of works) {
      const key = culturalIdentityKey(work.identity);
      const previous = await db.works.get(key);
      await db.works.put({
        ...previous,
        ...work,
        key,
        acoustic: { ...previous?.acoustic, ...work.acoustic },
        identifiers: { ...previous?.identifiers, ...work.identifiers },
      });
      if (!(await db.enrichment.get(key))) {
        await db.enrichment.add({ workKey: key, status: 'pending', attempts: 0, nextAttemptAt: Date.now() });
      }
    }
    for (const interaction of interactions) {
      const workKey = culturalIdentityKey(interaction.identity);
      if (!(await db.works.get(workKey))) throw new Error('Unknown cultural work');
      if (!(await db.interactions.get(interaction.id))) {
        await db.interactions.add({ ...interaction, workKey });
      }
    }
    if (checkpoint) await db.imports.put(checkpoint);
  });
}

export async function saveEmotionSuggestions(memoryId: string, suggestions: NoteEmotions['suggestions']) {
  const db = culturalRegistry;
  await db.transaction('rw', db.emotions, async () => {
    const previous = await db.emotions.get(memoryId);
    await db.emotions.put({ memoryId, suggestions, confirmed: previous?.confirmed ?? [] });
  });
}

export async function confirmEmotions(memoryId: string, confirmed: string[]) {
  const db = culturalRegistry;
  await db.transaction('rw', db.emotions, async () => {
    const previous = await db.emotions.get(memoryId);
    await db.emotions.put({ memoryId, suggestions: previous?.suggestions ?? [], confirmed: [...new Set(confirmed)] });
  });
}
