import Dexie,{type Table} from 'dexie';
import type { LocalListening } from './music-insights-local';
import { timeFormatter } from './music-chronos';
export type AtlasPeriod={id:string;name:string;from:string;to:string;timezone:string;latitude?:number;longitude?:number};
export type AtlasListening=LocalListening & {atlasPeriodId?:string};
class AtlasDB extends Dexie{periods!:Table<AtlasPeriod,string>;constructor(){super('jardim-atlas');this.version(1).stores({periods:'id,from,to'});}}
export const atlasDB=new AtlasDB();
export async function savePeriod(period:AtlasPeriod){
 const from=Date.parse(period.from),to=Date.parse(period.to);
 if(!period.name.trim()||period.name.length>100||!Number.isFinite(from)||!Number.isFinite(to)||from>=to||!timeFormatter(period.timezone))throw Error('Período ou fuso inválido.');
 if((period.latitude===undefined)!==(period.longitude===undefined)||period.latitude!==undefined&&(!Number.isFinite(period.latitude)||Math.abs(period.latitude)>90)||period.longitude!==undefined&&(!Number.isFinite(period.longitude)||Math.abs(period.longitude)>180))throw Error('Coordenadas inválidas.');
 await atlasDB.transaction('rw',atlasDB.periods,async()=>{const all=await atlasDB.periods.toArray();if(all.some(p=>p.id!==period.id&&Date.parse(p.from)<to&&Date.parse(p.to)>from))throw Error('Existe outro período sobreposto.');await atlasDB.periods.put({...period,from:new Date(from).toISOString(),to:new Date(to).toISOString()});});
}
export function applyAtlas(rows:readonly LocalListening[],periods:readonly AtlasPeriod[]):AtlasListening[]{
 const sorted=[...periods].sort((a,b)=>a.from.localeCompare(b.from));const formatters=new Map(sorted.map(p=>[p.id,timeFormatter(p.timezone)]));
 return rows.map(row=>{if(row.timezone||row.timeBasis==='device')return row;const instant=Date.parse(row.occurredAt);if(!Number.isFinite(instant))return row;let lo=0,hi=sorted.length;while(lo<hi){const mid=(lo+hi)>>>1;if(Date.parse(sorted[mid].from)<=instant)lo=mid+1;else hi=mid;}const period=sorted[lo-1];if(!period||instant>=Date.parse(period.to))return row;const formatter=formatters.get(period.id);if(!formatter)return row;const parts=Object.fromEntries(formatter.formatToParts(new Date(instant)).map(p=>[p.type,p.value]));return {...row,timezone:period.timezone,localDate:parts.year+'-'+parts.month+'-'+parts.day,context:{...row.context,hour:Number(parts.hour)},atlasPeriodId:period.id};});
}
