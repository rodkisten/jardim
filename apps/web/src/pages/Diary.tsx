import { prepareImages,type CompressionResult } from "../utils/image-compression";
import { defaultImageOptions } from "../utils/image-options";
import { CompressionPanel } from "../components/CompressionPanel";
import { useState,useEffect,useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button,Input } from "@rodkisten/girassol/react";
import { PublicationNotes } from "../components/PublicationNotes";
import { combineNotes,newNote } from "../utils/notes";
import { db } from "../utils/db";
import { DRAFT_KEY } from "../utils/draft";
import { loadComposer,saveComposer,clearComposer,appendAttachments,type ComposerSnapshot } from "../utils/composer-store";
import { setUpdateBlocker } from "../utils/update-guard";
import { Memory,mediaTypes } from "@rodkisten/jardim-contracts";
import { ComposerMedia } from "../components/ComposerMedia";
import { LinkPreviews } from "../components/LinkPreviews";
export function Diary(){
 const [options,setOptions]=useState(defaultImageOptions),[results,setResults]=useState<CompressionResult[]>([]),[progress,setProgress]=useState(""),[processing,setProcessing]=useState(false);
 const [snapshot,setSnapshot]=useState<ComposerSnapshot|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[storageError,setStorageError]=useState(false),[pending,setPending]=useState(false);
 const current=useRef<ComposerSnapshot|null>(null),queue=useRef<Promise<unknown>>(Promise.resolve());
 const navigate=useNavigate();
 useEffect(()=>{let active=true;loadComposer().then(value=>{if(active){const restored={...value,notes:value.notes?.length?value.notes:[{...newNote(),body:value.draft.body,document:value.draft.document}]};current.current=restored;setSnapshot(restored);}}).catch(()=>{if(active)setError("Não foi possível recuperar o rascunho.");});return()=>{active=false;};},[]);
 function change(value:ComposerSnapshot){
 current.current=value;setSnapshot(value);setPending(true);setUpdateBlocker("composer",true);
 const write=queue.current.catch(()=>undefined).then(()=>saveComposer(value));queue.current=write;
 void write.then(()=>{if(current.current===value){setPending(false);setStorageError(false);setUpdateBlocker("composer",false);}}).catch(()=>{if(current.current===value){setPending(false);setStorageError(true);}});
 }
 async function submit(event:React.FormEvent<HTMLFormElement>){
 event.preventDefault();if(busy||processing||!current.current)return;setBusy(true);setUpdateBlocker("composer-submit",true);setError("");
 const value=current.current;
 try{
 await queue.current;
 const draft=value.notes?combineNotes(value.draft,value.notes):value.draft;
 const input={title:draft.title,body:draft.body,tags:[...new Set(draft.tags.split(",").map(tag=>tag.trim()).filter(Boolean))],richDocument:draft.document??undefined};
 Memory.parse({...input,id:crypto.randomUUID(),createdAt:new Date().toISOString()});
 await db.plant(input,value.attachments.map(({blob,name})=>({blob,name})));
 await clearComposer();
 try{localStorage.removeItem(DRAFT_KEY);}catch{/* Legacy draft cleanup is best effort. */}
 setUpdateBlocker("composer",false);await navigate({to:"/timeline"});
 }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar.");}finally{setBusy(false);setUpdateBlocker("composer-submit",false);}
 }
 if(!snapshot)return <p role="status">{error||"Recuperando rascunho…"}</p>;
 const {draft,attachments}=snapshot;
 return <form className="space-y-4" onSubmit={submit}>
 <h1 className="text-2xl font-semibold">Nova memória</h1>
 <p role="status" className="text-xs text-muted-foreground">{storageError?"Rascunho não persistido":pending?"Salvando rascunho…":"Rascunho disponível offline"}</p>
 <fieldset disabled={busy} className="space-y-4">
 <label className="block space-y-1 text-sm">Título<Input required maxLength={160} value={draft.title} onChange={e=>change({...snapshot,draft:{...draft,title:e.target.value}})}/></label>
 <PublicationNotes notes={snapshot.notes??[]} onChange={notes=>{const latest=current.current;if(latest)change({...latest,notes,draft:combineNotes(latest.draft,notes)});}}/>
 <label className="block space-y-1 text-sm">Tags<Input value={draft.tags} onChange={e=>change({...snapshot,draft:{...draft,tags:e.target.value}})}/></label>
 <LinkPreviews text={draft.body}/>
 <CompressionPanel options={options} onChange={setOptions} results={results} progress={progress} onClear={()=>setResults([])}/>
 <ComposerMedia attachments={attachments} onError={setError} onFiles={async files=>{if(processing)return;setProcessing(true);setUpdateBlocker("image-compression",true);try{const optimized=await prepareImages(files,options,(done,total)=>setProgress("Processando "+done+" de "+total));setResults(optimized);const latest=current.current;if(latest)change({...latest,attachments:appendAttachments(latest.attachments,optimized.map(r=>r.file),mediaTypes)});setError("");}catch(err){setError(String(err));}finally{setProgress("");setProcessing(false);setUpdateBlocker("image-compression",false);}}} onRemove={i=>{const latest=current.current;if(latest)change({...latest,attachments:latest.attachments.filter((_,j)=>j!==i)});}}/>
 </fieldset>
 {storageError&&<Button type="button" variant="outline" onClick={()=>change(snapshot)}>Tentar salvar rascunho novamente</Button>}
 {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
 <Button type="submit" disabled={busy||storageError||processing} className="w-full">{busy?"Salvando…":"Plantar memória"}</Button>
 </form>;
}
