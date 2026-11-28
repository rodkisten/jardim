import type { InsightSettings } from '../hooks/useInsightSettings';
import type { LocalListening } from './music-insights-local';
import type { InsightDimension } from './insights';
type Counts = { total: number; values: Map<string, number> };
type Entity = { name: string; kind: 'artist' | 'track'; dimensions: Map<InsightDimension, Counts> };
const dimensions: InsightDimension[] = ['mood', 'weather', 'season', 'moonSign'];
function increment(map: Map<InsightDimension, Counts>, dimension: InsightDimension, value: string) {
  let counts = map.get(dimension);
  if (!counts) {
    counts = { total: 0, values: new Map() };
    map.set(dimension, counts);
  }
  counts.total++;
  counts.values.set(value, (counts.values.get(value) ?? 0) + 1);
}
export type Discovery = {
  id: string;
  name: string;
  kind: Entity['kind'];
  dimension: InsightDimension;
  value: string;
  count: number;
  known: number;
  otherCount: number;
  otherKnown: number;
  lift: number;
  share: number;
  baselineShare: number;
};
export function discoverMusic(
  rows: readonly LocalListening[],
  options: Pick<
    InsightSettings,
    'entityMin' | 'baselineMin' | 'contextMin' | 'liftMin' | 'differenceMin'
  > = { entityMin: 10, baselineMin: 30, contextMin: 5, liftMin: 1.5, differenceMin: 10 },
): Discovery[] {
  const baseline = new Map<InsightDimension, Counts>(),
    entities = new Map<string, Entity>(),
    seen = new Set<string>();
  for (const row of rows) {
    if (row.source === 'reference' || seen.has(row.id)) continue;
    seen.add(row.id);
    const keys = [
      { id: 'track:' + row.trackId, name: row.title + ' · ' + row.artist, kind: 'track' as const },
      ...[...new Set(row.artistIds)].map((id) => ({
        id: 'artist:' + id,
        name: row.artist,
        kind: 'artist' as const,
      })),
    ];
    for (const dimension of dimensions) {
      const value = row.context?.[dimension];
      if (!value) continue;
      increment(baseline, dimension, value);
      for (const key of keys) {
        let entity = entities.get(key.id);
        if (!entity) {
          entity = { name: key.name, kind: key.kind, dimensions: new Map() };
          entities.set(key.id, entity);
        }
        increment(entity.dimensions, dimension, value);
      }
    }
  }
  const result: Discovery[] = [];
  for (const [id, entity] of entities) {
    for (const [dimension, counts] of entity.dimensions) {
      const all = baseline.get(dimension);
      if (
        !all ||
        counts.total < options.entityMin ||
        all.total - counts.total < options.baselineMin
      )
        continue;
      for (const [value, count] of counts.values) {
        const otherKnown = all.total - counts.total,
          otherCount = (all.values.get(value) ?? 0) - count;
        if (count < options.contextMin || otherCount < options.contextMin) continue;
        const share = count / counts.total,
          baselineShare = otherCount / otherKnown,
          lift = share / baselineShare;
        if (lift < options.liftMin || share - baselineShare < options.differenceMin / 100) continue;
        result.push({
          id: JSON.stringify([id, dimension, value]),
          name: entity.name,
          kind: entity.kind,
          dimension,
          value,
          count,
          known: counts.total,
          otherCount,
          otherKnown,
          lift,
          share,
          baselineShare,
        });
      }
    }
  }
  return result
    .sort(
      (a, b) =>
        (b.share - b.baselineShare) * Math.sqrt(b.known) -
          (a.share - a.baselineShare) * Math.sqrt(a.known) || a.id.localeCompare(b.id),
    )
    .slice(0, 100);
}
