import { Link } from "@tanstack/react-router";
import { CalendarDays, Plus } from "lucide-react";
import { Card, CardContent } from "@rodkisten/girassol/react";
import { localDay } from "../utils/timeline";
import { useMemories } from "../hooks/useMemories";
import { MemoryList } from "../components/MemoryList";
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export function Home() {
  const state=useMemories(), today=localDay(new Date(),zone);
  const current=state.memories.filter(m=>localDay(m.createdAt,zone)===today);
  const monthly=state.memories.filter(m=>localDay(m.createdAt,zone).slice(0,7)===today.slice(0,7));
  return <div className="space-y-6">
    <div><p className="text-xs font-medium uppercase tracking-wide text-primary">{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Seu jardim, hoje.</h1><p className="mt-1 text-sm text-muted-foreground">Pequenos momentos, grandes memórias.</p></div>
    <div className="grid grid-cols-2 gap-3">{[{label:"Hoje",value:current.length},{label:"Neste mês",value:monthly.length}].map(item=><Card key={item.label}><CardContent><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-3xl font-semibold text-primary">{state.loading?"…":item.value}</p></CardContent></Card>)}</div>
    <div className="grid grid-cols-2 gap-3"><Link to="/diary" className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-3 text-sm font-medium text-primary-foreground"><Plus className="size-4"/> Nova memória</Link><Link to="/timeline" className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-3 text-sm"><CalendarDays className="size-4"/> Timeline</Link></div>
    <div className="flex items-center justify-between"><h2 className="font-semibold">Últimas memórias</h2><Link to="/timeline" className="text-xs text-primary">Ver todas</Link></div>
    <MemoryList {...state} memories={state.memories.slice(0,5)}/>
  </div>;
}
