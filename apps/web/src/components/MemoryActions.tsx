import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button, Input } from "@rodkisten/girassol/react";
import type { Memory } from "@rodkisten/jardim-contracts";
import { DiaryEditor } from "./DiaryEditor";
import { db } from "../utils/db";
import { attachmentIds } from "../utils/attachments";
import type { Draft } from "../utils/draft";
export function MemoryActions({memory}:{memory:Memory}){
  const [mode,setMode]=useState<"idle"|"edit"|"delete">("idle"),[draft,setDraft]=useState<Draft|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const navigate=useNavigate();
  function edit(){setDraft({title:memory.title,body:memory.body.replace(/\[anexo:[a-f0-9-]{36}\]/gi,"").trim(),tags:memory.tags.join(", "),document:memory.richDocument??null});setMode("edit");}
  async function apply(){
    if(busy)return;setBusy(true);setError("");
    try{
      if(mode==="delete"){await db.change(memory.id,null);await navigate({to:"/timeline"});}
      else if(draft){await db.change(memory.id,{title:draft.title,body:[draft.body,...attachmentIds(memory.body).map(id=>"[anexo:"+id+"]")].join("\n\n"),tags:[...new Set(draft.tags.split(",").map(tag=>tag.trim()).filter(Boolean))],richDocument:draft.document??undefined});setMode("idle");}
    }catch(error){setError(error instanceof Error?error.message:"Não foi possível alterar a memória.");}finally{setBusy(false);}
  }
  return <section className="space-y-3">{mode==="idle"?<div className="flex gap-2"><Button variant="outline" onClick={edit}>Editar</Button><Button variant="outline" onClick={()=>setMode("delete")}>Excluir</Button></div>:<div className="space-y-3 rounded-xl border border-border p-3">{mode==="edit"&&draft?<><Input aria-label="Título" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/><DiaryEditor draft={draft} onChange={(body,document)=>setDraft(previous=>previous?{...previous,body,document}:previous)}/><Input aria-label="Tags" value={draft.tags} onChange={e=>setDraft({...draft,tags:e.target.value})}/></>:<p>Excluir esta memória? A alteração será registrada localmente.</p>}<div className="flex gap-2"><Button disabled={busy} onClick={()=>void apply()}>{busy?"Salvando…":mode==="delete"?"Confirmar exclusão":"Salvar alterações"}</Button><Button variant="ghost" disabled={busy} onClick={()=>setMode("idle")}>Cancelar</Button></div></div>}{error&&<p role="alert">{error}</p>}</section>;
}
