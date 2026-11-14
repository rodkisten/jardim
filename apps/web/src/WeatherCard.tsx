import { createEffect, createSignal, onCleanup } from 'solid-js';
import { z, type Memory } from '@rodkisten/jardim-contracts';
import type { GardenDB } from '@rodkisten/jardim-local-db';
import { fetchProtocol } from '@rodkisten/jardim-local-db/transport';
import { localDay } from './timeline';
const City = z.object({
  label: z.string().min(1).max(180),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
const Cities = z.object({ cities: z.array(City) });
const Forecast = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minimum: z.number(),
  maximum: z.number(),
  code: z.number(),
  rainChance: z.number().nullable(),
  retrievedAt: z.string(),
  source: z.literal('Open-Meteo'),
  kind: z.literal('forecast'),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
});
const placeKey = 'jardim.city';
function read(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Weather remains usable if preference storage is blocked. */
  }
}
function condition(code: number) {
  return code >= 95
    ? 'Trovoadas'
    : code >= 71 && code <= 86
      ? 'Neve'
      : code >= 51
        ? 'Chuva'
        : code >= 45
          ? 'Neblina'
          : code >= 1
            ? 'Entre nuvens'
            : 'Céu aberto';
}
export function WeatherCard(props: { db: GardenDB; memories: Memory[]; onChanged: () => void }) {
  const initial = City.safeParse(read(placeKey));
  const cached = Forecast.safeParse(read('jardim.weather'));
  const [city, setCity] = createSignal<z.infer<typeof City> | null>(
      initial.success ? initial.data : null,
    ),
    [cities, setCities] = createSignal<z.infer<typeof City>[]>([]),
    [current, setCurrent] = createSignal<z.infer<typeof Forecast> | null>(
      initial.success &&
        cached.success &&
        initial.data.latitude === cached.data.latitude &&
        initial.data.longitude === cached.data.longitude
        ? cached.data
        : null,
    ),
    [busy, setBusy] = createSignal(false),
    [error, setError] = createSignal(''),
    [saved, setSaved] = createSignal(''),
    [clock, setClock] = createSignal(new Date());
  let selectedCity = initial.success ? initial.data : null,
    sequence = 0,
    disposed = false,
    inFlight = false;
  const zone = () => current()?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const day = () => localDay(clock(), zone());
  const today = () =>
    props.memories.filter((memory) => localDay(memory.createdAt, zone()) === day());
  const recorded = () => today().some((memory) => memory.tags.includes('clima'));
  async function refresh(place = selectedCity, force = false) {
    if (!place || inFlight || disposed || !navigator.onLine) return;
    const previous = current();
    if (
      !force &&
      previous &&
      previous.date === localDay(new Date(), previous.timezone) &&
      Date.now() - Date.parse(previous.retrievedAt) < 3 * 3600000
    )
      return;
    const request = sequence;
    inFlight = true;
    setBusy(true);
    try {
      const response = await fetchProtocol(
        `/v2/weather?latitude=${place.latitude}&longitude=${place.longitude}`,
      );
      if (!response.ok) throw Error('Previsão indisponível. A cidade continua salva.');
      const forecast = Forecast.parse(await response.json());
      if (disposed || request !== sequence) return;
      setCurrent(forecast);
      write('jardim.weather', forecast);
      setError('');
    } catch (error) {
      if (!disposed) setError(error instanceof Error ? error.message : 'Previsão indisponível.');
    } finally {
      inFlight = false;
      if (!disposed) setBusy(false);
    }
  }
  async function syncCity(place: z.infer<typeof City>) {
    const response = await fetchProtocol('/v2/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: place }),
    });
    if (!response.ok)
      throw Error('Cidade salva neste dispositivo. Ela será sincronizada ao reconectar.');
    write('jardim.city.pending', false);
  }
  async function restore() {
    const request = sequence;
    try {
      if (selectedCity && read('jardim.city.pending')) await syncCity(selectedCity);
      const response = await fetchProtocol('/v2/preferences');
      if (!response.ok) return;
      const settings = z.object({ city: City.nullable().optional() }).parse(await response.json());
      if (disposed || sequence !== request) return;
      const changed =
        !!settings.city &&
        (settings.city.latitude !== selectedCity?.latitude ||
          settings.city.longitude !== selectedCity?.longitude);
      if (settings.city) {
        if (changed) setCurrent(null);
        selectedCity = settings.city;
        setCity(settings.city);
        write(placeKey, settings.city);
      }
      await refresh(selectedCity, changed);
    } catch {
      /* The last saved city and forecast remain available offline. */
    }
  }
  void restore();
  // Reuse a previously saved weather memory when upgrading from the city-less preference version.
  createEffect(
    () => props.memories.find((memory) => memory.tags.includes('clima')),
    (memory) => {
      if (selectedCity || !memory) return;
      try {
        const raw = JSON.parse(memory.body.match(/\[clima:(.*)\]/)?.[1] || 'null');
        const place = City.parse({
          label: memory.title.replace(/^.*Clima · /, ''),
          latitude: raw.latitude,
          longitude: raw.longitude,
        });
        void choose(place);
      } catch {
        /* A legacy note without coordinates cannot safely infer a city. */
      }
    },
  );
  const reconnect = () => {
    void restore();
  };
  const visible = () => {
    if (document.visibilityState === 'visible') {
      setClock(new Date());
      void refresh();
    }
  };
  window.addEventListener('online', reconnect);
  document.addEventListener('visibilitychange', visible);
  const timer = setInterval(() => {
    setClock(new Date());
    void refresh();
  }, 60000);
  onCleanup(() => {
    disposed = true;
    window.removeEventListener('online', reconnect);
    document.removeEventListener('visibilitychange', visible);
    clearInterval(timer);
  });
  async function search(event: SubmitEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const query = String(new FormData(event.currentTarget as HTMLFormElement).get('city'));
    try {
      const response = await fetchProtocol('/v2/weather/search?q=' + encodeURIComponent(query));
      if (!response.ok) throw Error('Não foi possível buscar a cidade.');
      setCities(Cities.parse(await response.json()).cities);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha na busca.');
    } finally {
      setBusy(false);
    }
  }
  async function choose(place: z.infer<typeof City>) {
    sequence++;
    selectedCity = place;
    setCity(place);
    setCurrent(null);
    setCities([]);
    setSaved('');
    write(placeKey, place);
    write('jardim.city.pending', true);
    try {
      await syncCity(place);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Cidade salva somente neste dispositivo.');
    }
    await refresh(place, true);
  }
  async function save() {
    const value = current();
    if (!value || saved() === value.date || busy() || value.date !== day()) return;
    setBusy(true);
    try {
      await props.db.plant({
        title: `Clima · ${city()?.label}`,
        body: `${value.minimum}–${value.maximum} °C · ${city()?.label}\n${condition(value.code)} · Previsão para ${value.date}\nFonte: Open-Meteo · https://open-meteo.com\n[clima:${JSON.stringify(value)}]`,
        tags: ['clima'],
      });
      setSaved(value.date);
      props.onChanged();
    } catch {
      setError('Não foi possível guardar a previsão.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      class="day-card"
      aria-label="Card do dia"
      data-weather={current() ? condition(current()!.code) : 'none'}
    >
      <div class="day-heading">
        <p class="eyebrow">HOJE</p>
        <p>
          {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: zone() }).format(
            clock(),
          )}
        </p>
      </div>
      <h2>
        {today().length
          ? `${today().length} memória${today().length === 1 ? '' : 's'} de hoje.`
          : 'Um dia para lembrar.'}
      </h2>
      {city() ? (
        <p class="weather-place">{city()!.label}</p>
      ) : (
        <p>Escolha sua cidade uma vez para acompanhar a previsão do dia.</p>
      )}
      {current() ? (
        <>
          <div class="weather-values">
            <strong>
              {Math.round(current()!.minimum)}° <span>/</span> {Math.round(current()!.maximum)}°
            </strong>
            <span>
              {condition(current()!.code)}
              {current()!.rainChance !== null
                ? ` · ${current()!.rainChance}% de chance de chuva`
                : ''}
            </span>
          </div>
          <p class="footnote">
            {current()!.date === day()
              ? 'Previsão do dia'
              : `Última previsão salva · ${current()!.date}`}{' '}
            · {current()!.timezone} · Open-Meteo
          </p>
          <button class="subtle" disabled={busy()} onClick={() => void refresh(selectedCity, true)}>
            Atualizar previsão
          </button>
          <button
            class="subtle"
            disabled={busy() || saved() === day() || recorded() || current()!.date !== day()}
            onClick={() => void save()}
          >
            {saved() === day() || recorded() ? 'Previsão guardada' : 'Guardar previsão'}
          </button>
        </>
      ) : null}
      <details>
        <summary>{city() ? 'Trocar cidade' : 'Escolher cidade'}</summary>
        <form onSubmit={search}>
          <label for="weather-city">Cidade</label>
          <input
            id="weather-city"
            name="city"
            minlength={2}
            maxlength={80}
            required
            placeholder="Buscar cidade"
          />
          <button class="subtle" disabled={busy()}>
            Buscar cidade
          </button>
        </form>
        {cities().map((place) => (
          <button class="city-option" disabled={busy()} onClick={() => void choose(place)}>
            {place.label}
          </button>
        ))}
        <p class="footnote">
          Cidade salva na sua conta e neste dispositivo. Dados de{' '}
          <a href="https://open-meteo.com" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{' '}
          / GeoNames.
        </p>
      </details>
      {error() ? <p role="status">{error()}</p> : null}
    </section>
  );
}
