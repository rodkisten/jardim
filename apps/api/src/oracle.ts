import { reserveOracleRequest } from './oracle-usage';
import { generateOracle, type OracleBinding } from './oracle-core';
import { z } from '@rodkisten/jardim-contracts';
const Input=z.object({consent:z.literal(true),positions:z.array(z.object({name:z.enum(['Sol','Lua','Mercúrio','Vênus','Marte','Júpiter','Saturno','Urano','Netuno','Plutão']),sign:z.enum(['Áries','Touro','Gêmeos','Câncer','Leão','Virgem','Libra','Escorpião','Sagitário','Capricórnio','Aquário','Peixes']),degree:z.number().min(0).lt(30),retrograde:z.boolean()})).length(10)});
export async function oracle(binding:OracleBinding,body:string,db:D1Database):Promise<Response>{
 let input:unknown;try{input=JSON.parse(body);}catch{return Response.json({error:'JSON inválido'},{status:400});}
 const parsed=Input.safeParse(input);if(!parsed.success||new Set(parsed.data.positions.map(p=>p.name)).size!==10)return Response.json({error:'Posições inválidas'},{status:400});
 if(!binding)return Response.json({error:'IA indisponível'},{status:503});
 try{if(!await reserveOracleRequest(db))return Response.json({error:'Limite diário do Oráculo atingido'},{status:429});return await generateOracle(binding,'astro',parsed.data.positions);}catch{return Response.json({error:'IA indisponível'},{status:502});}
}
