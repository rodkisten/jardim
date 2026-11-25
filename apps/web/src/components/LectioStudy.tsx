import { useEffect, useRef, useState } from "react";
import { Button } from "@rodkisten/girassol/react";
import { Sparkles } from "lucide-react";
import Dexie, { type Table } from "dexie";
import { isPreview } from "../utils/preview";

const stageNames=["lectio","meditatio","oratio","contemplatio","actio"];
export function studyForStage(text:string,step:number){const sections=text.split(/(?=^#{1,3}\s+.*(?:Lectio|Meditatio|Oratio|Contemplatio|Actio)\b)/gim);return sections.find(section=>new RegExp("^#{1,3}.*\\b"+stageNames[step]+"\\b","i").test(section))??text;}

type Study = { date:string; text:string; generatedAt:string };
class StudyDB extends Dexie {
 studies!: Table<Study,string>;
 constructor(){super("jardim-lectio-studies");this.version(1).stores({studies:"date"});}
}
const db=new StudyDB();
export function LectioStudy({date,enabled,step}:{date:string;enabled:boolean;step:number}){
 const [study,setStudy]=useState("");
 const [busy,setBusy]=useState(false);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState("");
 const [saved,setSaved]=useState(false);
 const [showAll,setShowAll]=useState(false);
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>{let active=true;db.studies.get(date).then(async row=>{if(!row&&!isPreview&&navigator.onLine&&active){try{const r=await fetch("/faith/lectio?date="+encodeURIComponent(date),{credentials:"same-origin"});if(r.ok&&r.headers.get("content-type")?.includes("text/plain")){const text=await r.text();if(text.trim()&&text.length<=100000){row={date,text,generatedAt:new Date().toISOString()};await db.studies.put(row);}}}catch{/* Local-first fallback. */}}if(active){setStudy(row?.text??"");setSaved(!!row);setReady(true);}}).catch(()=>{if(active){setReady(true);setError("Cache local indisponível.");}});return()=>{active=false;controller.current?.abort();};},[date]);
 async function generate(){
  if(controller.current||isPreview)return;
  const abort=new AbortController();controller.current=abort;
  setBusy(true);setError("");setStudy("");setSaved(false);
  try{
   const response=await fetch("/faith/lectio?date="+encodeURIComponent(date),{method:"POST",credentials:"same-origin",signal:abort.signal});
   if(!response.ok||!response.body||!response.headers.get("content-type")?.includes("text/plain"))throw Error(response.status===401?"Entre novamente no Jardim.":"Estudo indisponível. Tente novamente.");
   const reader=response.body.getReader(),decoder=new TextDecoder();let output="";
   try{while(true){const {done,value}=await reader.read();if(done)break;output+=decoder.decode(value,{stream:true});if(output.length>100000)throw Error("Estudo excedeu o limite.");setStudy(output);}output+=decoder.decode();}finally{await reader.cancel().catch(()=>undefined);reader.releaseLock();}
   if(!output.trim())throw Error("O modelo não retornou um estudo.");
   setStudy(output);await db.studies.put({date,text:output,generatedAt:new Date().toISOString()});setSaved(true);
  }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:"Não foi possível gerar o estudo.");}
  finally{controller.current=null;setBusy(false);}
 }
 return <section className="space-y-3 rounded-lg border border-border p-3">
 <div className="flex items-center gap-2"><Sparkles className="size-4 text-primary"/><h4 className="font-medium">Palavra e contexto</h4></div>
 <p className="text-xs text-muted-foreground">Estudo assistido por IA, não um ensinamento oficial da Igreja.</p>
 {isPreview&&!study&&<p className="text-sm text-muted-foreground">Geração disponível apenas no Jardim autenticado.</p>}
 {!isPreview&&!saved&&!busy&&<Button disabled={!ready||!enabled} onClick={()=>void generate()}>Gerar estudo bíblico</Button>}
 {busy&&<Button variant="outline" onClick={()=>controller.current?.abort()}>Cancelar geração</Button>}
 {study&&!busy&&<button className="text-xs text-primary" onClick={()=>setShowAll(!showAll)}>{showAll?"Mostrar etapa atual":"Mostrar estudo completo"}</button>}
 {study&&<div className="space-y-2" aria-busy={busy}>{(showAll||busy?study:studyForStage(study,step)).split("\n").map((line,i)=>/^#{1,6} /.test(line)?<h5 key={i} className="pt-2 font-semibold text-primary">{line.replace(/^#+ /,"")}</h5>:<p key={i} className="whitespace-pre-wrap font-serif text-base leading-loose">{line}</p>)}</div>}
 {saved&&<p className="text-xs text-muted-foreground">Estudo salvo para leitura offline.</p>}
 {!saved&&!busy&&study&&<p className="text-xs text-muted-foreground">Estudo parcial, não salvo.</p>}
 {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
 </section>;
}
