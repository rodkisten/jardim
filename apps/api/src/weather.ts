import { z } from '@rodkisten/jardim-contracts';
import { externalJson } from './external';
export async function weather(url: URL, fetcher: typeof fetch = fetch) {
  if (url.pathname.endsWith('/search')) {
    const query = (url.searchParams.get('q') || '').trim();
    if (query.length < 2 || query.length > 80)
      return Response.json({ error: 'Digite uma cidade com 2 a 80 caracteres.' }, { status: 400 });
    const data = z
      .object({
        results: z
          .array(
            z.object({
              name: z.string(),
              latitude: z.number(),
              longitude: z.number(),
              country: z.string().optional(),
              admin1: z.string().optional(),
            }),
          )
          .max(10)
          .optional(),
      })
      .parse(
        await externalJson(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=pt&format=json`,
          {},
          fetcher,
        ),
      );
    return Response.json({
      cities: (data.results || []).map((city) => ({
        label: [city.name, city.admin1, city.country].filter(Boolean).join(', '),
        latitude: city.latitude,
        longitude: city.longitude,
      })),
    });
  }
  const latitude = Number(url.searchParams.get('latitude')),
    longitude = Number(url.searchParams.get('longitude'));
  if (
    !url.searchParams.has('latitude') ||
    !url.searchParams.has('longitude') ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return Response.json({ error: 'Localização inválida' }, { status: 400 });
  const data = z
    .object({
      current: z.object({
        time: z.string(),
        temperature_2m: z.number(),
        weather_code: z.number().int(),
        is_day: z.number().int(),
      }),
      timezone: z.string(),
    })
    .parse(
      await externalJson(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&timezone=UTC`,
        {},
        fetcher,
      ),
    );
  return Response.json({
    temperature: data.current.temperature_2m,
    code: data.current.weather_code,
    isDay: data.current.is_day === 1,
    modelTime: data.current.time + 'Z',
    retrievedAt: new Date().toISOString(),
    source: 'Open-Meteo',
    kind: 'model_estimate',
    latitude,
    longitude,
    timezone: 'UTC',
  });
}
