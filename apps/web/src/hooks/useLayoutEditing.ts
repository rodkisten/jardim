import { useSyncExternalStore } from 'react';
let editing=false;
const listeners=new Set<()=>void>();
function subscribe(fn:()=>void){listeners.add(fn);return ()=>{listeners.delete(fn);};}
export function setLayoutEditing(value:boolean){editing=value;listeners.forEach(fn=>fn());}
export function useLayoutEditing(){return useSyncExternalStore(subscribe,()=>editing,()=>false);}
