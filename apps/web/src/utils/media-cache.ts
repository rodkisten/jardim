import Dexie,{type Table} from "dexie";
export type MediaMetadata={id:string;peaks?:number[];poster?:Blob;duration?:number;updatedAt:number};
export class MediaCache extends Dexie{
 metadata!:Table<MediaMetadata,string>;
 constructor(name="jardim-media-cache"){super(name);this.version(1).stores({metadata:"id,updatedAt"});}
}
export const mediaCache=new MediaCache();
export async function cacheMetadata(id:string,patch:Partial<Omit<MediaMetadata,"id"|"updatedAt">>,db=mediaCache){
 await db.transaction("rw",db.metadata,async()=>{const previous=await db.metadata.get(id);await db.metadata.put({...previous,...patch,id,updatedAt:Date.now()});});
}
export async function pruneMetadata(db=mediaCache,max=200){await db.transaction("rw",db.metadata,async()=>{const count=await db.metadata.count();if(count>max){const keys=await db.metadata.orderBy("updatedAt").limit(count-max).primaryKeys();await db.metadata.bulkDelete(keys);}});}
