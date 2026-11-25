import type { Memory } from "@rodkisten/jardim-contracts";
import { groupMemories } from "../utils/timeline";
import { MemoryCard } from "./MemoryCard";
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export function MemoryList({memories,loading,error}:{memories:Memory[];loading:boolean;error:string|null}) {
  if(error) return <p role="alert" className="text-sm text-muted-foreground">{error}</p>;
  if(loading) return <p role="status" className="text-sm text-muted-foreground">Carregando memórias…</p>;
  if(!memories.length) return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma memória por aqui ainda.</p>;
  return <div className="space-y-5">{groupMemories(memories,zone,"day").map(group=><section key={group.key} className="space-y-3"><h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</h2><div className="space-y-3 border-l border-primary/40 pl-3">{group.memories.map(memory=><MemoryCard key={memory.id} memory={memory}/>)}</div></section>)}</div>;
}
