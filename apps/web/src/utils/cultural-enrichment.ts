import type { CulturalWork } from './cultural-insights';
import { culturalRegistry as db, type EnrichmentJob } from './cultural-registry';

export interface CulturalProvider {
  id: string;
  supports(work: CulturalWork): boolean;
  enrich(work: CulturalWork, signal: AbortSignal): Promise<Partial<Omit<CulturalWork, 'identity'>>>;
}

export class ProviderRetry extends Error {
  constructor(public retryAfterMs: number) {
    super('Provider temporarily unavailable');
  }
}

const LEASE_MS = 120_000;
const MAX_ATTEMPTS = 6;

async function claim(now: number): Promise<EnrichmentJob | undefined> {
  return db.transaction('rw', db.enrichment, async () => {
    for (const status of ['pending', 'running'] as const) {
      const job = await db.enrichment.where('[status+nextAttemptAt]')
        .between([status, 0], [status, now], true, true).first();
      if (!job) continue;
      if (job.attempts >= MAX_ATTEMPTS) {
        await db.enrichment.put({ ...job, status: 'failed' });
        continue;
      }
      const claimed: EnrichmentJob = { ...job, status: 'running', attempts: job.attempts + 1, nextAttemptAt: now + LEASE_MS };
      await db.enrichment.put(claimed);
      return claimed;
    }
  });
}

export async function enrichNext(providers: readonly CulturalProvider[], signal: AbortSignal): Promise<boolean> {
  signal.throwIfAborted();
  if (!providers.length) return false;
  const job = await claim(Date.now());
  if (!job) return false;
  try {
    const work = await db.works.get(job.workKey);
    if (!work) throw Error('Missing cultural work');
    const applicable = providers.filter((provider) => provider.supports(work));
    if (!applicable.length) {
      await settle(job, 'pending', Date.now() + 86_400_000, true);
      return true;
    }
    const timeout = AbortSignal.timeout(60_000);
    const requestSignal = AbortSignal.any([signal, timeout]);
    let enriched: CulturalWork = work;
    for (const provider of applicable) {
      requestSignal.throwIfAborted();
      const patch = await provider.enrich(enriched, requestSignal);
      enriched = {
        ...enriched, ...patch, identity: work.identity,
        acoustic: { ...enriched.acoustic, ...patch.acoustic },
        identifiers: { ...enriched.identifiers, ...patch.identifiers },
      };
    }
    requestSignal.throwIfAborted();
    await db.transaction('rw', [db.works, db.enrichment], async () => {
      const current = await db.enrichment.get(job.workKey);
      if (!owns(current, job)) return;
      const latest = await db.works.get(job.workKey);
      if (!latest) return;
      await db.works.put({ ...latest, ...enriched, key: job.workKey,
        acoustic: { ...latest.acoustic, ...enriched.acoustic },
        identifiers: { ...latest.identifiers, ...enriched.identifiers } });
      await db.enrichment.put({ ...job, status: 'complete', nextAttemptAt: Date.now() });
    });
  } catch (error) {
    const delay = error instanceof ProviderRetry
      ? Math.max(1000, error.retryAfterMs)
      : Math.min(86_400_000, 30_000 * 2 ** job.attempts);
    await settle(job, signal.aborted || job.attempts < MAX_ATTEMPTS ? 'pending' : 'failed', Date.now() + delay, signal.aborted);
  }
  return true;
}

function owns(current: EnrichmentJob | undefined, job: EnrichmentJob) {
  return current?.status === 'running' && current.attempts === job.attempts && current.nextAttemptAt === job.nextAttemptAt;
}

async function settle(job: EnrichmentJob, status: EnrichmentJob['status'], nextAttemptAt: number, refund: boolean) {
  await db.transaction('rw', db.enrichment, async () => {
    if (!owns(await db.enrichment.get(job.workKey), job)) return;
    await db.enrichment.put({ ...job, status, nextAttemptAt, attempts: job.attempts - Number(refund) });
  });
}
