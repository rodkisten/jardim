import { useState } from "react";
import { Copy,Check } from "lucide-react";
import { Button } from "@rodkisten/girassol/react";
const tokenPattern=/(\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|async|await|import|export|from|class|interface|type|if|else|for|while|def|fn|pub|struct|impl|SELECT|FROM|WHERE|true|false|null|None)\b|\b\d+(?:\.\d+)?\b)/g;
export const languages=["plaintext","typescript","javascript","python","rust","go","bash","sql","json","html","css","yaml"];
export function Snippet({code,language="plaintext"}:{code:string;language?:string}){
 const [copied,setCopied]=useState(false),[error,setError]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(code);setCopied(true);setError(false);}catch{setError(true);}}
 return <section className="overflow-hidden rounded-lg border border-border bg-muted"><header className="flex items-center justify-between border-b border-border px-3 py-1"><span className="text-xs text-muted-foreground">{language}</span><Button type="button" variant="ghost" size="sm" onClick={()=>void copy()}>{copied?<Check className="size-4"/>:<Copy className="size-4"/>}{copied?"Copiado":"Copiar"}</Button></header><pre className="overflow-auto p-3 text-sm"><code>{language==="plaintext"?code:code.split(tokenPattern).map((part,i)=><span key={i} className={i%2===0?"":/^(\/\/|#)/.test(part)?"text-muted-foreground":/^["'`]/.test(part)?"text-emerald-400":/^\d/.test(part)?"text-amber-400":"text-violet-400"}>{part}</span>)}</code></pre>{error&&<p role="alert" className="px-3 text-xs">Não foi possível copiar. Selecione o código manualmente.</p>}</section>;
}
