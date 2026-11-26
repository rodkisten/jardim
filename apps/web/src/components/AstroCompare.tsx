import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type AstroProfile } from '../utils/astro-db';
import { crossAspects, localProvider } from '../utils/astro-providers';
export function AstroCompare({profiles,instant}:{profiles:AstroProfile[];instant:string}){
 const [mode,setMode]=useState<'synastry'|'transit'>('synastry'),[first,setFirst]=useState(''),[second,setSecond]=useState('');
 const eligible=profiles.filter(p=>p.birthTime&&p.utcOffset);
 const a=eligible.find(p=>p.id===first),b=eligible.find(p=>p.id===second);
 const birth=(p:AstroProfile)=>p.birthDate+'T'+p.birthTime+':00'+p.utcOffset;
 const x=a?birth(a):'',y=mode==='transit'?instant:b?birth(b):'';
 const ready=Boolean(x&&y&&(mode==='transit'||first!==second));
 const result=useQuery({queryKey:['astro-local-comparison',x,y],enabled:ready,queryFn:async()=>crossAspects(await localProvider.sky(x),await localProvider.sky(y)),retry:false,staleTime:60000,gcTime:0});
 const selectClass='w-full rounded-lg border border-violet-400/30 bg-background p-2 text-base';
 return <section className="astro-panel space-y-3 rounded-2xl border p-4"><h2 className="jardim-editorial text-xl">Encontros celestes</h2><div className="flex gap-2">{(['synastry','transit'] as const).map(m=><button key={m} type="button" aria-pressed={mode===m} className="rounded-lg border border-violet-400/40 px-3 py-2 text-sm aria-pressed:bg-violet-500/30" onClick={()=>setMode(m)}>{m==='synastry'?'Sinastria':'Trânsitos'}</button>)}</div><label className="block text-sm">Mapa natal<select className={selectClass} value={first} onChange={e=>setFirst(e.target.value)}><option value="">Selecione um perfil</option>{eligible.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{mode==='synastry'&&<label className="block text-sm">Segundo mapa<select className={selectClass} value={second} onChange={e=>setSecond(e.target.value)}><option value="">Selecione outro perfil</option>{eligible.filter(p=>p.id!==first).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}{mode==='transit'&&<p className="text-xs">Céu selecionado: {instant} (UTC)</p>}{!ready?<p className="text-xs">Escolha perfis com horário e offset UTC preenchidos.</p>:result.isFetching?<p>Calculando…</p>:result.isError?<p role="alert">Não foi possível calcular os aspectos.</p>:<div className="space-y-2"><p className="text-xs">{result.data?.length??0} aspectos · {a?.name} × {mode==='transit'?'Céu selecionado':b?.name}</p>{result.data?.map(t=><div key={t.a+t.b+t.name} className="flex items-center justify-between gap-2 rounded-lg border border-violet-400/20 p-2 text-xs"><span style={{color:t.color}}>{t.glyph} {t.a} × {t.b}</span><span>{t.name} · {t.deviation.toFixed(1)}°</span></div>)}</div>}<p className="text-xs">Cálculo local. Aspectos simbólicos não determinam compatibilidade ou acontecimentos. Provider: Astronomy Engine. Nenhum dado enviado a serviços externos.</p></section>;
}
