import { SurfacePanels } from '../components/SurfacePanels';
import { MoodTrends } from '../components/MoodTrends';
import { useState } from 'react';
import { Button } from '@rodkisten/girassol/react';
import { dayKey, moods, colors, moodDB, useMoodEntries, type MoodEntry } from '../utils/mood-db';
const emojis = ['😞', '😕', '😐', '🙂', '🥰'];
const options = [
  'Alegria',
  'Gratidão',
  'Ansiedade',
  'Saudade',
  'Medo',
  'Serenidade',
  'Cansaço',
  'Esperança',
  'Solidão',
];
export function Mood() {
  const { entries, error, loading } = useMoodEntries();
  const [mood, setMood] = useState(3),
    [energy, setEnergy] = useState(3),
    [anxiety, setAnxiety] = useState(3),
    [sleep, setSleep] = useState(''),
    [feelings, setFeelings] = useState<string[]>([]),
    [note, setNote] = useState(''),
    [custom, setCustom] = useState(''),
    [editing, setEditing] = useState<MoodEntry | null>(null),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [month, setMonth] = useState(dayKey().slice(0, 7)),
    [selected, setSelected] = useState('');
  function reset() {
    setEditing(null);
    setMood(3);
    setEnergy(3);
    setAnxiety(3);
    setSleep('');
    setFeelings([]);
    setNote('');
    setCustom('');
  }
  async function save() {
    setBusy(true);
    setMessage('');
    try {
      const now = new Date();
      await moodDB.entries.put({
        id: editing?.id ?? crypto.randomUUID(),
        createdAt: editing?.createdAt ?? now.toISOString(),
        day: editing?.day ?? dayKey(now),
        mood,
        energy,
        anxiety,
        sleep: sleep === '' ? null : Number(sleep),
        feelings,
        note: note.trim(),
      });
      reset();
      setMessage('Registro guardado neste dispositivo.');
    } catch {
      setMessage('Não foi possível salvar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  function edit(e: MoodEntry) {
    setEditing(e);
    setMood(e.mood);
    setEnergy(e.energy);
    setAnxiety(e.anxiety);
    setSleep(e.sleep === null ? '' : String(e.sleep));
    setFeelings(e.feelings);
    setNote(e.note);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const [year, mon] = month.split('-').map(Number);
  const first = new Date(year, mon - 1, 1);
  const count = new Date(year, mon, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const visible = entries.filter((e) => (selected ? e.day === selected : e.day.startsWith(month)));
  function move(delta: number) {
    setMonth(dayKey(new Date(year, mon - 1 + delta, 1)).slice(0, 7));
    setSelected('');
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jardim-clima-interior.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="space-y-5">
      <section className="jardim-section-hero" data-tone="interior">
        <p className="jardim-eyebrow">Clima Interior</p>
        <h1 className="jardim-editorial text-3xl">Como está seu mundo interior?</h1>
        <p className="text-sm">Um espaço para observar seus dias, sem julgamentos.</p>
      </section>
      <SurfacePanels
        surface="mood"
        labels={{
          checkin: 'Check-in',
          calendar: 'Calendário',
          trends: 'Tendências',
          history: 'Histórico',
        }}
        panels={{
          checkin: (
            <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
              <h2 className="jardim-editorial text-xl">
                {editing ? 'Editar registro' : 'Novo check-in'}
              </h2>
              <div className="grid grid-cols-5 gap-1">
                {moods.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={mood === i + 1}
                    onClick={() => setMood(i + 1)}
                    className="flex flex-col items-center rounded-xl border p-2"
                    style={{ borderColor: mood === i + 1 ? colors[i] : 'transparent' }}
                  >
                    <span className="text-2xl">{emojis[i]}</span>
                    <span className="text-[10px]">{label}</span>
                  </button>
                ))}
              </div>
              {[
                { label: 'Energia', value: energy, set: setEnergy },
                { label: 'Ansiedade', value: anxiety, set: setAnxiety },
              ].map((f) => (
                <label key={f.label} className="block text-sm">
                  {f.label}: {f.value}/5
                  <input
                    className="block w-full accent-primary"
                    type="range"
                    min={1}
                    max={5}
                    value={f.value}
                    onChange={(e) => f.set(Number(e.target.value))}
                  />
                </label>
              ))}
              <label className="block text-sm">
                Sono (horas, opcional)
                <input
                  className="block w-full rounded-lg border border-border bg-background p-2 text-base"
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={sleep}
                  onChange={(e) => setSleep(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {[...new Set([...options, ...feelings])].map((f) => (
                  <button
                    type="button"
                    key={f}
                    aria-pressed={feelings.includes(f)}
                    className={
                      'rounded-full border px-3 py-2 text-xs ' +
                      (feelings.includes(f)
                        ? 'bg-primary text-primary-foreground'
                        : 'border-border')
                    }
                    onClick={() =>
                      setFeelings((old) =>
                        old.includes(f) ? old.filter((x) => x !== f) : [...old, f],
                      )
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background p-2 text-base"
                  placeholder="Outro sentimento"
                  maxLength={40}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (custom.trim()) setFeelings((old) => [...new Set([...old, custom.trim()])]);
                    setCustom('');
                  }}
                >
                  Adicionar
                </Button>
              </div>
              <textarea
                className="w-full rounded-lg border border-border bg-background p-3 text-base"
                rows={3}
                maxLength={4000}
                placeholder="O que aconteceu hoje?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button
                type="button"
                className="w-full"
                disabled={
                  busy ||
                  (sleep !== '' &&
                    (!Number.isFinite(Number(sleep)) || Number(sleep) < 0 || Number(sleep) > 24))
                }
                onClick={() => void save()}
              >
                Guardar momento
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={reset}>
                  Cancelar edição
                </Button>
              )}
              <p role="status" className="text-xs">
                {message}
              </p>
              <p className="text-xs text-muted-foreground">
                Somente neste navegador. Não sincronizado nem criptografado pelo Jardim. Limpar os
                dados do navegador pode apagar registros.
              </p>
            </section>
          ),
          calendar: (
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" onClick={() => move(-1)}>
                  ‹
                </Button>
                <h2 className="jardim-editorial text-xl">
                  {first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h2>
                <Button type="button" variant="ghost" onClick={() => move(1)}>
                  ›
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
                  <span key={i} className="text-center text-xs">
                    {d}
                  </span>
                ))}
                {Array.from({ length: offset }, (_, i) => (
                  <span key={'blank' + i} />
                ))}
                {Array.from({ length: count }, (_, i) => {
                  const day = month + '-' + String(i + 1).padStart(2, '0');
                  const entry = entries.find((e) => e.day === day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={selected === day}
                      aria-label={day + (entry ? ' ' + moods[entry.mood - 1] : ' sem registro')}
                      onClick={() => setSelected(selected === day ? '' : day)}
                      className="aspect-square rounded-lg border text-xs"
                      style={{
                        background: entry ? colors[entry.mood - 1] : undefined,
                        color: entry ? '#252525' : undefined,
                        borderColor: selected === day ? 'currentColor' : 'transparent',
                      }}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Cor do último registro de cada dia.</p>
            </section>
          ),
          trends: <MoodTrends entries={entries.filter((e) => e.day.startsWith(month))} />,
          history: (
            <section className="space-y-3">
              <h2 className="jardim-editorial text-xl">Histórico</h2>
              {loading ? (
                <p>Carregando…</p>
              ) : error ? (
                <p role="alert">{error}</p>
              ) : !visible.length ? (
                <p className="text-sm text-muted-foreground">Nenhum registro neste período.</p>
              ) : (
                visible.map((e) => (
                  <article
                    key={e.id}
                    className="space-y-2 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex justify-between">
                      <strong>
                        {emojis[e.mood - 1]} {moods[e.mood - 1]}
                      </strong>
                      <span className="text-xs">
                        {new Date(e.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs">
                      Energia {e.energy}/5 · Ansiedade {e.anxiety}/5{' '}
                      {e.sleep !== null ? ' · Sono ' + e.sleep + 'h' : ''}
                    </p>
                    <p className="text-xs">{e.feelings.join(' · ')}</p>
                    <p className="whitespace-pre-wrap break-words text-sm">{e.note}</p>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => edit(e)}>
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Excluir este registro local?'))
                            void moodDB.entries
                              .delete(e.id)
                              .catch(() => setMessage('Não foi possível excluir.'));
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </article>
                ))
              )}
              <Button
                type="button"
                variant="outline"
                disabled={!entries.length}
                onClick={exportData}
              >
                Exportar registros JSON
              </Button>
            </section>
          ),
        }}
      />
    </div>
  );
}
