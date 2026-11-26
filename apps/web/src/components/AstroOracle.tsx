import { useModules } from '../hooks/useModules';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { calculateSky } from '../utils/astro-engine';
import { integrationRequest } from '../utils/integrations';
export function AstroOracle({instant}:{instant:string}){
 const preferences=useModules();
 const [consent,setConsent]=useState(false);
 const result=useMutation({mutationFn:async(value:string)=>{const positions=calculateSky(value).positions.map(({name,sign,degree,retrograde})=>({name,sign,degree,retrograde}));return z.object({text:z.string(),model:z.string()}).parse(await integrationRequest('/v2/oracle/astro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,positions})}));}});
 if(!preferences.oracle||!preferences.oracleAstro)return null;
 return <section className="astro-panel space-y-3 rounded-2xl border p-4"><h2 className="jardim-editorial text-xl">Oráculo · IA</h2><p className="text-sm">Reflexão simbólica sobre as posições do céu selecionado. Não é previsão nem análise científica.</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Autorizo enviar somente as posições planetárias calculadas à IA da Cloudflare. Não serão enviados nome, cidade, data de nascimento ou diário.</label><button type="button" disabled={!consent||result.isPending} className="rounded-lg border border-violet-400/40 px-3 py-2 text-sm disabled:opacity-50" onClick={()=>{if(consent){result.mutate(instant);setConsent(false);}}}>{result.isPending?'Gerando…':'Gerar reflexão'}</button>{result.isError&&<p role="alert">IA indisponível. Tente novamente.</p>}{result.data&&<div className="space-y-2"><p className="whitespace-pre-wrap text-sm">{result.data.text}</p><p className="text-xs">{result.data.model}</p><button type="button" onClick={()=>result.reset()} className="text-xs underline">Limpar reflexão</button></div>}</section>;
}
