import { renderCapsuleCard, cardFormats, type CardFormat } from '@rodkisten/jardim-cards';
import { createSignal, onCleanup } from 'solid-js';
import { liveQuery } from 'dexie';
import { Capsule, type Memory, z } from '@rodkisten/jardim-contracts';
import type { GardenDB } from '@rodkisten/jardim-local-db';
const List = z.object({
  capsules: z.array(
    z.object({
      id: z.uuid(),
      month: z.string(),
      title: z.string(),
      createdAt: z.string(),
      count: z.number(),
    }),
  ),
});
export function Capsules(props: { db: GardenDB; memories: Memory[]; onChanged: () => void }) {
  const today = new Date();
  const [month, setMonth] = createSignal(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
    ),
    [title, setTitle] = createSignal(
      `Meu Jardim · ${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
    ),
    [message, setMessage] = createSignal(''),
    [local, setLocal] = createSignal<{ id: string; payload: Capsule; uploaded: number }[]>([]),
    [remote, setRemote] = createSignal<z.infer<typeof List>['capsules']>([]),
    [opened, setOpened] = createSignal<Capsule | null>(null),
    [busy, setBusy] = createSignal(false);
  const [excluded, setExcluded] = createSignal<string[]>([]);
  const sub = liveQuery(() => props.db.capsules.toArray()).subscribe({
    next: setLocal,
    error: () => setMessage('Não foi possível ler as cápsulas locais.'),
  });
  onCleanup(() => sub.unsubscribe());
  const selected = () =>
    props.memories.filter((memory) => {
      const date = new Date(memory.createdAt);
      return (
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === month() &&
        !excluded().includes(memory.id)
      );
    });
  async function load() {
    try {
      const response = await fetch('/v2/capsules');
      if (response.ok) setRemote(List.parse(await response.json()).capsules);
    } catch {
      setMessage('Offline · mostrando as cápsulas deste dispositivo.');
    }
  }
  async function seal(event: SubmitEvent) {
    event.preventDefault();
    if (busy()) return;
    setBusy(true);
    try {
      const form = event.currentTarget as HTMLFormElement,
        data = new FormData(form);
      const payload = Capsule.parse({
        id: crypto.randomUUID(),
        month: month(),
        title: String(data.get('title')),
        introduction: String(data.get('introduction')),
        memories: selected(),
      });
      if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > 4 * 1024 * 1024)
        throw Error('Reduza a seleção para até 4 MiB.');
      await props.db.capsules.add({ id: payload.id, payload, uploaded: 0 });
      setOpened(payload);
      setMessage('Cápsula selada neste dispositivo. Edições futuras geram uma nova versão.');
      props.onChanged();
    } catch (error) {
      setMessage(
        error instanceof z.ZodError
          ? 'Use um título de até 160 caracteres e selecione até 500 memórias.'
          : error instanceof Error
            ? error.message
            : 'Não foi possível selar.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    const saved = local().find((item) => item.id === id);
    if (saved) {
      setOpened(saved.payload);
      return;
    }
    try {
      const response = await fetch(`/v2/capsules/${id}`);
      if (!response.ok) throw Error('Cápsula indisponível.');
      const result = z
        .object({ capsule: Capsule, createdAt: z.string() })
        .parse(await response.json());
      setOpened(result.capsule);
      await props.db.capsules.put({ id: result.capsule.id, payload: result.capsule, uploaded: 1 });
    } catch {
      setMessage('Não foi possível abrir. Verifique a conexão.');
    }
  }
  async function downloadCard(format: CardFormat) {
    if (!opened() || busy()) return;
    setBusy(true);
    let source = '',
      resultUrl = '';
    try {
      const svg = renderCapsuleCard(opened()!, format);
      source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = cardFormats[format].width;
      canvas.height = cardFormats[format].height;
      const context = canvas.getContext('2d');
      if (!context) throw Error('Renderização indisponível.');
      context.drawImage(image, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(Error('Não foi possível gerar o PNG.'))),
          'image/png',
        ),
      );
      resultUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = resultUrl;
      anchor.download = `jardim-${opened()!.month}-${format}.png`;
      anchor.click();
      const download = resultUrl;
      resultUrl = '';
      setTimeout(() => URL.revokeObjectURL(download), 1000);
    } catch {
      setMessage('Não foi possível gerar o card. Tente outro navegador ou formato.');
    } finally {
      setBusy(false);
      if (source) URL.revokeObjectURL(source);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    }
  }
  return (
    <details
      id="capsulas"
      class="composer capsules"
      onToggle={(event) => {
        if (event.currentTarget.open) void load();
      }}
    >
      <summary>Cápsula mensal do Jardim</summary>
      <p>
        A retrospectiva reúne os registros disponíveis neste dispositivo. Sem coleta de uma fonte,
        ela não representa tudo que aconteceu no mês.
      </p>
      <form onSubmit={seal}>
        <label for="capsule-month">Mês</label>
        <input
          id="capsule-month"
          type="month"
          value={month()}
          onChange={(event) => {
            setMonth(event.currentTarget.value);
            setTitle(`Meu Jardim · ${event.currentTarget.value}`);
            setExcluded([]);
          }}
          required
        />
        <label for="capsule-title">Nome da cápsula</label>
        <input
          id="capsule-title"
          name="title"
          required
          maxlength={160}
          value={title()}
          onInput={(event) => setTitle(event.currentTarget.value)}
        />
        <label for="capsule-intro">Sua narrativa</label>
        <textarea
          id="capsule-intro"
          name="introduction"
          maxlength={4000}
          placeholder="O que você quer guardar deste mês?"
        />
        <p>
          {selected().length} registro(s) selecionado(s) ·{' '}
          {selected().filter((memory) => memory.tags.includes('youtube')).length} do YouTube ·{' '}
          {selected().filter((memory) => memory.tags.includes('spotify')).length} do Spotify
        </p>
        <details>
          <summary>Escolher registros e privacidade</summary>
          {props.memories
            .filter((memory) => {
              const date = new Date(memory.createdAt);
              return (
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === month()
              );
            })
            .map((memory) => (
              <label>
                <input
                  type="checkbox"
                  checked={!excluded().includes(memory.id)}
                  onChange={(event) =>
                    setExcluded(
                      event.currentTarget.checked
                        ? excluded().filter((id) => id !== memory.id)
                        : [...excluded(), memory.id],
                    )
                  }
                />
                {memory.title}
              </label>
            ))}
        </details>
        <button class="primary" disabled={busy() || !selected().length}>
          Selar uma nova versão privada
        </button>
      </form>
      <h3>Versões seladas</h3>
      <ul>
        {local().map((item) => (
          <li>
            <button class="subtle" onClick={() => void open(item.id)}>
              {item.payload.title} · {item.uploaded ? 'sincronizada' : 'neste dispositivo'}
            </button>
          </li>
        ))}
        {remote()
          .filter((item) => !local().some((record) => record.id === item.id))
          .map((item) => (
            <li>
              <button class="subtle" onClick={() => void open(item.id)}>
                {item.title} · {item.count} registros
              </button>
            </li>
          ))}
      </ul>
      {opened() ? (
        <section class="capsule-view">
          <h2>{opened()!.title}</h2>
          <p>{opened()!.introduction}</p>
          <div class="actions print-hidden">
            <button class="subtle" onClick={() => window.print()}>
              Imprimir / salvar PDF
            </button>
            {(Object.keys(cardFormats) as CardFormat[]).map((format) => (
              <button class="subtle" disabled={busy()} onClick={() => void downloadCard(format)}>
                Baixar PNG · {format}
              </button>
            ))}
          </div>
          <p>
            {opened()!.month} · versão selada · {opened()!.memories.length} registros
          </p>
          {opened()!.memories.map((memory) => (
            <article class="memory">
              <h3>{memory.title}</h3>
              <p>
                {memory.body.replace(/\[anexo:[a-f0-9-]{36}\]/g, '').replace(/\[clima:.*\]/g, '')}
              </p>
            </article>
          ))}
          <button class="subtle" onClick={() => setOpened(null)}>
            Fechar cápsula
          </button>
        </section>
      ) : null}
      {message() ? <p role="status">{message()}</p> : null}
    </details>
  );
}
