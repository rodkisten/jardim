export type ImageFormat="avif"|"webp";
export type ImageOptions={format:ImageFormat;quality:number;maxDimension:number};
export const defaultImageOptions:ImageOptions={format:"webp",quality:80,maxDimension:2048};
export function normalizeImageOptions(options:ImageOptions):ImageOptions{return {format:options.format==="avif"?"avif":"webp",quality:Math.min(100,Math.max(1,Math.round(options.quality)||80)),maxDimension:Math.min(4096,Math.max(512,Math.round(options.maxDimension)||2048))};}
export function savings(before:number,after:number){return before>0?Math.max(0,Math.round((1-after/before)*100)):0;}
export function isAnimatedWebp(bytes:Uint8Array){if(bytes.length<12||String.fromCharCode(...bytes.slice(0,4))!=="RIFF"||String.fromCharCode(...bytes.slice(8,12))!=="WEBP")return false;const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);for(let offset=12;offset+8<=bytes.length;){const tag=String.fromCharCode(...bytes.slice(offset,offset+4)),size=view.getUint32(offset+4,true);if(tag==="ANIM"||tag==="ANMF"||(tag==="VP8X"&&size>0&&offset+8<bytes.length&&(bytes[offset+8]&2)!==0))return true;offset+=8+size+(size%2);}return false;}
