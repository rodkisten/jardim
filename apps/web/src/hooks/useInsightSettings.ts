import { useSyncExternalStore } from 'react';
import { z } from 'zod';
export const insightSections = [
  'metadata',
  'atlas',
  'atmosphere',
  'helios',
  'sophia',
  'discoveries',
  'constellations',
  'chronos',
  'explorer',
] as const;
export type InsightSection = (typeof insightSections)[number];
const orderSchema = z
  .array(z.enum(insightSections))
  .length(insightSections.length)
  .refine((v) => new Set(v).size === insightSections.length);
const solarSchema = z
  .tuple([
    z.number().min(-90).max(90),
    z.number().min(-90).max(90),
    z.number().min(-90).max(90),
    z.number().min(-90).max(90),
  ])
  .refine((v) => v.every((n, i) => i === 0 || n > v[i - 1]));
const schema = z.object({
  sections: z.object({
    metadata: z.boolean().default(true),
    atlas: z.boolean().default(true),
    atmosphere: z.boolean().default(true),
    helios: z.boolean().default(true),
    sophia: z.boolean().default(true),
    discoveries: z.boolean().default(true),
    constellations: z.boolean().default(true),
    chronos: z.boolean().default(true),
    explorer: z.boolean().default(true),
  }),
  moodHours: z.number().int().min(1).max(24).default(3),
  entityMin: z.number().int().min(5).max(100).default(10),
  baselineMin: z.number().int().min(10).max(500).default(30),
  contextMin: z.number().int().min(3).max(100).default(5),
  liftMin: z.number().min(1).max(5).default(1.5),
  differenceMin: z.number().int().min(1).max(100).default(10),
  nodeMin: z.number().int().min(3).max(100).default(5),
  sharedMin: z.number().int().min(1).max(4).default(2),
  similarityMin: z.number().int().min(0).max(100).default(65),
  neighborLimit: z.number().int().min(1).max(20).default(8),
  order: orderSchema.default([...insightSections]),
  density: z.enum(['compact', 'comfortable']).default('comfortable'),
  solar: solarSchema.default([-18, -6, -4, 6]),
  chronosZone: z
    .string()
    .max(100)
    .refine((v) => {
      try {
        if (v) new Intl.DateTimeFormat('en', { timeZone: v });
        return true;
      } catch {
        return false;
      }
    })
    .default(''),
  sophiaModel: z.enum(['advanced', 'fast']).default('advanced'),
  sophiaAI: z.boolean().default(true),
  sophiaLimit: z.number().int().min(1).max(100).default(20),
  slowBpm: z.number().int().min(1).max(500).default(90),
  historyLimit: z.number().int().min(5).max(500),
  hemisphere: z.enum(['', 'north', 'south']),
});
const defaults = schema.parse({ sections: {}, historyLimit: 30, hemisphere: '' });
export type InsightSettings = z.infer<typeof schema>;
const key = 'jardim.insights.settings.v1';
function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null');
    return schema.parse(raw);
  } catch {
    return defaults;
  }
}
let current = read();
const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
if (typeof window !== 'undefined')
  window.addEventListener('storage', (e) => {
    if (e.key === key || e.key === null) {
      current = read();
      listeners.forEach((fn) => fn());
    }
  });
export function updateInsights(next: InsightSettings) {
  const parsed = schema.parse(next);
  localStorage.setItem(key, JSON.stringify(parsed));
  current = parsed;
  listeners.forEach((fn) => fn());
}
export function exportInsightSettings() {
  return JSON.stringify(
    { format: 'jardim-insights-settings', version: 1, settings: current },
    null,
    2,
  );
}
export function importInsightSettings(raw: unknown) {
  const envelope = z
    .object({
      format: z.literal('jardim-insights-settings'),
      version: z.literal(1),
      settings: schema,
    })
    .parse(raw);
  updateInsights(envelope.settings);
}
export function resetInsights() {
  updateInsights(defaults);
}
export function useInsightSettings() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => defaults,
  );
}
