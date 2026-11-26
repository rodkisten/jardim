import { SiderealTime } from 'astronomy-engine';
export type HouseSystem = 'equal' | 'whole';
const rad=Math.PI/180;
const norm=(n:number)=>(n%360+360)%360;
export function natalAxes(instant:string,latitude:number,longitude:number,system:HouseSystem){
 const date=new Date(instant);
 if(!Number.isFinite(date.getTime())||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>=66||Math.abs(longitude)>180)return null;
 const t=(date.getTime()/86400000+2440587.5-2451545)/36525;
 const eps=(23.43929111-0.013004167*t-0.000000164*t*t+0.000000504*t*t*t)*rad;
 const theta=norm(SiderealTime(date)*15+longitude)*rad;
 const phi=latitude*rad;
 const asc=norm(Math.atan2(Math.cos(theta),-Math.sin(theta)*Math.cos(eps)-Math.tan(phi)*Math.sin(eps))/rad);
 const mc=norm(Math.atan2(Math.sin(theta),Math.cos(theta)*Math.cos(eps))/rad);
 const start=system==='whole'?Math.floor(asc/30)*30:asc;
 return {asc,mc,desc:norm(asc+180),ic:norm(mc+180),cusps:Array.from({length:12},(_,i)=>norm(start+i*30)),houseOf:(lon:number)=>Math.floor(norm(lon-start)/30)+1};
}
