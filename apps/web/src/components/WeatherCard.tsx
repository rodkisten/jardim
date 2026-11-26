import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from '@rodkisten/jardim-contracts';
import { Button, Card, CardContent, Input } from '@rodkisten/girassol/react';
import { CloudSun } from 'lucide-react';
import { City, Cities, Forecast, read, write, condition, placeKey } from '../utils/weather';
import { integrationRequest } from '../utils/integrations';
import { localDay } from '../utils/timeline';
import { db } from '../utils/db';
import { useMemories } from '../hooks/useMemories';
type Place = z.infer<typeof City>;
export function WeatherCard() {
  const [city, setCity] = useState<Place | null>(() => {
      const parsed = City.safeParse(read(placeKey));
      return parsed.success ? parsed.data : null;
    }),
    [q, setQ] = useState(''),
    [message, setMessage] = useState('');
  const memories = useMemories();
  const forecast = useQuery({
    queryKey: ['weather', city?.latitude, city?.longitude],
    enabled: !!city,
    queryFn: async () => {
      if (!city) throw new Error('Escolha uma cidade.');
      const value = Forecast.parse(
        await integrationRequest(
          '/v2/weather?latitude=' + city.latitude + '&longitude=' + city.longitude,
        ),
      );
      write('jardim.weather', value);
      return value;
    },
    initialData: () => {
      const cached = Forecast.safeParse(read('jardim.weather'));
      return cached.success &&
        cached.data.latitude === city?.latitude &&
        cached.data.longitude === city?.longitude
        ? cached.data
        : undefined;
    },
    initialDataUpdatedAt: () => {
      const cached = Forecast.safeParse(read('jardim.weather'));
      return cached.success ? Date.parse(cached.data.retrievedAt) : 0;
    },
    staleTime: 3 * 3600000,
    refetchInterval: 60000,
    retry: false,
  });
  const search = useMutation({
    mutationFn: async () =>
      Cities.parse(await integrationRequest('/v2/weather/search?q=' + encodeURIComponent(q))),
  });
  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const pending = read('jardim.city.pending');
        const local = City.safeParse(read(placeKey));
        if (pending && local.success) {
          await integrationRequest('/v2/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city: local.data }),
          });
          if (JSON.stringify(read(placeKey)) === JSON.stringify(local.data))
            write('jardim.city.pending', false);
          return;
        }
        const data = z
          .object({ city: City.nullable().optional() })
          .parse(await integrationRequest('/v2/preferences'));
        if (active && data.city && !read('jardim.city.pending')) {
          setCity(data.city);
          write(placeKey, data.city);
        }
      } catch {
        /* Optional operation failed; retain the existing local state. */
      }
    }
    void restore();
    window.addEventListener('online', restore);
    return () => {
      active = false;
      window.removeEventListener('online', restore);
    };
  }, []);
  const choose = useMutation({
    mutationFn: async (place: Place) => {
      setCity(place);
      write(placeKey, place);
      write('jardim.city.pending', true);
      await integrationRequest('/v2/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: place }),
      });
      if (JSON.stringify(read(placeKey)) === JSON.stringify(place))
        write('jardim.city.pending', false);
    },
  });
  const value = forecast.data,
    day = localDay(new Date(), value?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const recorded = memories.memories.some(
    (m) =>
      m.tags.includes('clima') &&
      localDay(m.createdAt, value?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone) ===
        day,
  );
  const save = useMutation({
    mutationFn: async () => {
      if (!value || !city || value.date !== day || recorded) return;
      await db.plant({
        title: 'Clima · ' + city.label,
        body:
          value.minimum +
          '–' +
          value.maximum +
          ' °C · ' +
          city.label +
          '\n' +
          condition(value.code) +
          ' · Previsão para ' +
          value.date +
          '\nFonte: Open-Meteo · https://open-meteo.com\n[clima:' +
          JSON.stringify(value) +
          ']',
        tags: ['clima'],
      });
    },
    onSuccess: () => setMessage('Previsão guardada.'),
  });
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <CloudSun className="size-5 text-primary" />
          <h2 className="font-semibold">{city?.label || 'Clima do dia'}</h2>
        </div>
        {value && (
          <>
            <p className="text-3xl font-semibold">
              {Math.round(value.minimum)}° / {Math.round(value.maximum)}°
            </p>
            <p className="text-sm">
              {condition(value.code)}
              {value.rainChance !== null ? ' · ' + value.rainChance + '% de chuva' : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              {value.date === day ? 'Previsão do dia' : 'Última previsão · ' + value.date} ·
              Open-Meteo
            </p>
            <Button
              variant="outline"
              disabled={forecast.isFetching}
              onClick={() => void forecast.refetch()}
            >
              Atualizar
            </Button>
            <Button
              disabled={recorded || save.isPending || value.date !== day}
              onClick={() => save.mutate()}
            >
              {recorded ? 'Previsão guardada' : 'Guardar previsão'}
            </Button>
          </>
        )}
        <details>
          <summary className="text-sm text-primary">
            {city ? 'Trocar cidade' : 'Escolher cidade'}
          </summary>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              search.mutate();
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              minLength={2}
              maxLength={80}
              required
              placeholder="Buscar cidade"
            />
            <Button disabled={search.isPending}>Buscar</Button>
          </form>
          {search.data?.cities.map((place) => (
            <Button
              key={place.latitude + ':' + place.longitude}
              variant="ghost"
              disabled={choose.isPending}
              onClick={() => choose.mutate(place)}
            >
              {place.label}
            </Button>
          ))}
        </details>
        {message && <p role="status">{message}</p>}
        {[forecast.error, search.error, choose.error, save.error]
          .filter(Boolean)
          .map((error, i) => (
            <p key={i} role="alert" className="text-xs">
              {error?.message}
            </p>
          ))}
      </CardContent>
    </Card>
  );
}
