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
      timezone: z.string(),
      daily: z.object({
        time: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
        temperature_2m_min: z.array(z.number()).min(1),
        temperature_2m_max: z.array(z.number()).min(1),
        weather_code: z.array(z.number().int()).min(1),
        precipitation_probability_max: z.array(z.number().min(0).max(100).nullable()).min(1),
      }),
    })
    .parse(
      await externalJson(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=1`,
        {},
        fetcher,
      ),
    );
  return Response.json({
    date: data.daily.time[0],
    minimum: data.daily.temperature_2m_min[0],
    maximum: data.daily.temperature_2m_max[0],
    code: data.daily.weather_code[0],
    rainChance: data.daily.precipitation_probability_max[0],
    retrievedAt: new Date().toISOString(),
    source: 'Open-Meteo',
    kind: 'forecast',
    latitude,
    longitude,
    timezone: data.timezone,
  });
}
