import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Plus, Search, Music2, Video, CloudSun, Image } from "lucide-react";
import { Badge, Card, CardContent, Input, cn } from "@rodkisten/girassol/react";
import type { Memory } from "@rodkisten/jardim-contracts";
import { groupMemories, localDay, memorySource, selectMemories, sources, type Period, type Source } from "../timeline";
import { useMemories } from "./db";
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const icons = {diary:BookOpen, youtube:Video, spotify:Music2, culture:Image, weather:CloudSun};
function MemoryCard({memory}:{memory:Memory}) {
  const source=memorySource(memory), Icon=icons[source];
  const body=memory.body.replace(/\[anexo:[^\]]+\]/g,"").trim();
  return <Card className="gap-2 py-3"><CardContent className="space-y-2">
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4 text-primary"/>{sources[source]}<span className="ml-auto">{new Date(memory.createdAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span></div>
    <h3 className="break-words font-medium">{memory.title}</h3>
    {body && <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{body}</p>}
    {!!memory.tags.length && <div className="flex flex-wrap gap-1">{memory.tags.map((tag,i)=><Badge key={i} variant="secondary">{tag}</Badge>)}</div>}
  </CardContent></Card>;
}
function MemoryList({memories,loading,error}:{memories:Memory[];loading:boolean;error:string|null}) {
  if(error) return <p role="alert" className="text-sm text-muted-foreground">{error}</p>;
  if(loading) return <p role="status" className="text-sm text-muted-foreground">Carregando memórias…</p>;
  if(!memories.length) return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma memória por aqui ainda.</p>;
  return <div className="space-y-5">{groupMemories(memories,zone,"day").map(group=><section key={group.key} className="space-y-3"><h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</h2><div className="space-y-3 border-l border-primary/40 pl-3">{group.memories.map(memory=><MemoryCard key={memory.id} memory={memory}/>)}</div></section>)}</div>;
}
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
export function Timeline() {
  const state=useMemories(), [period,setPeriod]=useState<Period>("all"), [source,setSource]=useState<Source|"all">("all");
  const periods=[["all","Tudo"],["day","Hoje"],["week","Semana"],["month","Mês"],["anniversary","Neste dia"]] as const;
  const memories=selectMemories(state.memories,{period,source,anchor:localDay(new Date(),zone),query:"",timeZone:zone});
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">Timeline</h1><div className="flex flex-wrap gap-2">{periods.map(([value,label])=><button key={value} type="button" aria-pressed={period===value} onClick={()=>setPeriod(value)} className={cn("rounded-full border border-border px-3 py-2 text-xs",period===value&&"bg-primary text-primary-foreground")}>{label}</button>)}</div><label className="block text-xs text-muted-foreground">Origem<select className="mt-1 block w-full rounded-md border border-border bg-card p-2 text-foreground" value={source} onChange={event=>setSource(event.target.value as Source|"all")}><option value="all">Todas</option>{Object.entries(sources).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><MemoryList {...state} memories={memories}/></div>;
}
export function SearchMemories() {
  const state=useMemories(), [query,setQuery]=useState("");
  const memories=selectMemories(state.memories,{period:"all",source:"all",anchor:localDay(new Date(),zone),query,timeZone:zone});
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">Buscar</h1><div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" aria-label="Buscar memórias" placeholder="Título, texto ou tag" value={query} onChange={event=>setQuery(event.target.value)}/></div><MemoryList {...state} memories={memories}/></div>;
}
