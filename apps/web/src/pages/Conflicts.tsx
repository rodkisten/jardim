import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { Button, Card, CardContent } from "@rodkisten/girassol/react";
import type { Mutation, Snapshot } from "@rodkisten/jardim-contracts";
import { db } from "../utils/db";
import { RichMemory } from "../components/RichMemory";
type Conflict={memoryId:string;operation:Mutation;remote:Snapshot};
export function Conflicts(){
  const [items,setItems]=useState<Conflict[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  useEffect(()=>{const sub=liveQuery(()=>db.conflicts.toArray()).subscribe({next:rows=>{setItems(rows);setLoading(false);},error:()=>{setError("Não foi possível ler conflitos.");setLoading(false);}});return()=>sub.unsubscribe();},[]);
  async function resolve(id:string,choice:"local"|"remote"){if(busy)return;setBusy(true);setError("");try{await db.resolve(id,choice);}catch(error){setError(error instanceof Error?error.message:"Falha ao resolver conflito.");}finally{setBusy(false);}}
  return <section className="space-y-4"><h1 className="text-2xl font-semibold">Revisar conflitos</h1>{error&&<p role="alert">{error}</p>}{loading?<p>Carregando…</p>:!items.length?<p>Nenhum conflito pendente.</p>:items.map(item=><Card key={item.memoryId}><CardContent className="space-y-4"><div><h2 className="font-semibold">Versão local</h2><p>{item.operation.memory.title}</p>{item.operation.kind==="delete"?<p>Exclusão local</p>:<RichMemory memory={item.operation.memory}/>}</div><div className="border-t border-border pt-3"><h2 className="font-semibold">Versão remota · revisão {item.remote.revision}</h2><p>{item.remote.memory.title}</p>{item.remote.deletedAt?<p>Excluída remotamente</p>:<RichMemory memory={item.remote.memory}/>}</div><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>void resolve(item.memoryId,"local")}>Manter local</Button><Button disabled={busy} variant="outline" onClick={()=>void resolve(item.memoryId,"remote")}>Aceitar remota</Button></div></CardContent></Card>)}</section>;
}
