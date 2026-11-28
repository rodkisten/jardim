import { useSyncExternalStore } from 'react';
export const surfaces={navigation:['/','/timeline','/diary','/capsules','/faith','/acervo'],astro:['sky','date','profile','oracle','lunar','compare','maps'],mood:['checkin','calendar','trends','history'],faith:['calendar','rosary','readings','lectio','saints','notes'],acervo:['integrations','discovery','notes','history'],herbarium:['capture','collection'],diary:['title','notes','tags','previews','compression','attachments']} as const;
export type Surface=keyof typeof surfaces;
const key='jardim.layout.surfaces.v1';
type State=Partial<Record<Surface,string[]>>;
function read():State{try{const raw=JSON.parse(localStorage.getItem(key)??'{}');const result:State={};for(const name of Object.keys(surfaces) as Surface[]){const allowed:readonly string[]=surfaces[name];const value=raw?.[name];if(Array.isArray(value)){const valid=[...new Set<string>(value.filter((id:unknown):id is string=>typeof id==='string'&&allowed.includes(id)))];result[name]=[...valid,...allowed.filter(id=>!valid.includes(id))];}}return result;}catch{return {};}}
let current=read();const listeners=new Set<()=>void>();
function emit(){listeners.forEach(fn=>fn());}
function subscribe(fn:()=>void){listeners.add(fn);return ()=>{listeners.delete(fn);};}
if(typeof window!=='undefined')window.addEventListener('storage',e=>{if(e.key===key||e.key===null){current=read();emit();}});
export function useSurfaceLayout<S extends Surface>(name:S){const state=useSyncExternalStore(subscribe,()=>current,()=>current);return (state[name]??surfaces[name]) as readonly (typeof surfaces[S][number])[];}
export function reorderSurface(name:Surface,visible:readonly string[]){const allowed:readonly string[]=surfaces[name];if(new Set(visible).size!==visible.length||visible.some(id=>!allowed.includes(id)))throw Error('Invalid layout');const old=current[name]??allowed;const set=new Set(visible);let i=0;const next={...current,[name]:old.map(id=>set.has(id)?visible[i++]:id)};localStorage.setItem(key,JSON.stringify(next));current=next;emit();}
export function resetSurface(name:Surface){reorderSurface(name,surfaces[name]);}
