import { z } from '@rodkisten/jardim-contracts';
import { reserveOracleRequest } from './oracle-usage';
const Input=z.object({consent:z.literal(true),query:z.string().trim().min(2).max(500),items:z.array(z.object({id:z.string().max(100),text:z.string().min(1).max(1500)})).min(1).max(12)});
const MODEL='@cf/baai/bge-m3' as const;
function cosine(a:number[],b:number[]){let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}return aa&&bb?dot/Math.sqrt(aa*bb):0;}
export async function semanticSearch(ai:Env['AI'],db:D1Database,body:string){
 let raw:unknown;try{raw=JSON.parse(body);}catch{return Response.json({error:'JSON inválido'},{status:400});}
 const input=Input.safeParse(raw);if(!input.success)return Response.json({error:'Seleção inválida'},{status:400});
 if(!ai)return Response.json({error:'IA indisponível'},{status:503});
 try{
 if(!await reserveOracleRequest(db))return Response.json({error:'Quota diária atingida'},{status:429});
 const {query,items}=input.data;
 const output:unknown=await ai.run(MODEL,{text:[query,...items.map(i=>i.text)]});
 const vectors=z.object({data:z.array(z.array(z.number().finite()).length(1024))}).parse(output).data;
 if(vectors.length!==items.length+1)throw Error('Invalid embedding count');
 const results=items.map((item,i)=>({id:item.id,score:cosine(vectors[0],vectors[i+1])})).sort((a,b)=>b.score-a.score);
 return Response.json({results,model:MODEL},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Busca semântica indisponível'},{status:502});}
}
