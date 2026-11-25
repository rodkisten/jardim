import {Backup,mediaTypes} from '@rodkisten/jardim-contracts';
import {key,openBackup} from './vault';
import type {GardenDB} from '@rodkisten/jardim-local-db';
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const magic=enc.encode('JARDIM02'),max=128*1024*1024,chunk=1024*1024;
type Media={id:string;name:string;type:string;size:number;duration?:number};
type Manifest={backup:ReturnType<typeof Backup.parse>;media:Media[]};
export type VaultPreview={backup:Manifest['backup'];attachments:{id:string;name:string;blob:Blob;uploaded:number;duration?:number}[]};
function nonce(prefix:Uint8Array,index:number){const iv=new Uint8Array(12);iv.set(prefix);new DataView(iv.buffer).setUint32(8,index);return iv;}
function aad(header:Uint8Array,index:number,size:number){const a=new Uint8Array(header.length+8);a.set(header);const v=new DataView(a.buffer);v.setUint32(header.length,index);v.setUint32(header.length+4,size);return a;}
export async function exportMedia(db:GardenDB,password:string,progress:(n:number)=>void=()=>{}){
 const snapshot=await db.transaction('r',db.memories,db.attachments,async()=>({memories:await db.memories.toArray(),attachments:await db.attachments.toArray()}));
 const backup=Backup.parse({schemaVersion:1,exportedAt:new Date().toISOString(),memories:snapshot.memories});
 const media=snapshot.attachments.map(a=>({id:a.id,name:a.name,type:a.blob.type,size:a.blob.size,duration:a.duration}));
 const manifest=enc.encode(JSON.stringify({backup,media}));const total=manifest.length+media.reduce((s,m)=>s+m.size,0);if(total>max||manifest.length>32*1024*1024)throw Error('Backup excede o limite de 128 MiB.');
 const header=new Uint8Array(32);header.set(magic);header.set(crypto.getRandomValues(new Uint8Array(24)),8);const k=await key(password,header.slice(8,24));const prefix=header.slice(24);const parts:BlobPart[]=[header];let index=0,done=0;
 async function write(data:ArrayBuffer){const size=data.byteLength;const length=new Uint8Array(4);new DataView(length.buffer).setUint32(0,size);parts.push(length,await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce(prefix,index),additionalData:aad(header,index,size)},k,data));index++;done+=size;progress(Math.round(done/total*100));}
 await write(manifest.buffer);for(const a of snapshot.attachments)for(let offset=0;offset<a.blob.size;offset+=chunk)await write(await a.blob.slice(offset,offset+chunk).arrayBuffer());return new Blob(parts,{type:'application/octet-stream'});
}
export async function importMedia(file:Blob,password:string,progress:(n:number)=>void=()=>{}):Promise<VaultPreview>{
 const header=new Uint8Array(await file.slice(0,32).arrayBuffer());if(dec.decode(header.slice(0,8))==='JARDIM01')return {backup:await openBackup(file,password),attachments:[]};
 if(header.length!==32||!magic.every((v,i)=>header[i]===v)||file.size>max+1024*1024)throw Error('Arquivo inválido.');
 const k=await key(password,header.slice(8,24)),prefix=header.slice(24);let offset=32,index=0;
 async function read(expected?:number){if(offset+4>file.size)throw Error('Arquivo truncado.');const size=new DataView(await file.slice(offset,offset+4).arrayBuffer()).getUint32(0);offset+=4;if(size>(index===0?32*1024*1024:chunk)||(expected!==undefined&&size!==expected)||offset+size+16>file.size)throw Error('Bloco inválido.');const encrypted=await file.slice(offset,offset+size+16).arrayBuffer();const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce(prefix,index),additionalData:aad(header,index,size)},k,encrypted);index++;offset+=size+16;progress(Math.round(offset/file.size*100));return data;}
 const raw=JSON.parse(dec.decode(await read())) as Manifest;const backup=Backup.parse(raw.backup);if(!Array.isArray(raw.media)||raw.media.length>10000)throw Error('Manifesto inválido.');const ids=new Set<string>();const attachments:VaultPreview['attachments']=[];
 for(const m of raw.media){if(!m||typeof m.id!=='string'||!/^[a-f0-9-]{36}$/i.test(m.id)||ids.has(m.id)||typeof m.name!=='string'||m.name.length>512||!(mediaTypes as readonly string[]).includes(m.type.split(';')[0])||!Number.isInteger(m.size)||m.size<1||m.size>12*1024*1024||(m.duration!==undefined&&(!Number.isFinite(m.duration)||m.duration<=0||m.duration>86400)))throw Error('Anexo inválido.');ids.add(m.id);const parts:ArrayBuffer[]=[];for(let pos=0;pos<m.size;pos+=chunk)parts.push(await read(Math.min(chunk,m.size-pos)));attachments.push({id:m.id,name:m.name,blob:new Blob(parts,{type:m.type}),uploaded:0,duration:m.duration});}
 if(offset!==file.size)throw Error('Dados excedentes no arquivo.');return {backup,attachments};
}
export async function restoreMedia(db:GardenDB,preview:VaultPreview){return db.transaction('rw',db.memories,db.mutations,db.versions,db.conflicts,db.attachments,async()=>{const result=await db.restore(preview.backup);let mediaAdded=0;for(const a of preview.attachments){if(await db.attachments.get(a.id))continue;await db.attachments.add(a);mediaAdded++;}return {...result,mediaAdded};});}
