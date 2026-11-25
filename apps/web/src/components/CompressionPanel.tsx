import type {ComposerAttachment} from "../utils/composer-store";
import { useEffect,useState } from "react";
import { Card,CardContent,Button } from "@rodkisten/girassol/react";
import { type ImageOptions,savings } from "../utils/image-options";
import { type CompressionResult } from "../utils/image-compression";
function Preview({file}:{file:File}){const [url,setUrl]=useState("");useEffect(()=>{const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file]);return url?<img src={url} alt={file.name} className="aspect-square w-full rounded object-contain bg-muted"/>:null;}
const kb=(n:number)=>(n/1024).toFixed(1)+" KB";
export function CompressionPanel({options,onChange,results,progress,onClear,attachments,processing,onRecompress}:{options:ImageOptions;onChange:(value:ImageOptions)=>void;results:CompressionResult[];progress:string;onClear:()=>void;attachments:ComposerAttachment[];processing:boolean;onRecompress:(id:string)=>void}){
return <Card><CardContent className="space-y-3"><h3 className="font-medium">Otimização de imagens</h3><p className="text-xs text-muted-foreground">Processamento local · WASM</p>
<div className="grid grid-cols-2 gap-2 text-sm"><label>Formato<select className="block w-full rounded border border-border bg-card p-2" value={options.format} onChange={e=>onChange({...options,format:e.target.value==="avif"?"avif":"webp"})}><option value="webp">WebP</option><option value="avif">AVIF</option></select></label><label>Dimensão máxima<select className="block w-full rounded border border-border bg-card p-2" value={options.maxDimension} onChange={e=>onChange({...options,maxDimension:Number(e.target.value)})}>{[1024,2048,3072,4096].map(n=><option key={n}>{n}</option>)}</select></label></div>
<label className="block text-sm">Qualidade · {options.quality}%<input type="range" min={1} max={100} value={options.quality} onChange={e=>onChange({...options,quality:Number(e.target.value)})} className="block w-full accent-primary"/></label>
{attachments.filter(a=>a.id&&a.blob.type.startsWith("image/")&&a.blob.type!=="image/gif").map(a=><div key={a.id} className="flex items-center justify-between gap-2 rounded border border-border p-2"><div className="min-w-0"><p className="truncate text-sm">{a.name}</p><p className="text-xs text-muted-foreground">{kb(a.blob.size)} · {a.original? "Original disponível":"Fonte atual"}</p></div><Button type="button" size="sm" variant="outline" disabled={processing} onClick={()=>onRecompress(a.id!)}>Recomprimir</Button></div>)}
{progress&&<p role="status" className="text-sm">{progress}</p>}
{results.filter(r=>r.original.type.startsWith("image/")).map((r,i)=><article key={i} className="space-y-2 border-t border-border pt-3"><div className="grid grid-cols-2 gap-2"><div><Preview file={r.original}/><p className="text-xs">Original · {kb(r.original.size)}</p></div><div><Preview file={r.file}/><p className="text-xs">Resultado · {kb(r.file.size)}</p></div></div><p className="text-sm text-primary">{savings(r.original.size,r.file.size)}% de economia</p><p className="text-xs text-muted-foreground">{r.reason}</p></article>)}
{results.length>0&&<Button type="button" variant="ghost" size="sm" onClick={onClear}>Limpar comparações</Button>}
</CardContent></Card>;
}
