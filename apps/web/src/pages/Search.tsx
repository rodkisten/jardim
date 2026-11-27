import { SemanticSearch } from '../components/SemanticSearch';
import { useModules } from '../hooks/useModules';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@rodkisten/girassol/react';
import { localDay, selectMemories } from '../utils/timeline';
import { useMemories } from '../hooks/useMemories';
import { MemoryList } from '../components/MemoryList';
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export function SearchMemories() {
  const preferences=useModules();
  const state = useMemories(),
    [query, setQuery] = useState('');
  const memories = selectMemories(state.memories, {
    period: 'all',
    source: 'all',
    anchor: localDay(new Date(), zone),
    query,
    timeZone: zone,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Buscar</h1>
      <div className="relative">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          aria-label="Buscar memórias"
          placeholder="Título, texto ou tag"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {preferences.oracle&&<SemanticSearch items={state.memories.map(m=>({id:m.id,title:m.title,body:m.body}))}/>}
      <MemoryList {...state} memories={memories} />
    </div>
  );
}
