import Dexie,{type Table} from "dexie";
import type { FaithData } from "./faith";
class FaithDB extends Dexie {
 days!:Table<FaithData,string>;
 constructor(){super("jardim-faith");this.version(1).stores({days:"date"});}
}
const db=new FaithDB();
export async function getFaith(date:string,signal:AbortSignal):Promise<FaithData>{
 const cached=await db.days.get(date).catch(()=>undefined);
 if(!navigator.onLine&&cached)return cached;
 try{
 const r=await fetch("/faith/"+encodeURIComponent(date),{signal,credentials:"same-origin"});
 if(!r.ok||!r.headers.get("content-type")?.includes("application/json"))throw Error("Liturgia indisponível");
 const data=await r.json() as FaithData;
 if(data.date!==date||!data.readings||!data.rosary||!data.calendar||!data.saints)throw Error("Liturgia inválida");
 if(data.readings.status==="available"){await db.days.put(data).catch(()=>undefined);return data;}
 return cached??data;
 }catch(error){if(cached&&!signal.aborted)return cached;throw error;}
}
