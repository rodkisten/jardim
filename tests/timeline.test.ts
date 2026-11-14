import { expect, test } from 'vitest';
import type { Memory } from '@rodkisten/jardim-contracts';
import {
  groupMemories,
  localDay,
  memorySource,
  movePeriod,
  selectMemories,
  type Period,
} from '../apps/web/src/timeline';
const memory = (id: string, createdAt: string, tags: string[] = []): Memory => ({
  id,
  createdAt,
  tags,
  title: id,
  body: 'Uma memória',
});
const all = [
  memory('segunda', '2026-11-09T12:00:00Z'),
  memory('domingo', '2026-11-16T02:59:59Z', ['spotify']),
  memory('seguinte', '2026-11-16T03:00:00Z', ['cultura']),
  memory('antes', '2026-11-08T12:00:00Z', ['youtube']),
  memory('aniversario', '2025-11-13T12:00:00Z', ['clima']),
  memory('futuro', '2027-11-13T12:00:00Z'),
];
const options = (period: Period) => ({
  period,
  anchor: '2026-11-13',
  source: 'all' as const,
  query: '',
  timeZone: 'America/Sao_Paulo',
});
test('date boundaries use the supplied timezone, including midnight and DST', () => {
  expect(localDay('2026-11-14T02:59:59Z', 'America/Sao_Paulo')).toBe('2026-11-13');
  expect(localDay('2026-11-14T03:00:00Z', 'America/Sao_Paulo')).toBe('2026-11-14');
  expect(localDay('2026-03-08T07:00:00Z', 'America/New_York')).toBe('2026-03-08');
  expect(localDay('2026-11-14T02:00:00Z', 'Asia/Tokyo')).toBe('2026-11-14');
});
test('weeks are Monday through Sunday and can cross calendar years', () => {
  expect(selectMemories(all, options('week')).map((m) => m.id)).toEqual(['domingo', 'segunda']);
  expect(
    selectMemories(
      [
        memory('dez', '2026-12-31T12:00:00Z'),
        memory('jan', '2027-01-03T12:00:00Z'),
        memory('fora', '2027-01-04T12:00:00Z'),
      ],
      { ...options('week'), anchor: '2027-01-01' },
    ).map((m) => m.id),
  ).toEqual(['jan', 'dez']);
});
test('month and year selection combine search and mutually exclusive source classification', () => {
  expect(selectMemories(all, options('month'))).toHaveLength(4);
  expect(selectMemories(all, options('year'))).toHaveLength(4);
  expect(selectMemories(all, { ...options('all'), source: 'diary' }).map((m) => m.id)).toEqual([
    'futuro',
    'segunda',
  ]);
  expect(
    selectMemories(all, { ...options('month'), source: 'spotify', query: ' MÚSICA ' }),
  ).toHaveLength(0);
  expect(
    selectMemories(all, { ...options('month'), source: 'spotify', query: 'SPOTIFY' }).map(
      (m) => m.id,
    ),
  ).toEqual(['domingo']);
  expect(memorySource(all[2])).toBe('culture');
  expect(memorySource(all[4])).toBe('weather');
});
test('on this day only includes previous years, with exact leap-day anniversaries', () => {
  expect(selectMemories(all, options('anniversary')).map((m) => m.id)).toEqual(['aniversario']);
  const leap = [memory('bissexto', '2024-02-29T12:00:00Z')];
  expect(selectMemories(leap, { ...options('anniversary'), anchor: '2026-02-28' })).toEqual([]);
  expect(selectMemories(leap, { ...options('anniversary'), anchor: '2028-02-29' })).toHaveLength(1);
});
test('period navigation clamps month ends and leap years without timezone-hour arithmetic', () => {
  expect(movePeriod('9999-12-31', 'day', 1)).toBe('9999-12-31');
  expect(movePeriod('0001-01-01', 'year', -1)).toBe('0001-01-01');
  expect(movePeriod('2026-01-31', 'month', 1)).toBe('2026-02-28');
  expect(movePeriod('2024-02-29', 'year', 1)).toBe('2025-02-28');
  expect(movePeriod('2026-01-01', 'week', -1)).toBe('2025-12-25');
  expect(movePeriod('2026-03-08', 'day', 1)).toBe('2026-03-09');
});
test('grouping uses local days and source labels and preserves descending instants', () => {
  const sorted = selectMemories(all, options('all'));
  const groups = groupMemories(sorted, 'America/Sao_Paulo', 'day');
  expect(groups[0].key).toBe('2027-11-13');
  expect(groups.find((g) => g.key === '2026-11-15')!.memories.map((m) => m.id)).toEqual([
    'domingo',
  ]);
  const bySource = groupMemories(sorted, 'America/Sao_Paulo', 'source');
  expect(bySource.find((g) => g.key === 'spotify')!.label).toBe('Spotify');
  expect(bySource.flatMap((g) => g.memories)).toHaveLength(all.length);
  expect(groupMemories([], 'UTC', 'day')).toEqual([]);
  expect(
    selectMemories(
      [memory('inteiro', '2026-11-13T12:00:00Z'), memory('fracao', '2026-11-13T12:00:00.100Z')],
      options('all'),
    ).map((m) => m.id),
  ).toEqual(['fracao', 'inteiro']);
});
