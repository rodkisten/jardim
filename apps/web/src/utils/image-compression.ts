import { defaultImageOptions,normalizeImageOptions,isAnimatedWebp,isAnimatedPng,type ImageOptions } from "./image-options";
export type { ImageFormat } from "./image-options";
export type CompressionResult={original:File;file:File;status:"optimized"|"preserved"|"fallback";reason:string};
export function shouldCompress(file:Pick<File,"type">){return ["image/jpeg","image/png","image/webp","image/avif","image/heic","image/heif"].includes(file.type);}
export async function optimizeImage(file:File,options:ImageOptions=defaultImageOptions):Promise<CompressionResult>{
 const keep=(status:CompressionResult["status"],reason:string):CompressionResult=>({original:file,file,status,reason});
 if(!shouldCompress(file))return keep("preserved","Formato preservado");
 // Preserve potentially animated formats; AVIF sequences and APNG are not flattened.
 if(file.type==="image/avif"||(file.type==="image/png"&&isAnimatedPng(new Uint8Array(await file.arrayBuffer()))))return keep("preserved","Formato preservado para evitar perda de animação");
 if(file.type==="image/webp"&&isAnimatedWebp(new Uint8Array(await file.arrayBuffer())))return keep("preserved","WebP animado preservado");
 if(typeof Worker==="undefined")return keep("fallback","Worker indisponível");
 let worker:Worker|undefined;
 try{
 const settings=normalizeImageOptions(options);
 worker=new Worker(new URL("../workers/image.worker.ts",import.meta.url),{type:"module"});
 const active=worker;
 const bytes=await new Promise<ArrayBuffer>((resolve,reject)=>{
 const timer=setTimeout(()=>reject(Error("Compressão excedeu o tempo limite")),60000);
 active.onmessage=(event:MessageEvent<{bytes?:ArrayBuffer;error?:string}>)=>{clearTimeout(timer);if(event.data.bytes)resolve(event.data.bytes);else reject(Error(event.data.error||"Codec indisponível"));};
 active.onerror=(event)=>{clearTimeout(timer);reject(Error(event.message||"Falha ao carregar worker ou WASM"));};
 active.onmessageerror=()=>{clearTimeout(timer);reject(Error("Resposta inválida do worker"));};
 active.postMessage({id:1,file,options:settings});
 });
 if(!bytes.byteLength)throw Error("Encoder retornou arquivo vazio");
 if(bytes.byteLength>=file.size)return keep("preserved","Original menor que o resultado");
 return {original:file,file:new File([bytes],file.name.replace(/\.[^.]+$/,"")+"."+settings.format,{type:"image/"+settings.format,lastModified:file.lastModified}),status:"optimized",reason:"Compressão WASM"};
 }catch(e){return keep("fallback",e instanceof Error?e.message:"Falha na compressão");}finally{worker?.terminate();}
}
export async function prepareImages(files:File[],options:ImageOptions,onProgress?:(done:number,total:number)=>void){const output:CompressionResult[]=[];for(const file of files){output.push(await optimizeImage(file,options));onProgress?.(output.length,files.length);}return output;}
