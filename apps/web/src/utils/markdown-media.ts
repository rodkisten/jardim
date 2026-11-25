export const mediaMarker=(id:string)=>"![Anexo](jardim-media:"+id+")";
const uuid="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export function mediaMarkerId(line:string){return new RegExp("^!\\[Anexo\\]\\(jardim-media:("+uuid+")\\)$","i").exec(line.trim())?.[1];}
