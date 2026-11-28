import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Input } from '@rodkisten/girassol/react';
import { db } from '../utils/db';
import { useMemories } from '../hooks/useMemories';
import { MemoryList } from './MemoryList';

export function DimensionNotes({
  dimension,
  kinds,
}: {
  dimension: string;
  kinds: readonly string[];
}) {
  const state = useMemories();
  const [kind, setKind] = useState(kinds[0] ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [filter, setFilter] = useState('');
  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Informe um título.');
      await db.plant({ title: title.trim(), body: body.trim(), tags: [dimension, kind] });
    },
    onSuccess: () => {
      setTitle('');
      setBody('');
    },
  });
  const memories = state.memories.filter(
    (m) => m.tags.includes(dimension) && (!filter || m.tags.includes(filter)),
  );
  return (
    <section className="space-y-4">
      <h2 className="jardim-editorial text-2xl">Seus registros</h2>
      <form
        className="space-y-3 rounded-2xl border border-border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label className="block text-sm">
          Categoria
          <select
            className="mt-1 block w-full rounded-lg border border-border bg-background p-2"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {kinds.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <Input
          aria-label="Título"
          placeholder="Título"
          maxLength={140}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          aria-label="Anotações"
          placeholder="O que você quer guardar?"
          className="min-h-28 w-full rounded-xl border border-border bg-background p-3"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button disabled={save.isPending || !title.trim()}>
          {save.isPending ? 'Guardando…' : 'Guardar no Jardim'}
        </Button>
        {save.isError && (
          <p role="alert" className="text-sm">
            {save.error.message}
          </p>
        )}
        {save.isSuccess && (
          <p role="status" className="text-sm text-muted-foreground">
            Registro guardado.
          </p>
        )}
      </form>
      <div className="flex flex-wrap gap-2" aria-label="Filtrar registros">
        {['', ...kinds].map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className="jardim-filter"
          >
            {k || 'Todos'}
          </button>
        ))}
      </div>
      <MemoryList {...state} memories={memories} />
    </section>
  );
}
