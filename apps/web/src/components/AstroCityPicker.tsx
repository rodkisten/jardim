import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchCities, type AstroCity } from '../utils/astro-geography';
export function AstroCityPicker({ onSelect }: { onSelect: (city: AstroCity) => void }) {
  const [text, setText] = useState(''),
    [query, setQuery] = useState('');
  const result = useQuery({
    queryKey: ['astro-cities', query],
    queryFn: ({ signal }) => searchCities(query, signal),
    enabled: query.length >= 3,
    staleTime: 86400000,
    retry: false,
  });
  return (
    <div className="space-y-2 rounded-xl border border-violet-400/30 p-3">
      <label className="block text-sm">
        Buscar cidade
        <input
          className="w-full rounded-lg border p-3 text-base"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setQuery('');
          }}
          placeholder="Cidade de nascimento"
          autoCapitalize="off"
        />
      </label>
      <button
        type="button"
        disabled={text.trim().length < 3}
        onClick={() => setQuery(text.trim())}
        className="rounded-lg border border-violet-400/40 px-3 py-2 text-sm"
      >
        Buscar no Open-Meteo
      </button>
      <p className="text-xs">Somente o nome pesquisado será enviado ao serviço externo.</p>
      {query && result.isFetching && <p>Buscando…</p>}
      {query && result.isError && <p role="alert">Busca indisponível. Use os campos manuais.</p>}
      {query &&
        result.data?.map((c) => (
          <button
            key={c.id}
            type="button"
            className="block w-full rounded-lg border border-violet-400/30 p-2 text-left text-sm"
            onClick={() => {
              onSelect(c);
              setQuery('');
              setText(c.label);
            }}
          >
            {c.label}
            <span className="block text-xs">{c.timezone}</span>
          </button>
        ))}
      {query && result.data?.length === 0 && <p>Nenhuma cidade encontrada.</p>}
    </div>
  );
}
