import { createSignal } from 'solid-js';
import { z, type Memory } from '@rodkisten/jardim-contracts';
import type { GardenDB } from '@rodkisten/jardim-local-db';
import { fetchProtocol } from '@rodkisten/jardim-local-db/transport';
const Cities = z.object({
  cities: z.array(z.object({ label: z.string(), latitude: z.number(), longitude: z.number() })),
});
const Weather = z.object({
  temperature: z.number(),
  code: z.number(),
  isDay: z.boolean(),
  modelTime: z.string(),
  retrievedAt: z.string(),
  source: z.literal('Open-Meteo'),
  kind: z.literal('model_estimate'),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
});
function theme(code: number, isDay = true) {
  return !isDay
    ? '🌙'
    : code >= 95
      ? '⛈️'
      : code >= 51
        ? '🌧️'
        : code >= 45
          ? '🌫️'
          : code >= 1
            ? '☁️'
            : '☀️';
}
export function WeatherCard(props: { db: GardenDB; memories: Memory[]; onChanged: () => void }) {
  const [cities, setCities] = createSignal<z.infer<typeof Cities>['cities']>([]),
    [current, setCurrent] = createSignal<z.infer<typeof Weather> | null>(null),
    [place, setPlace] = createSignal(''),
    [busy, setBusy] = createSignal(false),
    [error, setError] = createSignal(''),
    [saved, setSaved] = createSignal(false);
  const today = () =>
    props.memories.filter(
      (memory) => new Date(memory.createdAt).toDateString() === new Date().toDateString(),
    );
  const recorded = () => today().find((memory) => memory.tags.includes('clima'));
  async function search(event: SubmitEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const query = String(new FormData(event.currentTarget as HTMLFormElement).get('city'));
      const response = await fetchProtocol('/v2/weather/search?q=' + encodeURIComponent(query));
      if (!response.ok) throw Error('Não foi possível buscar a cidade.');
      setCities(Cities.parse(await response.json()).cities);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha na busca.');
    } finally {
      setBusy(false);
    }
  }
  async function choose(city: z.infer<typeof Cities>['cities'][number]) {
    setBusy(true);
    setError('');
    try {
      const response = await fetchProtocol(
        `/v2/weather?latitude=${city.latitude}&longitude=${city.longitude}`,
      );
      if (!response.ok) throw Error('Clima indisponível agora.');
      setCurrent(Weather.parse(await response.json()));
      setPlace(city.label);
      setCities([]);
      setSaved(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Clima indisponível.');
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!current() || saved() || busy()) return;
    setBusy(true);
    try {
      const value = current()!;
      await props.db.plant({
        title: `${theme(value.code, value.isDay)} Clima · ${place()}`,
        body: `${value.temperature} °C · ${place()}\nEstimativa modelada atual, não uma medição de estação.\nFonte: Open-Meteo · https://open-meteo.com\n[clima:${JSON.stringify(value)}]`,
        tags: ['clima'],
      });
      setSaved(true);
      props.onChanged();
    } catch {
      setError('Não foi possível guardar o clima.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section class="composer day-card" aria-label="Card do dia">
      <p class="eyebrow">SEU DIA NO JARDIM</p>
      <h2>
        {current()
          ? theme(current()!.code, current()!.isDay)
          : recorded()?.title.slice(0, 2) || '🌱'}{' '}
        {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date())}
      </h2>
      <p>{today().length} registro(s) hoje</p>
      {recorded() && !current() ? <p>{recorded()!.body.split('\n')[0]}</p> : null}
      {current() ? (
        <>
          <p>
            {current()!.temperature} °C · {place()}
          </p>
          <p>
            Estimativa modelada · Open-Meteo ·{' '}
            {new Date(current()!.modelTime).toLocaleString('pt-BR')}
          </p>
          <button class="subtle" disabled={busy() || saved()} onClick={() => void save()}>
            {saved() ? 'Clima guardado' : 'Guardar clima deste dia'}
          </button>
        </>
      ) : null}
      <details>
        <summary>Escolher cidade e clima</summary>
        <p>O clima é consultado somente após você escolher uma cidade.</p>
        <form onSubmit={search}>
          <label for="weather-city">Cidade</label>
          <input
            id="weather-city"
            name="city"
            minlength={2}
            maxlength={80}
            required
            placeholder="Digite sua cidade"
          />
          <button class="subtle" disabled={busy()}>
            Buscar cidade
          </button>
        </form>
        {cities().map((city) => (
          <button class="subtle" disabled={busy()} onClick={() => void choose(city)}>
            {city.label}
          </button>
        ))}
        <p class="footnote">
          <a href="https://open-meteo.com" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{' '}
          · geocodificação GeoNames
        </p>
      </details>
      {error() ? <p role="alert">{error()}</p> : null}
    </section>
  );
}
