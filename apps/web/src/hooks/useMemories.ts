import { db } from '../utils/db';
import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import type { Memory } from '@rodkisten/jardim-contracts';
type State = { memories: Memory[]; loading: boolean; error: string | null };
export function useMemories() {
  const [state, setState] = useState<State>({ memories: [], loading: true, error: null });
  useEffect(() => {
    const subscription = liveQuery(() =>
      db.memories.orderBy('createdAt').reverse().toArray(),
    ).subscribe({
      next: (memories) => setState({ memories, loading: false, error: null }),
      error: (error: unknown) =>
        setState((previous) => ({
          ...previous,
          loading: false,
          error: error instanceof Error ? error.message : 'Não foi possível abrir suas memórias.',
        })),
    });
    return () => subscription.unsubscribe();
  }, []);
  return state;
}
