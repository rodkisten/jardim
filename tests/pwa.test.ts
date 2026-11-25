import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { navigation, logout } from '../apps/web/src/utils/offline-policy.js';

test('built PWA contains a standalone manifest and precaches lazy chunks',()=>{
 const manifest=JSON.parse(readFileSync('dist/web/manifest.webmanifest','utf8'));
 expect(manifest.display).toBe('standalone');
 expect(manifest.icons.some((icon:{sizes:string})=>icon.sizes==='512x512')).toBe(true);
 const worker=readFileSync('dist/web/sw.js','utf8');
 expect(worker).toContain('index.html');
 expect(worker).toMatch(/DiaryEditor[^"]*\.js/);
 expect(worker).not.toContain('self.__WB_MANIFEST');
});
test('navigation respects online login and falls back only when network fails',async()=>{
 const request=new Request('https://jardim.migos.club/');
 const shell=()=>Promise.resolve(new Response('shell'));
 expect(await (await navigation(request,async()=>new Response('login'),shell)).text()).toBe('login');
 const offline=async()=>{throw Error('offline');};
 expect(await (await navigation(request,offline,shell)).text()).toBe('shell');
 expect((await navigation(request,offline,async()=>undefined)).status).toBe(503);
});
test('logout purges shell caches only after successful network logout',async()=>{
 const deleted:string[]=[];let unregistered=false;
 const storage={keys:async()=>['workbox-precache-v2','jardim-shell-old','other'],delete:async(key:string)=>{deleted.push(key);return true;}};
 const request=new Request('https://jardim.migos.club/auth/logout',{method:'POST'});
 const unregister=async()=>{unregistered=true;return true;};
 await logout(request,async()=>new Response(null,{status:401}),storage,unregister);
 expect(deleted).toEqual([]);expect(unregistered).toBe(false);
 await logout(request,async()=>new Response(null,{status:303}),storage,unregister);
 expect(deleted).toEqual(['workbox-precache-v2','jardim-shell-old']);expect(unregistered).toBe(true);
});
