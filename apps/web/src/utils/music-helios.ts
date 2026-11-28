import { Body, Observer, Equator, Horizon } from 'astronomy-engine';
import type { AtlasPeriod } from './music-atlas';
import type { LocalListening } from './music-insights-local';
export function solarAltitude(date: Date, latitude: number, longitude: number) {
  const observer = new Observer(latitude, longitude, 0);
  const equ = Equator(Body.Sun, date, observer, true, true);
  return Horizon(date, observer, equ.ra, equ.dec).altitude;
}
export function solarPhase(altitude: number, limits: readonly number[] = [-18, -6, -4, 6]) {
  if (altitude < limits[0]) return 'Noite';
  if (altitude < limits[1]) return 'Crepúsculo';
  if (altitude < limits[2]) return 'Hora azul';
  if (altitude < limits[3]) return 'Faixa dourada';
  return 'Dia';
}
export function solarProfile(
  rows: readonly LocalListening[],
  periods: readonly AtlasPeriod[],
  artistId: string,
  limits: readonly number[] = [-18, -6, -4, 6],
) {
  const sorted = [...periods].sort((a, b) => a.from.localeCompare(b.from));
  const counts = new Map<string, number>(),
    seen = new Set<string>();
  let known = 0,
    unknown = 0;
  for (const row of rows) {
    if (
      row.source === 'reference' ||
      seen.has(row.id) ||
      (artistId && !row.artistIds.includes(artistId))
    )
      continue;
    seen.add(row.id);
    const t = Date.parse(row.occurredAt);
    let lo = 0,
      hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (Date.parse(sorted[mid].from) <= t) lo = mid + 1;
      else hi = mid;
    }
    const p = sorted[lo - 1];
    if (
      !Number.isFinite(t) ||
      !p ||
      t >= Date.parse(p.to) ||
      p.latitude === undefined ||
      p.longitude === undefined
    ) {
      unknown++;
      continue;
    }
    try {
      const altitude = solarAltitude(new Date(t), p.latitude, p.longitude);
      if (!Number.isFinite(altitude)) {
        unknown++;
        continue;
      }
      const phase = solarPhase(altitude, limits);
      counts.set(phase, (counts.get(phase) ?? 0) + 1);
      known++;
    } catch {
      unknown++;
    }
  }
  return { counts, known, unknown };
}
