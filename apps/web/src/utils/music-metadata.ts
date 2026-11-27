import { z } from 'zod';
export function spotifyTrack(input:string){
 const value=input.trim();const uri=/^spotify:track:([A-Za-z0-9]{22})$/.exec(value);
 if(uri)return uri[1];
 try{const url=new URL(value);if(url.protocol!=='https:'||url.hostname!=='open.spotify.com'||url.username||url.password||url.port)return null;return /^\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname)?.[1]??null;}catch{return null;}
}
const recording=z.object({id:z.string().uuid(),title:z.string(),length:z.number().optional(),'first-release-date':z.string().optional(),'artist-credit':z.array(z.object({name:z.string(),artist:z.object({id:z.string().uuid(),name:z.string()})})).optional(),isrcs:z.array(z.string()).optional()});
const response=z.object({recordings:z.array(recording)});
const escapeQuery=(value:string)=>value.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g,'\\$&');
let lastRequest=0;
export async function findRecordings(title:string,artist:string,signal?:AbortSignal){
 if(Date.now()-lastRequest<1100)throw Error('Aguarde um segundo antes de consultar novamente.');
 lastRequest=Date.now();
 const url=new URL('https://musicbrainz.org/ws/2/recording');
 url.search=new URLSearchParams({query:'recording:"'+escapeQuery(title.trim().slice(0,300))+'" AND artist:"'+escapeQuery(artist.trim().slice(0,300))+'"',fmt:'json',limit:'8'}).toString();
 const result=await fetch(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
 if(!result.ok)throw Error('MusicBrainz indisponível.');
 return response.parse(await result.json()).recordings;
}
export type RecordingCandidate=z.infer<typeof recording>;
