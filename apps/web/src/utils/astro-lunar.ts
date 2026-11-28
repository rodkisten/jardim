import {
  Body,
  Illumination,
  MoonPhase,
  SearchMoonQuarter,
  NextMoonQuarter,
} from 'astronomy-engine';
const names = ['Nova', 'Quarto crescente', 'Cheia', 'Quarto minguante'];
const phases = [
  'Nova',
  'Crescente',
  'Quarto crescente',
  'Gibosa crescente',
  'Cheia',
  'Gibosa minguante',
  'Quarto minguante',
  'Minguante',
];
export function lunarState(date: Date) {
  const angle = MoonPhase(date);
  return {
    angle,
    phase: phases[Math.round(angle / 45) % 8],
    illumination: Illumination(Body.Moon, date).phase_fraction,
  };
}
export function lunarEvents(date: Date, count = 4) {
  let q = SearchMoonQuarter(date);
  return Array.from({ length: count }, (_, i) => {
    if (i) q = NextMoonQuarter(q);
    return { name: names[q.quarter], date: q.time.date };
  });
}
