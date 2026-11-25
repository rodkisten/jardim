import Dexie,{type Table} from "dexie";
export type InboxItem={id:string;source:string;kind:string;title:string;url:string|null;observedAt:string;status:string};
export type Decision={id:string;decision:"approved"|"dismissed"};
class InboxDB extends Dexie{items!:Table<InboxItem,string>;decisions!:Table<Decision,string>;constructor(){super("jardim-inbox");this.version(1).stores({items:"id",decisions:"id"});}}
export const inbox=new InboxDB();
let running:Promise<void>|undefined;
export function syncInbox(){if(running)return running;running=perform().finally(()=>{running=undefined;});return running;}
async function perform(){if(!navigator.onLine)return;for(const entry of await inbox.decisions.toArray()){const response=await fetch("/v2/inbox/"+entry.id,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({decision:entry.decision})});if(!response.ok)throw Error("Decisão pendente: "+response.status);await inbox.transaction("rw",inbox.items,inbox.decisions,async()=>{await inbox.items.delete(entry.id);await inbox.decisions.delete(entry.id);});}const response=await fetch("/v2/inbox");if(!response.ok)throw Error("Inbox indisponível");const data=await response.json() as {items:InboxItem[]};await inbox.transaction("rw",inbox.items,async()=>{await inbox.items.clear();await inbox.items.bulkPut(data.items);});}
