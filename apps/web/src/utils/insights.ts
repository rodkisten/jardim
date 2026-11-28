export type ListeningEvent = {
  id: string;
  trackId: string;
  artistIds: string[];
  occurredAt: string;
  localDate: string;
  source: 'playback' | 'manual' | 'reference';
  context?: { mood?: string; weather?: string; season?: string; moonSign?: string; hour?: number };
  bpm?: number;
};
export type InsightDimension = 'mood' | 'weather' | 'season' | 'moonSign';
export type InsightFilter = {
  trackId?: string;
  artistId?: string;
  from?: string;
  to?: string;
  maxBpm?: number;
  context?: Partial<Record<InsightDimension, string>>;
};
export function filterListening(events: readonly ListeningEvent[], filter: InsightFilter = {}) {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (e.source === 'reference' || seen.has(e.id)) return false;
    seen.add(e.id);
    if (filter.trackId && e.trackId !== filter.trackId) return false;
    if (filter.artistId && !e.artistIds.includes(filter.artistId)) return false;
    if ((filter.from && e.localDate < filter.from) || (filter.to && e.localDate > filter.to))
      return false;
    if (
      filter.maxBpm !== undefined &&
      (e.bpm === undefined || !Number.isFinite(e.bpm) || e.bpm > filter.maxBpm)
    )
      return false;
    return Object.entries(filter.context ?? {}).every(
      ([k, v]) => e.context?.[k as InsightDimension] === v,
    );
  });
}
export function contextualProfile(
  events: readonly ListeningEvent[],
  dimension: InsightDimension,
  filter: InsightFilter = {},
) {
  const baseline = filterListening(events, { from: filter.from, to: filter.to });
  const selected = filterListening(events, filter);
  function count(rows: ListeningEvent[]) {
    const counts = new Map<string, number>();
    let known = 0;
    for (const row of rows) {
      const value = row.context?.[dimension];
      if (!value) continue;
      known++;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return { counts, known };
  }
  const a = count(selected),
    b = count(baseline);
  return {
    total: selected.length,
    known: a.known,
    missing: selected.length - a.known,
    baselineKnown: b.known,
    groups: [...a.counts]
      .map(([value, n]) => {
        const share = n / a.known;
        const baselineShare = (b.counts.get(value) ?? 0) / b.known;
        return {
          value,
          count: n,
          share,
          baselineShare,
          lift: baselineShare > 0 ? share / baselineShare : null,
        };
      })
      .sort((x, y) => y.count - x.count || x.value.localeCompare(y.value)),
  };
}
