import { useModules } from '../hooks/useModules';
import { useState } from 'react';
import { useOracle } from '../hooks/useOracle';
import { OracleResponse } from './OracleResponse';
import { calculateSky } from '../utils/astro-engine';
export function AstroOracle({instant}:{instant:string}){
 const preferences=useModules();
 const [consent,setConsent]=useState(false);
 const result=useOracle<string>('astro',value=>({positions:calculateSky(value).positions.map(({name,sign,degree,retrograde})=>({name,sign,degree,retrograde}))}));
 if(!preferences.oracle||!preferences.oracleAstro)return null;
 return <section className="astro-panel space-y-3 rounded-2xl border p-4"><h2 className="jardim-editorial text-xl">Oráculo · IA</h2><p className="text-sm">Reflexão simbólica sobre as posições do céu selecionado. Não é previsão nem análise científica.</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Autorizo enviar somente as posições planetárias calculadas à IA da Cloudflare. Não serão enviados nome, cidade, data de nascimento ou diário.</label><button type="button" disabled={!consent||result.isPending} className="rounded-lg border border-violet-400/40 px-3 py-2 text-sm disabled:opacity-50" onClick={()=>{if(consent){result.mutate(instant);setConsent(false);}}}>{result.isPending?'Gerando…':'Gerar reflexão'}</button>{result.isPending&&<button type="button" onClick={result.cancel} className="rounded-lg border border-violet-400/40 px-3 py-2 text-sm">Parar geração</button>}<OracleResponse data={result.data} error={result.isError} onClear={()=>result.reset()}/></section>;
}
