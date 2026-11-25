/* global self, caches, fetch */
import { cleanupOutdatedCaches, precacheAndRoute, matchPrecache } from "workbox-precaching";
import { registerRoute } from "workbox-routing";

// Navigation is network-first to preserve the server-side login boundary.
registerRoute(({request,url})=>request.mode==="navigate"&&url.origin===self.location.origin&&url.pathname==="/",async({request})=>{
 try{return await fetch(request);}
 catch{return await matchPrecache("/index.html")||new Response("Conecte-se para preparar o Jardim offline.",{status:503});}
});
registerRoute(({url})=>url.origin===self.location.origin&&url.pathname==="/auth/logout",async({request})=>{
 const response=await fetch(request);
 if(response.ok||response.status===303){
  await Promise.all((await caches.keys()).filter(key=>key.startsWith("workbox-precache")||key.startsWith("jardim-shell-")).map(key=>caches.delete(key)));
  await self.registration.unregister();
 }
 return response;
},"POST");
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST,{cleanUrls:false,directoryIndex:null});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting();});
self.addEventListener("activate",event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith("jardim-shell-"))await caches.delete(key);await self.clients.claim();})());});
