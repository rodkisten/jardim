export function OracleResponse({data,error,onClear}:{data?:{text:string;model:string};error:boolean;onClear:()=>void}){
 return <div aria-live="polite">{error&&<p role="alert">IA indisponível. Tente novamente.</p>}{data&&<div className="space-y-2"><p className="whitespace-pre-wrap text-sm">{data.text}</p><p className="text-xs">{data.model}</p><button type="button" onClick={onClear} className="text-xs underline">Limpar reflexão</button></div>}</div>;
}
