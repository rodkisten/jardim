import { VoicePlayer } from "./VoicePlayer";
import { ImageViewer } from "./ImageViewer";
import { useEffect, useState } from "react";
import { Button } from "@rodkisten/girassol/react";
import { db } from "../utils/db";
type Media = {url:string;type:string;name:string};
export function Attachment({id}:{id:string}) {
  const [media,setMedia]=useState<Media|null>(null),[error,setError]=useState(""),[attempt,retry]=useState(0);
  useEffect(()=>{
    let disposed=false, objectUrl="";
    const controller=new AbortController();
    setMedia(null);setError("");
    async function load(){
      try{
        const local=await db.attachments.get(id);
        if(disposed)return;
        if(local){objectUrl=URL.createObjectURL(local.blob);setMedia({url:objectUrl,type:local.blob.type,name:local.name});return;}
        const url="/v2/media/"+encodeURIComponent(id);
        const response=await fetch(url,{method:"HEAD",signal:controller.signal});
        if(!response.ok)throw new Error("Anexo ainda não recebido.");
        if(!disposed)setMedia({url,type:response.headers.get("Content-Type")||"",name:"anexo"});
      }catch(error){if(!disposed)setError(error instanceof Error?error.message:"Não foi possível abrir o anexo.");}
    }
    void load();
    return ()=>{disposed=true;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[id,attempt]);
  if(!media)return <div className="text-xs text-muted-foreground" role="status">{error||"Abrindo anexo…"} {error&&<Button variant="ghost" size="sm" onClick={()=>retry(n=>n+1)}>Tentar novamente</Button>}</div>;
  return <figure className="space-y-1 overflow-hidden rounded-lg">
    {media.type.startsWith("image/")?<ImageViewer url={media.url} name={media.name}/>:media.type.startsWith("video/")?<video className="w-full rounded-lg" src={media.url} controls playsInline preload="none"/>:media.type.startsWith("audio/")?<VoicePlayer url={media.url}/>:null}
    <figcaption><a className="text-xs text-primary" href={media.url} download={media.name}>Baixar original</a></figcaption>
  </figure>;
}
