import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../dist/web/', import.meta.url);
await writeFile(
  new URL('theme.css', root),
  await readFile(new URL('../packages/girassol/src/tokens.css', import.meta.url), 'utf8'),
);
const html = await readFile(new URL('index.html', root), 'utf8');

const assets = [
  ...(await readdir(new URL('assets/', root))).map((file) => '/assets/' + file),
  '/theme.js',
  '/theme.css',
];
// Every precached file participates in the version, including the unhashed theme bootstrap.
const contentHash = createHash('sha256').update(html);
for (const path of [...assets].sort())
  contentHash.update(path).update(await readFile(new URL(path.slice(1), root)));
const version = contentHash.digest('hex').slice(0, 16);
const worker = `const CACHE = ${JSON.stringify('jardim-shell-' + version)};
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => { event.waitUntil((async () => {
 const cache = await caches.open(CACHE);
 for (const path of ['/', ...ASSETS]) {
  try {
 const response = await fetch(path,{cache:'no-store'});
  const valid = path === '/' ? response.headers.get('X-Jardim-Shell') === '1' : /javascript|text\\/css/.test(response.headers.get('Content-Type') || '');
  if(!response.ok || !valid) throw Error('Entre no Jardim antes de preparar acesso offline.');
  await cache.put(path,response);
 } catch(error) { console.error(JSON.stringify({event:'offline_asset_failed',asset:path,name:error.name,message:error.message})); throw error; }
 }
 await self.skipWaiting();
})()); });
self.addEventListener('activate', event => { event.waitUntil((async()=>{
 for(const key of await caches.keys()) if(key.startsWith('jardim-shell-') && key!==CACHE) await caches.delete(key);
 await self.clients.claim();
})()); });
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if(url.origin !== self.location.origin) return;
 if(url.pathname === '/auth/logout') {
  event.respondWith((async()=>{for(const key of await caches.keys()) if(key.startsWith('jardim-shell-')) await caches.delete(key);return fetch(event.request);})());return;
 }
 // Private API data, login forms and tokens never enter Cache Storage.
 if(event.request.method!=='GET' || url.pathname.startsWith('/v1/') || url.pathname.startsWith('/v2/') || url.pathname.startsWith('/auth/')) return;
 if(event.request.mode === 'navigate') {
  event.respondWith((async()=>{
   try {const response=await fetch(event.request);if(response.headers.get('X-Jardim-Shell')==='1'){const cache=await caches.open(CACHE);await cache.put('/',response.clone());}return response;} catch {
    return (await caches.match('/')) || new Response('Conecte-se e entre no Jardim para preparar acesso offline.',{status:503});
   }
  })());return;
 }
 if(ASSETS.includes(url.pathname)) event.respondWith((async()=> (await caches.match(event.request)) || (async()=>{const response=await fetch(event.request);if(response.ok && /javascript|text\\/css/.test(response.headers.get('Content-Type')||'')){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}return response;})())());
});`;
await writeFile(new URL('sw.js', root), worker);
await writeFile(
  new URL('manifest.webmanifest', root),
  JSON.stringify({
    name: 'Jardim',
    short_name: 'Jardim',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#faf9fc',
    theme_color: '#5b46b3',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }),
);
await writeFile(
  new URL('icon.svg', root),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="44" fill="#faf9fc"/><rect x="43" y="43" width="48" height="48" rx="14" fill="#a58bdc"/><rect x="101" y="43" width="48" height="48" rx="14" fill="#ea93b9"/><rect x="43" y="101" width="48" height="48" rx="14" fill="#85aeec"/><rect x="101" y="101" width="48" height="48" rx="14" fill="#eea087"/></svg>',
);
