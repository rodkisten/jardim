import { Body, GeoVector, Ecliptic, MoonPhase, Illumination } from 'astronomy-engine';
export const signs = [
  'Áries',
  'Touro',
  'Gêmeos',
  'Câncer',
  'Leão',
  'Virgem',
  'Libra',
  'Escorpião',
  'Sagitário',
  'Capricórnio',
  'Aquário',
  'Peixes',
] as const;
export const glyphs = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const bodies = [
  [Body.Sun, 'Sol', '☉'],
  [Body.Moon, 'Lua', '☽'],
  [Body.Mercury, 'Mercúrio', '☿'],
  [Body.Venus, 'Vênus', '♀'],
  [Body.Mars, 'Marte', '♂'],
  [Body.Jupiter, 'Júpiter', '♃'],
  [Body.Saturn, 'Saturno', '♄'],
  [Body.Uranus, 'Urano', '♅'],
  [Body.Neptune, 'Netuno', '♆'],
  [Body.Pluto, 'Plutão', '♇'],
] as const;
const norm = (n: number) => ((n % 360) + 360) % 360;
export function calculateSky(instant: string) {
  const date = new Date(instant);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() < 1600 ||
    date.getUTCFullYear() > 2200
  )
    throw Error('Data fora do intervalo suportado (1600–2200).');
  const positions = bodies.map(([body, name, glyph]) => {
    const longitude = norm(Ecliptic(GeoVector(body, date, true)).elon);
    const before = norm(Ecliptic(GeoVector(body, new Date(date.getTime() - 43200000), true)).elon);
    const after = norm(Ecliptic(GeoVector(body, new Date(date.getTime() + 43200000), true)).elon);
    const speed = norm(after - before + 180) - 180;
    return {
      name,
      glyph,
      longitude,
      speed,
      retrograde: speed < -0.0001,
      sign: signs[Math.floor(longitude / 30)],
      degree: longitude % 30,
    };
  });
  const phase = MoonPhase(date);
  return {
    positions,
    aspects: findAspects(positions),
    phase,
    illumination: Illumination(Body.Moon, date).phase_fraction,
  };
}

export const aspectTypes = [
  { name: 'Conjunção', glyph: '☌', angle: 0, orb: 8, color: '#c4a5f5' },
  { name: 'Sextil', glyph: '⚹', angle: 60, orb: 4, color: '#94b3ca' },
  { name: 'Quadratura', glyph: '□', angle: 90, orb: 6, color: '#d18ba8' },
  { name: 'Trígono', glyph: '△', angle: 120, orb: 6, color: '#9ac7ad' },
  { name: 'Oposição', glyph: '☍', angle: 180, orb: 8, color: '#d18ba8' },
] as const;
export function findAspects(positions: readonly { name: string; longitude: number }[]) {
  return positions
    .flatMap((a, i) =>
      positions.slice(i + 1).flatMap((b) => {
        const distance = Math.abs(norm(a.longitude - b.longitude + 180) - 180);
        return aspectTypes
          .filter((t) => Math.abs(distance - t.angle) <= t.orb)
          .map((t) => ({
            ...t,
            a: a.name,
            b: b.name,
            from: a.longitude,
            to: b.longitude,
            deviation: Math.abs(distance - t.angle),
          }));
      }),
    )
    .sort((a, b) => a.deviation - b.deviation);
}
