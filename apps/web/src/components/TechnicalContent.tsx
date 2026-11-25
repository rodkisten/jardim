import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
let renderQueue=Promise.resolve();
export function TechnicalContent({language,source}:{language:string;source:string}){
 const [output,setOutput]=useState<ReactNode>(null);
 useEffect(()=>{let cancelled=false;setOutput(null);if(source.length>12000)return;
 if(language==='math'||language==='latex'){void Promise.all([import('katex'),import('katex/dist/katex.min.css')]).then(([k])=>{if(!cancelled)setOutput(<div className="overflow-x-auto" dangerouslySetInnerHTML={{__html:k.default.renderToString(source,{displayMode:true,trust:false,throwOnError:false,maxExpand:200,maxSize:10})}}/>);}).catch(()=>{});}
 else if(language==='mermaid'){renderQueue=renderQueue.then(async()=>{if(cancelled)return;const {default:m}=await import('mermaid');m.initialize({startOnLoad:false,securityLevel:'strict',theme:'dark',maxTextSize:12000,maxEdges:100,suppressErrorRendering:true});const result=await m.render('jardim-'+crypto.randomUUID(),source);if(!cancelled)setOutput(<img alt="Diagrama Mermaid" className="max-w-full" src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(result.svg)}/>);}).catch(()=>{});}
 return()=>{cancelled=true;};
 },[language,source]);
 return <div className="space-y-2 rounded-lg border border-border p-3">{output??<p className="text-xs text-muted-foreground">Prévia indisponível ou carregando.</p>}<details><summary className="text-xs">Código fonte</summary><pre className="overflow-auto text-xs">{source}</pre></details></div>;
}
