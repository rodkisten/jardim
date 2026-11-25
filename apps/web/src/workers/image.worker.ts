import encodeAvif from "@jsquash/avif/encode.js";
import encodeWebp from "@jsquash/webp/encode.js";
import { normalizeImageOptions,type ImageOptions } from "../utils/image-options";
type Job={id:number;file:File;options:ImageOptions};
self.addEventListener("message",async(raw:Event)=>{
 const event=raw as MessageEvent<Job>;
 const {id,file}=event.data;const {format,quality,maxDimension}=normalizeImageOptions(event.data.options);
 try{
 const bitmap=await createImageBitmap(file);
 let image:ImageData;
 try{const scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height));const canvas=new OffscreenCanvas(Math.max(1,Math.round(bitmap.width*scale)),Math.max(1,Math.round(bitmap.height*scale)));const ctx=canvas.getContext("2d");if(!ctx)throw Error("Canvas indisponível");ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);image=ctx.getImageData(0,0,canvas.width,canvas.height);}finally{bitmap.close();}
 const bytes=format==="avif"?await encodeAvif(image,{quality,speed:6}):await encodeWebp(image,{quality});
 self.postMessage({id,bytes,format});
 }catch(e){self.postMessage({id,error:e instanceof Error?e.message:String(e)});}
});
