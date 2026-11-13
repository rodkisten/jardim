import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import worker from '../apps/api/src/index';
// Execute the actual migration and Worker SQL against SQLite; D1 remote smoke is separate.
test('login, atomic idempotent push, pull, logout and login rate limit',async()=>{
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('infra/cloudflare/migrations/0001_foundation.sql','utf8'));
 function raw<T=unknown[]>(options:{columnNames:true}):Promise<[string[],...T[]]>;
 function raw<T=unknown[]>(options?:{columnNames?:false}):Promise<T[]>;
 async function raw(options?:{columnNames?:boolean}):Promise<unknown[]>{return options?.columnNames?[[]]:[];}
 function statement(sql:string,params:unknown[]=[]):D1PreparedStatement{return {raw,bind:(...values:unknown[])=>statement(sql,values),run:async()=>({success:true,meta:{...sqlite.prepare(sql).run(...params as (string|number)[]),duration:0,size_after:0,rows_read:0,rows_written:0,last_row_id:0,changed_db:true},results:[]}),first:async()=>sqlite.prepare(sql).get(...params as (string|number)[])||null,all:async()=>({success:true,meta:{duration:0,size_after:0,rows_read:0,rows_written:0,last_row_id:0,changed_db:false,changes:0},results:sqlite.prepare(sql).all(...params as (string|number)[])})} as D1PreparedStatement;}
 const db={prepare:statement,batch:async(statements:D1PreparedStatement[])=>{sqlite.exec('BEGIN');try{const results=await Promise.all(statements.map(s=>s.run()));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}} as D1Database;
 const env={DB:db,JARDIM_PASSWORD:'test-password',APP_ORIGIN:'https://jardim.migos.club'} as Env;
 const origin=env.APP_ORIGIN;
 const request=(path:string,init:RequestInit={})=>worker.fetch(new Request(origin+path,init),env);
 const login=await request('/auth/login',{method:'POST',headers:{origin},body:'password=test-password'});expect(login.status).toBe(303);const cookie=login.headers.get('set-cookie')!.split(';')[0];expect(cookie.startsWith('__Host-jardim=')).toBe(true);
 const memory={id:crypto.randomUUID(),title:'Momento',body:'Conteúdo',tags:['vida'],createdAt:new Date().toISOString()};const op={operationId:crypto.randomUUID(),memory};
 for(let i=0;i<2;i++){const res=await request('/v1/sync/push',{method:'POST',headers:{origin,cookie},body:JSON.stringify({operations:[op]})});expect(await res.json()).toEqual({acknowledged:[op.operationId]});}
 expect(sqlite.prepare('SELECT count(*) AS n FROM memories').get()!.n).toBe(1);
 const pull=await request('/v1/memories',{headers:{cookie}});expect((await pull.json() as {memories:unknown[]}).memories).toEqual([memory]);
 const asset=await request('/assets/private.js');expect(await asset.text()).toContain('Sua senha');
 expect((await request('/auth/logout',{method:'POST',headers:{origin,cookie}})).status).toBe(303);expect((await request('/v1/memories',{headers:{cookie}})).status).toBe(401);
 let status=0;for(let i=0;i<11;i++)status=(await request('/auth/login',{method:'POST',headers:{origin},body:'password=wrong'})).status;expect(status).toBe(429);sqlite.close();
});
