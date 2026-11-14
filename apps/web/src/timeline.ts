import type { Memory } from '@rodkisten/jardim-contracts';
export type Period = 'all' | 'day' | 'week' | 'month' | 'year' | 'anniversary';
export const sources = {
  diary: 'Diário',
  youtube: 'YouTube',
  spotify: 'Spotify',
  culture: 'Cultura',
  weather: 'Clima',
} as const;
export type Source = keyof typeof sources;
export function memorySource(memory: Memory): Source {
  if (memory.tags.includes('youtube')) return 'youtube';
  if (memory.tags.includes('spotify')) return 'spotify';
  if (memory.tags.includes('cultura')) return 'culture';
  if (memory.tags.includes('clima')) return 'weather';
  return 'diary';
}
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
export function localDay(instant: string | Date, timeZone: string): string {
  let formatter = dateFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dateFormatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(new Date(instant));
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
const calendar = (day: string) => new Date(`${day}T12:00:00Z`);
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
function weekStart(day: string): string {
  const date = calendar(day);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return dayKey(date);
}
export function movePeriod(day: string, period: Period, direction: -1 | 1): string {
  const date = calendar(day),
    originalDay = date.getUTCDate();
  // Calendar arithmetic deliberately uses UTC on date-only values, avoiding DST-hour shifts.
  if (period === 'month' || period === 'year') {
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + direction * (period === 'year' ? 12 : 1));
    const end = new Date(date);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
    date.setUTCDate(Math.min(originalDay, end.getUTCDate()));
  } else date.setUTCDate(originalDay + direction * (period === 'week' ? 7 : 1));
  return date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999 ? day : dayKey(date);
}
export function selectMemories(
  memories: Memory[],
  options: {
    period: Period;
    anchor: string;
    source: 'all' | Source;
    query: string;
    timeZone: string;
  },
): Memory[] {
  const { period, anchor, source, timeZone } = options;
  const query = options.query.trim().toLocaleLowerCase('pt-BR');
  return memories
    .filter((memory) => {
      if (source !== 'all' && memorySource(memory) !== source) return false;
      if (
        !`${memory.title} ${memory.body} ${memory.tags.join(' ')}`
          .toLocaleLowerCase('pt-BR')
          .includes(query)
      )
        return false;
      if (period === 'all') return true;
      const day = localDay(memory.createdAt, timeZone);
      if (period === 'day') return day === anchor;
      if (period === 'week') return weekStart(day) === weekStart(anchor);
      if (period === 'month') return day.slice(0, 7) === anchor.slice(0, 7);
      if (period === 'year') return day.slice(0, 4) === anchor.slice(0, 4);
      // Anniversaries show documented dates in earlier years, never infer Feb 29 as Feb 28.
      if (period === 'anniversary')
        return day.slice(5) === anchor.slice(5) && day.slice(0, 4) < anchor.slice(0, 4);
      return true;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
}
export function groupMemories(memories: Memory[], timeZone: string, grouping: 'day' | 'source') {
  const groups = new Map<string, { key: string; label: string; memories: Memory[] }>();
  for (const memory of memories) {
    const day = localDay(memory.createdAt, timeZone);
    const key = grouping === 'source' ? memorySource(memory) : day;
    if (!groups.has(key))
      groups.set(key, {
        key,
        label:
          grouping === 'source'
            ? sources[memorySource(memory)]
            : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(
                calendar(day),
              ),
        memories: [],
      });
    groups.get(key)!.memories.push(memory);
  }
  return [...groups.values()];
}
