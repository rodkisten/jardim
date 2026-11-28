import Dexie, { type Table, liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
export type AstroProfile = {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  utcOffset: string;
  timezone?: string;
  self: boolean;
};
class AstroDB extends Dexie {
  profiles!: Table<AstroProfile, string>;
  constructor() {
    super('jardim-private-astro');
    this.version(1).stores({ profiles: 'id,name' });
  }
}
export const astroDB = new AstroDB();
export function useAstroProfiles() {
  const [profiles, setProfiles] = useState<AstroProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const sub = liveQuery(() => astroDB.profiles.orderBy('name').toArray()).subscribe({
      next: (p) => {
        setProfiles(p);
        setLoading(false);
        setError('');
      },
      error: () => {
        setError('Não foi possível abrir os perfis locais.');
        setLoading(false);
      },
    });
    return () => sub.unsubscribe();
  }, []);
  return { profiles, loading, error };
}
