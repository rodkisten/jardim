import { integrationRequest } from './integrations';
import { z } from 'zod';
const response = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        admin1: z.string().optional(),
        country: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
        timezone: z.string(),
      }),
    )
    .optional(),
});
export type AstroCity = {
  id: number;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
};
export async function searchCities(query: string, signal: AbortSignal): Promise<AstroCity[]> {
  const data = await integrationRequest('/v2/discovery/cities?q=' + encodeURIComponent(query), {
    signal,
  });
  return (response.parse(data).results ?? []).map((c) => ({
    ...c,
    label: [c.name, c.admin1, c.country].filter(Boolean).join(', '),
  }));
}
export function historicalOffsets(date: string, time: string, zone: string): string[] {
  if (!date || !time || !zone) return [];
  try {
    const target = Date.parse(date + 'T' + time + ':00Z');
    if (!Number.isFinite(target)) return [];
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const local = (t: number) => {
      const parts = Object.fromEntries(fmt.formatToParts(t).map((p) => [p.type, p.value]));
      return Date.parse(
        parts.year +
          '-' +
          parts.month +
          '-' +
          parts.day +
          'T' +
          parts.hour +
          ':' +
          parts.minute +
          ':' +
          parts.second +
          'Z',
      );
    };
    const candidates = new Set<number>();
    for (let h = -48; h <= 48; h += 6) {
      const t = target + h * 3600000;
      candidates.add((local(t) - t) / 60000);
    }
    return [...candidates]
      .filter(
        (m) => Number.isInteger(m) && Math.abs(m) <= 840 && local(target - m * 60000) === target,
      )
      .sort((a, b) => a - b)
      .map(
        (m) =>
          (m < 0 ? '-' : '+') +
          String(Math.floor(Math.abs(m) / 60)).padStart(2, '0') +
          ':' +
          String(Math.abs(m) % 60).padStart(2, '0'),
      );
  } catch {
    return [];
  }
}
