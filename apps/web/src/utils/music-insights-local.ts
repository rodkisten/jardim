import Dexie, { type Table } from 'dexie';
import { z } from 'zod';
import type { ListeningEvent } from './insights';

const schema=z.object({id:z.string().min(1).max(200),trackId:z.string().min(1).max(300),artistIds:z.array(z.string().min(1).max(300)).max(30),title:z.string().trim().min(1).max(300),artist:z.string().trim().min(1).max(300),occurredAt:z.string().datetime({offset:true}),localDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),source:z.enum(['playback','manual','reference']),bpm:z.number().finite().positive().max(500).optional(),context:z.object({mood:z.string().max(100).optional(),weather:z.string().max(100).optional(),season:z.string().max(100).optional(),moonSign:z.string().max(100).optional(),hour:z.number().int().min(0).max(23).optional()}).optional()});
export type LocalListening=ListeningEvent & {title:string;artist:string};
class MusicDB extends Dexie {
 listening!:Table<LocalListening,string>;
 constructor(){super('jardim-insights-local');this.version(1).stores({listening:'id,trackId,localDate,occurredAt,*artistIds'});}
}
export const musicDB=new MusicDB();
export async function saveListening(event:LocalListening){await musicDB.listening.put(schema.parse(event));}
export async function importListening(raw:unknown){const rows=z.array(schema).max(20000).parse(raw);await musicDB.transaction('rw',musicDB.listening,async()=>{await musicDB.listening.bulkPut(rows);});return rows.length;}
export function manualListening(title:string,artist:string,bpm?:number):LocalListening{
 const now=new Date(),localDate=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 const key=(s:string)=>s.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
 return schema.parse({id:crypto.randomUUID(),trackId:JSON.stringify([key(artist),key(title)]),artistIds:[key(artist)],title,artist,bpm,occurredAt:now.toISOString(),localDate,source:'manual',context:{hour:now.getHours()}});
}
