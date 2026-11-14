import { createSignal } from 'solid-js';
import type { Memory } from '@rodkisten/jardim-contracts';
import type { GardenDB } from '@rodkisten/jardim-local-db';
import { MemoryCard } from './MemoryCard';
import {
  groupMemories,
  localDay,
  movePeriod,
  selectMemories,
  sources,
  type Period,
  type Source,
} from './timeline';
import styles from './Timeline.module.css';
export function Timeline(props: {
  memories: Memory[];
  db: GardenDB;
  onEdit: (memory: Memory) => void;
  onDelete: (memory: Memory) => void;
  onChanged: () => void;
}) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = () => localDay(new Date(), timeZone);
  const [period, setPeriod] = createSignal<Period>('all'),
    [anchor, setAnchor] = createSignal(today()),
    [source, setSource] = createSignal<'all' | Source>('all'),
    [query, setQuery] = createSignal(''),
    [grouping, setGrouping] = createSignal<'day' | 'source'>('day');
  const selected = () =>
    selectMemories(props.memories, {
      period: period(),
      anchor: anchor(),
      source: source(),
      query: query(),
      timeZone,
    });
  const groups = () => groupMemories(selected(), timeZone, grouping());
  return (
    <section id="memorias" class="timeline" aria-label="Suas memórias">
      <div class="section-title">
        <span>MEMÓRIAS</span>
        <span>{props.memories.length} MEMÓRIAS</span>
      </div>
      <h2>Seu arquivo</h2>
      <label class="sr-only" for="search">
        Buscar memórias
      </label>
      <input
        id="search"
        type="search"
        placeholder="Buscar nas memórias…"
        value={query()}
        onInput={(event) => setQuery(event.currentTarget.value)}
      />
      <div class={styles.filters}>
        <div>
          <label for="timeline-period">Período</label>
          <select
            id="timeline-period"
            value={period()}
            onChange={(event) => setPeriod(event.currentTarget.value as Period)}
          >
            <option value="all">Tudo</option>
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
            <option value="year">Ano</option>
            <option value="anniversary">Neste dia</option>
          </select>
        </div>
        <div>
          <label for="timeline-source">Fonte</label>
          <select
            id="timeline-source"
            value={source()}
            onChange={(event) => setSource(event.currentTarget.value as 'all' | Source)}
          >
            <option value="all">Todas</option>
            {Object.entries(sources).map(([key, label]) => (
              <option value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label for="timeline-anchor">Dia de referência</label>
          <input
            id="timeline-anchor"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            value={anchor()}
            onChange={(event) => {
              if (!event.currentTarget.value) {
                setAnchor(today());
                setPeriod('all');
              } else if (event.currentTarget.validity.valid) {
                setAnchor(event.currentTarget.value);
                if (period() === 'all') setPeriod('day');
              }
            }}
          />
        </div>
        <div>
          <label for="timeline-group">Agrupar por</label>
          <select
            id="timeline-group"
            value={grouping()}
            onChange={(event) => setGrouping(event.currentTarget.value as 'day' | 'source')}
          >
            <option value="day">Dia</option>
            <option value="source">Fonte</option>
          </select>
        </div>
      </div>
      <div class={styles.navigation} role="group" aria-label="Navegar no tempo">
        <button
          class="subtle"
          disabled={period() === 'all'}
          aria-label="Período anterior"
          onClick={() => setAnchor(movePeriod(anchor(), period(), -1))}
        >
          ← Anterior
        </button>
        <button
          class="subtle"
          onClick={() => {
            setAnchor(today());
            setPeriod('day');
          }}
        >
          Hoje
        </button>
        <button
          class="subtle"
          onClick={() => {
            setAnchor(today());
            setPeriod('anniversary');
          }}
        >
          Neste dia
        </button>
        <button
          class="subtle"
          disabled={period() === 'all'}
          aria-label="Próximo período"
          onClick={() => setAnchor(movePeriod(anchor(), period(), 1))}
        >
          Próximo →
        </button>
      </div>
      <p class="footnote">
        Datas no fuso deste dispositivo: {timeZone}. Semanas de segunda a domingo. “Neste dia” reúne
        apenas anos anteriores.
      </p>
      <div class={styles.results}>
        <p role="status">
          {selected().length} de {props.memories.length} memória(s) neste dispositivo.
        </p>
        <button
          class="subtle"
          onClick={() => {
            setPeriod('all');
            setAnchor(today());
            setSource('all');
            setQuery('');
            setGrouping('day');
          }}
        >
          Limpar filtros
        </button>
      </div>
      <div class="entries">
        {groups().length ? (
          groups().map((group) => (
            <section aria-label={group.label} class={styles.group}>
              <div class={styles.groupTitle}>
                {group.label} <span>· {group.memories.length}</span>
              </div>
              {group.memories.map((memory) => (
                <MemoryCard
                  memory={memory}
                  db={props.db}
                  onEdit={() => props.onEdit(memory)}
                  onDelete={() => props.onDelete(memory)}
                  onChanged={props.onChanged}
                />
              ))}
            </section>
          ))
        ) : (
          <div class="empty">
            <span aria-hidden="true">＋</span>
            <h3>
              {props.memories.length
                ? 'Ainda não encontramos por aqui.'
                : 'Seu arquivo começa aqui.'}
            </h3>
            <p>
              {props.memories.length
                ? 'Experimente outro período, fonte ou palavra. Os filtros consideram somente os registros disponíveis neste dispositivo.'
                : 'Sua primeira memória pode ser um pensamento, uma descoberta ou só um pedacinho do dia.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
