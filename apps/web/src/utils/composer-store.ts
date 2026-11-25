import Dexie,{type Table} from "dexie";
import { type Draft,readDraft } from "./draft";
export type ComposerAttachment={blob:Blob;name:string;lastModified:number};
export type ComposerSnapshot={id:"current";draft:Draft;attachments:ComposerAttachment[]};
export class ComposerDB extends Dexie{
 drafts!:Table<ComposerSnapshot,string>;
 constructor(name="jardim-composer"){super(name);this.version(1).stores({drafts:"id"});}
}
export const composer=new ComposerDB();
export async function loadComposer(db=composer):Promise<ComposerSnapshot>{
 return await db.drafts.get("current")??{id:"current",draft:readDraft(),attachments:[]};
}
export function saveComposer(snapshot:ComposerSnapshot,db=composer){return db.drafts.put(snapshot);}
export function clearComposer(db=composer){return db.drafts.delete("current");}
export function appendAttachments(current:ComposerAttachment[],incoming:File[],allowed:readonly string[]){
 const next=[...current];
 for(const file of incoming){
 if(!allowed.includes(file.type))throw Error("Formato de anexo não suportado: "+file.name);
 if(file.size>12*1024*1024)throw Error("Anexo excede 12 MB: "+file.name);
 if(next.some(a=>a.name===file.name&&a.blob.size===file.size&&a.lastModified===file.lastModified))continue;
 next.push({blob:file,name:file.name,lastModified:file.lastModified});
 }
 if(next.length>5)throw Error("Adicione até cinco anexos.");
 return next;
}
