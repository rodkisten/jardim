import type { LocalListening } from './music-insights-local';
import type { InsightDimension } from './insights';
const dimensions:InsightDimension[]=['mood','weather','season','moonSign'];
type Distribution={count:number;values:Map<string,number>};
export type MusicNode={id:string;name:string;count:number;dimensions:Map<InsightDimension,Distribution>};
export function musicNodes(rows:readonly LocalListening[]){
 const nodes=new Map<string,MusicNode>(),seen=new Set<string>();
 for(const row of rows){if(row.source==='reference'||seen.has(row.id))continue;seen.add(row.id);let node=nodes.get(row.trackId);if(!node){node={id:row.trackId,name:row.title+' · '+row.artist,count:0,dimensions:new Map()};nodes.set(row.trackId,node);}node.count++;
 for(const dimension of dimensions){const value=row.context?.[dimension];if(!value)continue;let dist=node.dimensions.get(dimension);if(!dist){dist={count:0,values:new Map()};node.dimensions.set(dimension,dist);}dist.count++;dist.values.set(value,(dist.values.get(value)??0)+1);}}
 return [...nodes.values()].filter(n=>n.count>=5&&[...n.dimensions.values()].some(d=>d.count>=5)).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));
}
export function similarity(a:MusicNode,b:MusicNode){
 const evidence:{dimension:InsightDimension;overlap:number;left:number;right:number}[]=[];
 for(const dimension of dimensions){const x=a.dimensions.get(dimension),y=b.dimensions.get(dimension);if(!x||!y||x.count<5||y.count<5)continue;let overlap=0;for(const [value,n] of x.values)overlap+=Math.min(n/x.count,(y.values.get(value)??0)/y.count);evidence.push({dimension,overlap,left:x.count,right:y.count});}
 return {score:evidence.length?evidence.reduce((s,e)=>s+e.overlap,0)/evidence.length:0,evidence};
}
export function neighbors(anchor:MusicNode,nodes:readonly MusicNode[]){
 return nodes.filter(n=>n.id!==anchor.id).map(node=>({node,...similarity(anchor,node)})).filter(n=>n.evidence.length>=2&&n.score>=0.65).sort((a,b)=>b.score-a.score||b.node.count-a.node.count||a.node.id.localeCompare(b.node.id)).slice(0,8);
}
