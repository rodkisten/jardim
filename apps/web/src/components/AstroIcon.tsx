const planets = {
  Sol: 'sun',
  Lua: 'moon',
  Mercúrio: 'mercury',
  Vênus: 'venus',
  Marte: 'mars',
  Júpiter: 'jupiter',
  Saturno: 'saturn',
  Urano: 'uranus',
  Netuno: 'neptune',
  Plutão: 'pluto',
} as const;
type Zodiac =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';
const aspects = {
  Conjunção: 'conjunction',
  Oposição: 'opposition',
  Trígono: 'trine',
  Quadratura: 'square',
  Sextil: 'sextile',
} as const;
export type AstroIconName =
  | `planets/${(typeof planets)[keyof typeof planets]}`
  | `zodiac/${Zodiac}`
  | `aspects/${(typeof aspects)[keyof typeof aspects]}`
  | 'mystical/crystals'
  | 'mystical/celestial-globe'
  | 'mystical/triple-moon'
  | 'mystical/oracle-book';
export function planetIcon(name: string): AstroIconName | undefined {
  const key = planets[name as keyof typeof planets];
  return key ? `planets/${key}` : undefined;
}
export function aspectIcon(name: string): AstroIconName | undefined {
  const key = aspects[name as keyof typeof aspects];
  return key ? `aspects/${key}` : undefined;
}
// Illustrated assets are intentionally deferred until the final pack arrives.
export function AstroIcon({
  size = 32,
  fallback = '✦',
}: {
  name?: AstroIconName;
  size?: number;
  fallback?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center align-middle text-violet-300"
      style={{ width: size, height: size }}
    >
      {fallback}
    </span>
  );
}
