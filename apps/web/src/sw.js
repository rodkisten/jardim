import { cleanupOutdatedCaches, precacheAndRoute, matchPrecache } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { navigation, logout } from './utils/offline-policy.js';

registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' && url.origin === self.location.origin && url.pathname === '/',
  ({ request }) => navigation(request, fetch, () => matchPrecache('/index.html')),
);
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname === '/auth/logout',
  ({ request }) => logout(request, fetch, caches, () => self.registration.unregister()),
  'POST',
);
// Verify the authenticated shell before Workbox installs its precache.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch('/', { cache: 'no-store', credentials: 'same-origin' });
      if (
        !response.ok ||
        (!response.headers.has('X-Jardim-Shell') &&
          !/^pr\d+\.jardim\.migos\.club$/.test(self.location.hostname))
      )
        throw Error('Entre no Jardim antes de preparar acesso offline.');
    })(),
  );
});
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST, { cleanUrls: false, directoryIndex: null });
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith('jardim-shell-')) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
