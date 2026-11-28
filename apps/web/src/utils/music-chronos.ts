import type { AtlasListening } from './music-atlas';
import type { LocalListening } from './music-insights-local';
export function timeFormatter(zone: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    return undefined;
  }
}
export function temporalPoint(row: LocalListening, assumedZone?: Intl.DateTimeFormat) {
  if (row.timeBasis === 'device' && row.context?.hour !== undefined)
    return { date: row.localDate, hour: row.context.hour, basis: 'recorded' as const };
  const formatter = row.timezone ? timeFormatter(row.timezone) : assumedZone;
  if (!formatter) return undefined;
  const instant = new Date(row.occurredAt);
  if (!Number.isFinite(instant.getTime())) return undefined;
  const parts = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    date: parts.year + '-' + parts.month + '-' + parts.day,
    hour: Number(parts.hour),
    basis:
      row.timezone && !(row as AtlasListening).atlasPeriodId
        ? ('recorded' as const)
        : ('assumed' as const),
  };
}
export function chronos(rows: readonly LocalListening[], zone: string, year: number) {
  const formatter = zone ? timeFormatter(zone) : undefined;
  const hours = Array<number>(24).fill(0),
    weekdays = Array<number>(7).fill(0),
    days = new Map<string, number>(),
    seen = new Set<string>();
  let unknown = 0,
    assumed = 0,
    known = 0;
  for (const row of rows) {
    if (row.source === 'reference' || seen.has(row.id)) continue;
    seen.add(row.id);
    const point = temporalPoint(row, formatter);
    if (!point) {
      unknown++;
      continue;
    }
    if (!point.date.startsWith(String(year) + '-')) continue;
    const day = new Date(point.date + 'T00:00:00Z').getUTCDay();
    if (
      !Number.isInteger(day) ||
      !Number.isInteger(point.hour) ||
      point.hour < 0 ||
      point.hour > 23
    )
      continue;
    known++;
    if (point.basis === 'assumed') assumed++;
    hours[point.hour]++;
    weekdays[day]++;
    days.set(point.date, (days.get(point.date) ?? 0) + 1);
  }
  return { hours, weekdays, days, known, assumed, unknown };
}
