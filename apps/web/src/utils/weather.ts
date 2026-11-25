import { z } from "@rodkisten/jardim-contracts";
export const City = z.object({
  label: z.string().min(1).max(180),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export const Cities = z.object({ cities: z.array(City) });
export const Forecast = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minimum: z.number(),
  maximum: z.number(),
  code: z.number(),
  rainChance: z.number().nullable(),
  retrievedAt: z.string(),
  source: z.literal('Open-Meteo'),
  kind: z.literal('forecast'),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
});
export const placeKey = 'jardim.city';
export function read(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}
export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Weather remains usable if preference storage is blocked. */
  }
}
export function condition(code: number) {
  return code >= 95
    ? 'Trovoadas'
    : code >= 71 && code <= 86
      ? 'Neve'
      : code >= 51
        ? 'Chuva'
        : code >= 45
          ? 'Neblina'
          : code >= 1
            ? 'Entre nuvens'
            : 'Céu aberto';
}

