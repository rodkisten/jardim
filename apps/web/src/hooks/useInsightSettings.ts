import { useSyncExternalStore } from 'react';
import { z } from 'zod';
export const insightSections=["metadata","atlas","atmosphere","helios","sophia","discoveries","constellations","chronos","explorer"] as const;
const schema=z.object({sections:z.object({metadata:z.boolean().default(true),atlas:z.boolean().default(true),atmosphere:z.boolean().default(true),helios:z.boolean().default(true),sophia:z.boolean().default(true),discoveries:z.boolean().default(true),constellations:z.boolean().default(true),chronos:z.boolean().default(true),explorer:z.boolean().default(true)}),historyLimit:z.number().int().min(5).max(500),hemisphere:z.enum(['','north','south'])});
const defaults=schema.parse({sections:{},historyLimit:30,hemisphere:''});
export type InsightSettings=z.infer<typeof schema>;
const key='jardim.insights.settings.v1';
function read(){try{const raw=JSON.parse(localStorage.getItem(key)??'null');return schema.parse(raw);}catch{return defaults;}}
let current=read();const listeners=new Set<()=>void>();
function subscribe(fn:()=>void){listeners.add(fn);return ()=>{listeners.delete(fn);};}
if(typeof window!=='undefined')window.addEventListener('storage',e=>{if(e.key===key||e.key===null){current=read();listeners.forEach(fn=>fn());}});
export function updateInsights(next:InsightSettings){const parsed=schema.parse(next);localStorage.setItem(key,JSON.stringify(parsed));current=parsed;listeners.forEach(fn=>fn());}
export function resetInsights(){updateInsights(defaults);}
export function useInsightSettings(){return useSyncExternalStore(subscribe,()=>current,()=>defaults);}
