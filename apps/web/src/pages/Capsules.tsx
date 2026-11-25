import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { Button, Card, CardContent, Input } from "@rodkisten/girassol/react";
import { Capsule } from "@rodkisten/jardim-contracts";
import { db } from "../utils/db";
import { useMemories } from "../hooks/useMemories";
import { localDay } from "../utils/timeline";
import { MemoryList } from "../components/MemoryList";
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
export function Capsules(){
  const state=useMemories(),[month,setMonth]=useState(localDay(new Date(),zone).slice(0,7)),[saved,setSaved]=useState<Capsule[]>([]),[selected,setSelected]=useState<Capsule|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{const sub=liveQuery(()=>db.capsules.toArray()).subscribe({next:rows=>setSaved(rows.map(row=>row.payload)),error:()=>setError("Não foi possível ler as cápsulas.")});return()=>sub.unsubscribe();},[]);
  const memories=state.memories.filter(memory=>localDay(memory.createdAt,zone).slice(0,7)===month);
  async function create(){if(busy)return;setBusy(true);setError("");try{const capsule=Capsule.parse({id:crypto.randomUUID(),month,title:"Cápsula de "+month,introduction:"",memories});await db.capsules.add({id:capsule.id,payload:capsule,uploaded:0});setSelected(capsule);}catch(error){setError(error instanceof Error?error.message:"Não foi possível criar a cápsula.");}finally{setBusy(false);}}
  return <section className="space-y-4"><h1 className="text-2xl font-semibold">Cápsulas</h1><Card><CardContent className="space-y-3"><label className="block text-sm">Mês<Input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><p className="text-3xl font-semibold text-primary">{memories.length}</p><p className="text-sm text-muted-foreground">Memórias neste mês</p><Button disabled={busy||state.loading||!!state.error||!memories.length||memories.length>500} onClick={()=>void create()}>Criar cápsula</Button>{memories.length>500&&<p>O limite atual é de 500 memórias por cápsula.</p>}</CardContent></Card>{error&&<p role="alert">{error}</p>}<h2 className="font-semibold">Suas cápsulas</h2>{saved.map(capsule=><button type="button" key={capsule.id} onClick={()=>setSelected(capsule)} className="block w-full rounded-xl border border-border p-3 text-left"><strong>{capsule.title}</strong><p className="text-sm text-muted-foreground">{capsule.memories.length} memórias</p></button>)}{selected&&<div className="space-y-3"><h2 className="text-xl font-semibold">{selected.title}</h2><MemoryList memories={selected.memories} loading={false} error={null}/></div>}</section>;
}
