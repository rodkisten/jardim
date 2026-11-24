import { Link } from "@tanstack/react-router";
import { Attachment } from "./Attachment";
import { attachmentIds } from "../utils/attachments";
import { BookOpen, Music2, Video, CloudSun, Image } from "lucide-react";
import { Badge, Card, CardContent } from "@rodkisten/girassol/react";
import type { Memory } from "@rodkisten/jardim-contracts";
import { memorySource, sources } from "../utils/timeline";
const icons = {diary:BookOpen, youtube:Video, spotify:Music2, culture:Image, weather:CloudSun};
export function MemoryCard({memory}:{memory:Memory}) {
  const source=memorySource(memory), Icon=icons[source];
  const body=memory.body.replace(/\[anexo:[^\]]+\]/g,"").trim();
  return <Card className="gap-2 py-3"><CardContent className="space-y-2">
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4 text-primary"/>{sources[source]}<span className="ml-auto">{new Date(memory.createdAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span></div>
    <h3 className="break-words font-medium"><Link to="/memories/$id" params={{id:memory.id}}>{memory.title}</Link></h3>
    {body && <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{body}</p>}
    {attachmentIds(memory.body).slice(0,1).map(id=><Attachment key={id} id={id}/>)}
    {!!memory.tags.length && <div className="flex flex-wrap gap-1">{memory.tags.map((tag,i)=><Badge key={i} variant="secondary">{tag}</Badge>)}</div>}
  </CardContent></Card>;
}
