import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { integrationRequest } from '../utils/integrations';
export function useOracle<T>(feature:'astro',context:(value:T)=>Record<string,unknown>){
 return useMutation({retry:false,gcTime:0,mutationFn:async(value:T)=>z.object({text:z.string(),model:z.string()}).parse(await integrationRequest('/v2/oracle/'+feature,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...context(value),consent:true})}))});
}
