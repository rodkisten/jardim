import Dexie, { type EntityTable } from 'dexie';
import { Memory, type Operation } from '../../contracts/src/index';
export class GardenDB extends Dexie {
 memories!:EntityTable<Memory,'id'>;
 outbox!:EntityTable<Operation,'operationId'>;
 meta!:EntityTable<{key:string,value:number},'key'>;
 constructor(name='jardim-v1'){super(name);this.version(1).stores({memories:'id,createdAt',outbox:'operationId',meta:'key'});}
 async plant(input:{title:string,body:string,tags:string[]}){
  const memory=Memory.parse({...input,id:crypto.randomUUID(),createdAt:new Date().toISOString()});
  const op={operationId:crypto.randomUUID(),memory};
  await this.transaction('rw',this.memories,this.outbox,async()=>{await this.memories.add(memory);await this.outbox.add(op);});return memory;
 }
}
export async function synchronize(db:GardenDB,fetcher:typeof fetch=fetch){
 const operations=await db.outbox.limit(50).toArray();
 if(operations.length){const res=await fetcher('/v1/sync/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operations})});if(!res.ok)throw new Error(res.status===401?'Entre novamente para sincronizar.':'Não foi possível enviar. Suas memórias estão neste dispositivo.');const data=await res.json() as {acknowledged:string[]};const sent=new Set(operations.map(o=>o.operationId));await db.outbox.bulkDelete(data.acknowledged.filter(id=>sent.has(id)));}
 let more=true;
 while(more){const cursor=(await db.meta.get('cursor'))?.value||0;const res=await fetcher(`/v1/memories?cursor=${cursor}`);if(!res.ok)throw new Error(res.status===401?'Entre novamente para sincronizar.':'Não foi possível receber memórias.');const data=await res.json() as {memories:unknown[],cursor:number,hasMore:boolean};const memories=data.memories.map(m=>Memory.parse(m));if(!Number.isSafeInteger(data.cursor)||data.cursor<cursor||(data.hasMore&&data.cursor===cursor))throw new Error('Resposta de sincronização inválida');await db.transaction('rw',db.memories,db.meta,async()=>{await db.memories.bulkPut(memories);await db.meta.put({key:'cursor',value:data.cursor});});more=data.hasMore;}
}
