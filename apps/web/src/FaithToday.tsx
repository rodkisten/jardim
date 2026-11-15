import { createEffect, createSignal, For, Show } from 'solid-js';
import './FaithToday.css';

type Entry = Record<string, unknown>;
type FaithData = {
  date: string;
  calendar: { status: string; celebration?: unknown; color?: unknown; liturgicalSeason?: unknown };
  readings: { status: string; items?: unknown };
  saints: { status: string; items?: { name?: unknown; image?: unknown; biography?: unknown; prayer?: unknown }[] };
  rosary: { type: string; mysteries: string[]; prayers: Record<string, string> };
};
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const rosaryNames: Record<string, string> = { joyful: 'Gozosos', sorrowful: 'Dolorosos', glorious: 'Gloriosos', luminous: 'Luminosos' };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
async function loadFaith(date: string): Promise<FaithData> {
  const response = await fetch('/faith/' + encodeURIComponent(date), { credentials: 'same-origin' });
  if (!response.ok) throw Error('Não foi possível carregar a fé de hoje.');
  return response.json() as Promise<FaithData>;
}
function readings(items: unknown): { label: string; content: string }[] {
  if (!items || typeof items !== 'object') return [];
  return Object.entries(items).flatMap(([label, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => {
      if (typeof item === 'string') return { label, content: item };
      if (!item || typeof item !== 'object') return { label, content: '' };
      const entry = item as Entry;
      return { label: text(entry.titulo) || text(entry.referencia) || label, content: text(entry.texto) || text(entry.conteudo) };
    }).filter((entry) => entry.content);
  });
}
export function FaithToday() {
  const [date, setDate] = createSignal(today());
  const [data, setData] = createSignal<FaithData | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(false);
  const [refreshKey, setRefreshKey] = createSignal(0);
  createEffect(() => {
    const selectedDate = date();
    refreshKey();
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void loadFaith(selectedDate).then((result) => {
      if (!controller.signal.aborted) setData(result);
    }).catch(() => {
      if (!controller.signal.aborted) {
        setData(null);
        setError(true);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  });
  const refetch = () => setRefreshKey((value) => value + 1);
  return <section id="fe" class="faith-today" aria-labelledby="faith-heading">
    <div class="faith-heading">
      <div><p class="eyebrow">HOJE / FÉ</p><h2 id="faith-heading">Fé, no seu tempo.</h2><p class="muted">Liturgia, santos e terço em um só lugar.</p></div>
      <div class="faith-actions"><input type="date" aria-label="Data da liturgia" value={date()} onInput={(event) => setDate(event.currentTarget.value)} /><button type="button" class="subtle" onClick={() => void refetch()}>Atualizar</button></div>
    </div>
    <Show when={loading()}><p role="status">Carregando a liturgia…</p></Show>
    <Show when={error()}><p role="alert">Não foi possível carregar. Verifique sua conexão e tente atualizar.</p></Show>
    <Show when={data()}>{(faith) => <>
      <div class="faith-grid">
        <article class="faith-panel">
          <p class="eyebrow">CALENDÁRIO LITÚRGICO</p>
          <h3>{text(faith().calendar.celebration) || 'Celebração do dia'}</h3>
          <p>{text(faith().calendar.liturgicalSeason) || 'Tempo litúrgico não informado pela fonte'}</p>
          <Show when={text(faith().calendar.color)}><span class="faith-color">{text(faith().calendar.color)}</span></Show>
        </article>
        <article class="faith-panel">
          <p class="eyebrow">TERÇO DO DIA</p><h3>Mistérios {rosaryNames[faith().rosary.type] || faith().rosary.type}</h3>
          <ol><For each={faith().rosary.mysteries}>{(mystery) => <li>{mystery}</li>}</For></ol>
          <details><summary>Orações do terço</summary><For each={Object.entries(faith().rosary.prayers)}>{([name, prayer]) => <p><strong>{name}</strong> · {prayer}</p>}</For></details>
        </article>
      </div>
      <article class="faith-panel faith-readings"><p class="eyebrow">PALAVRA DO DIA</p><h3>Leituras e Evangelho</h3>
        <Show when={faith().readings.status === 'available'} fallback={<p class="muted">As leituras não estão disponíveis nesta data.</p>}>
          <For each={readings(faith().readings.items)} fallback={<p class="muted">A fonte não retornou textos de leituras.</p>}>{(entry) => <details><summary>{entry.label}</summary><p class="faith-scripture">{entry.content}</p></details>}</For>
        </Show>
      </article>
      <article class="faith-panel"><p class="eyebrow">SANTOS DO DIA</p><h3>Vidas que inspiram</h3>
        <div class="faith-saints"><For each={faith().saints.items || []} fallback={<p class="muted">Santos e imagens indisponíveis nesta data.</p>}>{(saint) => <div class="faith-saint">
          <Show when={typeof saint.image === 'string' && saint.image.startsWith('https://')}><img src={saint.image as string} alt={text(saint.name)} loading="lazy" referrerPolicy="no-referrer" /></Show>
          <div><h4>{text(saint.name) || 'Santo do dia'}</h4><p>{text(saint.biography)}</p><Show when={text(saint.prayer)}><details><summary>Oração</summary><p>{text(saint.prayer)}</p></details></Show></div>
        </div>}</For></div>
      </article>
    </>}</Show>
  </section>;
}
