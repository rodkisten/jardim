export type ImageFormat="avif"|"webp";
export function shouldCompress(file:Pick<File,"type">){return ["image/jpeg","image/png","image/webp","image/avif","image/heic","image/heif"].includes(file.type);}
export async function compressImage(file:File,format:ImageFormat="webp"):Promise<File>{
 if(!shouldCompress(file)||typeof Worker==="undefined")return file;
 let worker:Worker|undefined;
 try{
 worker=new Worker(new URL("../workers/image.worker.ts",import.meta.url),{type:"module"});
 const active=worker;
 const bytes=await new Promise<ArrayBuffer>((resolve,reject)=>{
 const timer=setTimeout(()=>reject(Error("Compressão excedeu o tempo limite")),60000);
 active.onmessage=(event:MessageEvent<{bytes?:ArrayBuffer;error?:string}>)=>{clearTimeout(timer);if(event.data.bytes)resolve(event.data.bytes);else reject(Error(event.data.error||"Codec indisponível"));};
 active.onerror=()=>{clearTimeout(timer);reject(Error("Worker indisponível"));};
 active.postMessage({id:1,file,format});
 });
 if(bytes.byteLength>=file.size)return file;
 return new File([bytes],file.name.replace(/\.[^.]+$/,"")+"."+format,{type:"image/"+format,lastModified:file.lastModified});
 }catch{return file;}finally{worker?.terminate();}
}
export async function prepareImages(files:File[],format:ImageFormat){const output:File[]=[];for(const file of files)output.push(await compressImage(file,format));return output;}
