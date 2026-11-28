import Dexie, { type Table } from 'dexie';
import { z } from 'zod';
import type { LocalListening } from './music-insights-local';
const response=z.object({hourly:z.object({time:z.array(z.string()),weather_code:z.array(z.number().nullable()),temperature_2m:z.array(z.number().nullable()),cloud_cover:z.array(z.number().nullable()),precipitation:z.array(z.number().nullable())})});
export type WeatherHour={code:number|null;temperature:number|null;cloud:number|null;rain:number|null};
export type AtmosphereSnapshot={key:string;from:string;to:string;latitude:number;longitude:number;hours:Record<string,WeatherHour>;fetchedAt:number};
class WeatherDB extends Dexie{snapshots!:Table<AtmosphereSnapshot,string>;constructor(){super('jardim-atmosphere');this.version(1).stores({snapshots:'key,fetchedAt'});}}
const cache=new WeatherDB();
export function weatherLabel(code:number|null){if(code===null)return undefined;if(code===0)return 'Céu limpo';if(code===1||code===2)return 'Parcialmente nublado';if(code===3)return 'Nublado';if(code===45||code===48)return 'Neblina';if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return 'Chuva';if([71,73,75,77,85,86].includes(code))return 'Neve';if([95,96,99].includes(code))return 'Tempestade';return undefined;}
export async function loadAtmosphere(latitude:number,longitude:number,from:string,to:string){
 if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw Error('Coordenadas inválidas.');
 const start=Date.parse(from+'T00:00:00Z'),end=Date.parse(to+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||!Number.isFinite(start)||!Number.isFinite(end)||end<start||end-start>30*86400000||end>Date.now()-86400000)throw Error('Selecione até 31 dias passados.');
 latitude=Math.round(latitude*10)/10;longitude=Math.round(longitude*10)/10;
 const key=JSON.stringify([latitude,longitude,from,to]);const saved=await cache.snapshots.get(key);if(saved&&Date.now()-saved.fetchedAt<30*86400000)return saved;
 const url=new URL('https://archive-api.open-meteo.com/v1/archive');url.search=new URLSearchParams({latitude:String(latitude),longitude:String(longitude),start_date:from,end_date:to,timezone:'GMT',hourly:'weather_code,temperature_2m,cloud_cover,precipitation'}).toString();
 const res=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error('Arquivo meteorológico indisponível.');
 const {hourly:h}=response.parse(await res.json());if([h.weather_code,h.temperature_2m,h.cloud_cover,h.precipitation].some(a=>a.length!==h.time.length))throw Error('Resposta incompleta.');
 const hours:Record<string,WeatherHour>={};h.time.forEach((time,i)=>{if(/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(time))hours[time]={code:h.weather_code[i],temperature:h.temperature_2m[i],cloud:h.cloud_cover[i],rain:h.precipitation[i]};});
 const snapshot={key,latitude,longitude,from,to,hours,fetchedAt:Date.now()};await cache.snapshots.put(snapshot);return snapshot;
}
export async function clearAtmosphere(){await cache.snapshots.clear();}
export function applyAtmosphere(rows:readonly LocalListening[],snapshot:AtmosphereSnapshot|null){if(!snapshot)return rows;return rows.map(row=>{if(row.context?.weather)return row;const instant=new Date(row.occurredAt);if(!Number.isFinite(instant.getTime()))return row;const hour=instant.toISOString().slice(0,13)+':00';const weather=weatherLabel(snapshot.hours[hour]?.code??null);return weather?{...row,context:{...row.context,weather}}:row;});}
