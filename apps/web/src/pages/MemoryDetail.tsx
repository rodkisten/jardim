import { Link } from "@tanstack/react-router";
import { Badge } from "@rodkisten/girassol/react";
import { useMemories } from "../hooks/useMemories";
import { RichMemory } from "../components/RichMemory";
import { Attachment } from "../components/Attachment";
import { attachmentIds } from "../utils/attachments";
export function MemoryDetail({id}:{id:string}){
  const {memories,loading,error}=useMemories();
  const memory=memories.find(item=>item.id===id);
  return <article className="space-y-4"><Link to="/timeline" className="text-sm text-primary">Voltar à timeline</Link>{error?<p role="alert">{error}</p>:loading?<p role="status">Carregando…</p>:!memory?<p>Memória indisponível neste dispositivo.</p>:<><p className="text-xs text-muted-foreground">{new Date(memory.createdAt).toLocaleString("pt-BR")}</p><h1 className="text-2xl font-semibold break-words">{memory.title}</h1><RichMemory memory={memory}/>{attachmentIds(memory.body).map(id=><Attachment key={id} id={id}/>)}<div className="flex flex-wrap gap-1">{memory.tags.map((tag,i)=><Badge key={i} variant="secondary">{tag}</Badge>)}</div></>}</article>;
}
