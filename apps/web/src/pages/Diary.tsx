import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button, Input } from "@rodkisten/girassol/react";
import { DiaryEditor } from "../components/DiaryEditor";
import { db } from "../utils/db";
import { readDraft, saveDraft, DRAFT_KEY } from "../utils/draft";
import { Memory, mediaTypes } from "@rodkisten/jardim-contracts";
export function Diary() {
  const [draft,setDraft]=useState(readDraft),[files,setFiles]=useState<File[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[storageError,setStorageError]=useState(false);
  const navigate=useNavigate();
  useEffect(()=>{try{saveDraft(draft);setStorageError(false);}catch{setStorageError(true);}},[draft]);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;setBusy(true);setError("");
    try {
      const input={title:draft.title,body:draft.body,tags:[...new Set(draft.tags.split(",").map(tag=>tag.trim()).filter(Boolean))],richDocument:draft.document??undefined};
      Memory.parse({...input,id:crypto.randomUUID(),createdAt:new Date().toISOString()});
      await db.plant(input,files.map(blob=>({blob,name:blob.name})));
      try{localStorage.removeItem(DRAFT_KEY);}catch { /* Optional operation failed; retain the existing local state. */ }
      await navigate({to:"/timeline"});
    }catch(error){setError(error instanceof Error?error.message:"Não foi possível salvar.");}finally{setBusy(false);}
  }
  return <form className="space-y-4" onSubmit={submit}><h1 className="text-2xl font-semibold">Nova memória</h1><p className="text-sm text-muted-foreground">Seu diário, mesmo offline.</p><label className="block space-y-1 text-sm">Título<Input required maxLength={160} value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></label><DiaryEditor draft={draft} onChange={(body,document)=>setDraft(d=>({...d,body,document}))}/><label className="block space-y-1 text-sm">Tags<Input value={draft.tags} placeholder="Separe por vírgulas" onChange={e=>setDraft(d=>({...d,tags:e.target.value}))}/></label><label className="block space-y-1 text-sm">Anexos<input type="file" multiple accept={mediaTypes.join(",")} onChange={e=>setFiles(Array.from(e.target.files??[]))} className="block w-full text-sm"/></label>{files.length>0&&<p className="text-xs text-muted-foreground">{files.length} arquivo(s) selecionado(s)</p>}{storageError&&<p role="alert">Não foi possível persistir o rascunho neste dispositivo.</p>}{error&&<p role="alert" className="text-sm">{error}</p>}<Button type="submit" disabled={busy} className="w-full">{busy?"Salvando…":"Plantar memória"}</Button></form>;
}
