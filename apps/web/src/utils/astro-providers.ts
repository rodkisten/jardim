import { calculateSky, aspectTypes } from './astro-engine';
export type SkyResult = ReturnType<typeof calculateSky>;
export interface AstroProvider {
  id: string;
  label: string;
  remote: boolean;
  sky(instant: string): Promise<SkyResult>;
}
export const localProvider: AstroProvider = {
  id: 'local',
  label: 'Astronomy Engine',
  remote: false,
  sky: async (instant) => calculateSky(instant),
};
export const astroProviders: readonly AstroProvider[] = [localProvider];
export function crossAspects(a: SkyResult, b: SkyResult) {
  return a.positions
    .flatMap((p) =>
      b.positions.flatMap((q) => {
        const distance = Math.abs(((p.longitude - q.longitude + 540) % 360) - 180);
        return aspectTypes
          .filter((t) => Math.abs(distance - t.angle) <= t.orb)
          .map((t) => ({
            ...t,
            a: p.name,
            b: q.name,
            from: p.longitude,
            to: q.longitude,
            deviation: Math.abs(distance - t.angle),
          }));
      }),
    )
    .sort((x, y) => x.deviation - y.deviation);
}
