import { prepareImages,type ImageFormat } from "../utils/image-compression";
import { useState,useEffect,useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button,Input } from "@rodkisten/girassol/react";
import { DiaryEditor } from "../components/DiaryEditor";
import { db } from "../utils/db";
import { DRAFT_KEY } from "../utils/draft";
import { loadComposer,saveComposer,clearComposer,appendAttachments,type ComposerSnapshot } from "../utils/composer-store";
import { setUpdateBlocker } from "../utils/update-guard";
import { Memory,mediaTypes } from "@rodkisten/jardim-contracts";
import { ComposerMedia } from "../components/ComposerMedia";
import { LinkPreviews } from "../components/LinkPreviews";
export function Diary(){
 const [format,setFormat]=useState<ImageFormat>("webp"),[processing,setProcessing]=useState(false);
 const [snapshot,setSnapshot]=useState<ComposerSnapshot|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[storageError,setStorageError]=useState(false),[pending,setPending]=useState(false);
 const current=useRef<ComposerSnapshot|null>(null),queue=useRef<Promise<unknown>>(Promise.resolve());
 const navigate=useNavigate();
 useEffect(()=>{let active=true;loadComposer().then(value=>{if(active){current.current=value;setSnapshot(value);}}).catch(()=>{if(active)setError("Não foi possível recuperar o rascunho.");});return()=>{active=false;};},[]);
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
 const draft=value.draft;
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
 <DiaryEditor draft={draft} onChange={(body,document)=>{const latest=current.current;if(latest)change({...latest,draft:{...latest.draft,body,document}});}}/>
 <label className="block space-y-1 text-sm">Tags<Input value={draft.tags} onChange={e=>change({...snapshot,draft:{...draft,tags:e.target.value}})}/></label>
 <LinkPreviews text={draft.body}/>
 <label className="flex items-center justify-between text-xs text-muted-foreground">Compressão de fotos<select value={format} onChange={e=>setFormat(e.target.value as ImageFormat)}><option value="webp">WebP</option><option value="avif">AVIF</option></select></label>
 {processing&&<p role="status">Otimizando imagens neste dispositivo…</p>}
 <ComposerMedia attachments={attachments} onError={setError} onFiles={async files=>{if(processing)return;setProcessing(true);setUpdateBlocker("image-compression",true);try{const optimized=await prepareImages(files,format);const latest=current.current;if(latest)change({...latest,attachments:appendAttachments(latest.attachments,optimized,mediaTypes)});setError("");}catch(err){setError(String(err));}finally{setProcessing(false);setUpdateBlocker("image-compression",false);}}} onRemove={i=>{const latest=current.current;if(latest)change({...latest,attachments:latest.attachments.filter((_,j)=>j!==i)});}}/>
 </fieldset>
 {storageError&&<Button type="button" variant="outline" onClick={()=>change(snapshot)}>Tentar salvar rascunho novamente</Button>}
 {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
 <Button type="submit" disabled={busy||storageError||processing} className="w-full">{busy?"Salvando…":"Plantar memória"}</Button>
 </form>;
}
