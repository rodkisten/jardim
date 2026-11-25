import { LectioStudy } from "./LectioStudy";
import { useEffect, useState } from "react";
import { Button, Card, CardContent } from "@rodkisten/girassol/react";
import { BookOpen, Heart, Sunrise, Sprout, Brain } from "lucide-react";
import Dexie, { type Table } from "dexie";

type Journey = { date: string; step: number; notes: string[]; completed: boolean };
class LectioDB extends Dexie {
 journeys!: Table<Journey, string>;
 constructor(){super("jardim-lectio");this.version(1).stores({journeys:"date"});}
}
const store = new LectioDB();
const stages = [
 {name:"Lectio", subtitle:"Leitura", icon:BookOpen, question:"O que o texto diz?"},
 {name:"Meditatio", subtitle:"Meditação", icon:Brain, question:"O que esta Palavra desperta em mim?"},
 {name:"Oratio", subtitle:"Oração", icon:Heart, question:"O que desejo dizer a Deus?"},
 {name:"Contemplatio", subtitle:"Contemplação", icon:Sunrise, question:"Permaneça em silêncio, sem pressa."},
 {name:"Actio", subtitle:"Ação", icon:Sprout, question:"Qual atitude concreta posso assumir hoje?"}
];
export function Lectio({date,passages}:{date:string;passages:{label:string;content:string}[]}){
 const [journey,setJourney]=useState<Journey>({date,step:0,notes:["","","","",""],completed:false});
 const [ready,setReady]=useState(false);
 const [error,setError]=useState("");
 const [remaining,setRemaining]=useState(120);
 const [running,setRunning]=useState(false);
 useEffect(()=>{let active=true;store.journeys.get(date).then(value=>{if(active){if(value)setJourney(value);setReady(true);}}).catch(()=>{if(active)setError("Não foi possível abrir suas reflexões locais.");});return()=>{active=false;};},[date]);
 useEffect(()=>{if(!running)return;const timer=setTimeout(()=>{setRemaining(Math.max(0,remaining-1));if(remaining<=1)setRunning(false);},1000);return()=>clearTimeout(timer);},[running,remaining]);
 async function update(next:Journey){setJourney(next);try{await store.journeys.put(next);setError("");}catch{setError("Não foi possível salvar neste dispositivo.");}}
 const stage=stages[journey.step], Icon=stage.icon;
 return <Card><CardContent className="space-y-4">
 <div className="flex items-center gap-3"><BookOpen className="size-6 text-primary"/><div><h2 className="text-xl font-semibold">Lectio</h2><p className="text-sm text-muted-foreground">Da Palavra à vida</p></div></div>
 <div className="grid grid-cols-5 gap-1" aria-label="Etapas da jornada">{stages.map((s,i)=><button key={s.name} type="button" disabled={!ready} aria-label={s.name} aria-current={i===journey.step?"step":undefined} onClick={()=>{setRunning(false);void update({...journey,step:i});}} className={i===journey.step?"h-2 rounded-full bg-primary":"h-2 rounded-full bg-muted"}/>)}</div>
 <div className="flex items-center gap-2"><Icon className="size-5 text-primary"/><h3 className="font-semibold">{stage.name} · {stage.subtitle}</h3><span className="ml-auto text-xs text-muted-foreground">{journey.step+1}/5</span></div>
 <p className="text-sm">{stage.question}</p>
 {journey.step===0&&(passages.length?passages.map((p,i)=><details key={i}><summary className="text-sm font-medium">{p.label}</summary><p className="mt-2 whitespace-pre-wrap text-sm">{p.content}</p></details>):<p className="text-sm text-muted-foreground">Aguardando as leituras do dia.</p>)}
 {journey.step===3&&<div className="space-y-2 text-center"><p className="text-4xl tabular-nums">{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,"0")}</p><Button variant="outline" onClick={()=>{if(!remaining)setRemaining(120);setRunning(!running);}}>{running?"Pausar":"Iniciar silêncio"}</Button><Button variant="ghost" onClick={()=>{setRunning(false);setRemaining(120);}}>Reiniciar</Button></div>}
 <LectioStudy date={date} enabled={passages.length>0}/>
 <textarea aria-label="Reflexão pessoal" disabled={!ready} value={journey.notes[journey.step]} onChange={e=>{const notes=[...journey.notes];notes[journey.step]=e.target.value;void update({...journey,notes});}} placeholder="Escreva sua reflexão…" className="min-h-24 w-full rounded-md border border-border bg-background p-3 text-base"/>
 <p className="text-xs text-muted-foreground">Reflexões privadas, salvas apenas neste dispositivo.</p>
 {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
 <div className="flex justify-between"><Button variant="outline" disabled={!ready||journey.step===0} onClick={()=>{setRunning(false);void update({...journey,step:journey.step-1});}}>Voltar</Button><Button disabled={!ready} onClick={()=>{setRunning(false);void update(journey.step===4?{...journey,completed:true}:{...journey,step:journey.step+1});}}>{journey.step===4?"Concluir":"Continuar"}</Button></div>
 {journey.completed&&<p role="status" className="text-sm text-primary">Jornada concluída. Você pode revisitá-la quando quiser.</p>}
 </CardContent></Card>;
}
