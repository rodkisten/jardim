import { describe, expect, it, vi } from 'vitest';
import { faith } from '../apps/api/src/faith';

const request = (path: string, fetcher: typeof fetch = fetch) =>
  faith(new URL('https://jardim.migos.club' + path), fetcher);

describe('faith API', () => {
  it('rejects invalid dates', async () => {
    const response = await request('/faith/2026-02-30');
    expect(response.status).toBe(400);
  });

  it('provides all five rosary mysteries for the selected weekday', async () => {
    const response = await request('/faith/rosary?date=2026-11-16');
    const body = (await response.json()) as {
      type: string;
      mysteries: string[];
      prayers: Record<string, string>;
    };
    expect(body.type).toBe('joyful');
    expect(body.mysteries).toHaveLength(5);
    expect(body.prayers.creed).toContain('Creio em Deus Pai');
  });

  it('returns partial data when external sources fail', async () => {
    const failing = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const response = await request('/faith?date=2026-11-15', failing);
    const body = (await response.json()) as {
      readings: { status: string };
      saints: { status: string };
      rosary: { mysteries: string[] };
    };
    expect(body.readings.status).toBe('unavailable');
    expect(body.saints.status).toBe('unavailable');
    expect(body.rosary.mysteries).toHaveLength(5);
  });

  it('rejects unknown routes', async () => {
    expect((await request('/faith/unknown')).status).toBe(404);
  });
});
