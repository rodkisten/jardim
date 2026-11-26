import Dexie, { type Table, liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
export const moods = ['Difícil','Sensível','Neutro','Bem','Radiante'] as const;
export const colors = ['#8495b9','#a99acb','#b7ad98','#e1bb73','#f6d45e'] as const;
export type MoodEntry = { id: string; createdAt: string; day: string; mood: number; energy: number; anxiety: number; sleep: number | null; feelings: string[]; note: string };
class MoodDB extends Dexie {
 entries!: Table<MoodEntry,string>;
 constructor(){ super('jardim-private-mood'); this.version(1).stores({entries:'id,createdAt,day'}); }
}
export const moodDB = new MoodDB();
export function dayKey(d = new Date()) { return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
export function useMoodEntries(){
 const [entries,setEntries] = useState<MoodEntry[]>([]);
 const [error,setError] = useState('');
 const [loading,setLoading] = useState(true);
 useEffect(()=>{ const sub=liveQuery(()=>moodDB.entries.orderBy('createdAt').reverse().toArray()).subscribe({next: rows=>{setEntries(rows);setLoading(false);setError('');},error:()=>{setError('Não foi possível ler os registros locais.');setLoading(false);}});return ()=>sub.unsubscribe();},[]);
 return {entries,error,loading};
}
