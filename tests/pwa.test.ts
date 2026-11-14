import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, test } from 'vitest';

test('built service worker caches authenticated shell only, keeps API network-only and purges on logout', async () => {
  const handlers = new Map<string, (event: unknown) => void>();
  const data = new Map<string, Response>();
  const stores = new Map<string, typeof cache>();
  const cache = {
    put: async (path: string, response: Response) => {
      data.set(path, response);
    },
  };
  let authenticated = false,
    offline = false;
  const context = {
    URL,
    Response,
    Error,
    self: {
      location: { origin: 'https://jardim.migos.club' },
      addEventListener: (name: string, fn: (e: unknown) => void) => handlers.set(name, fn),
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    caches: {
      open: async (name: string) => {
        stores.set(name, cache);
        return cache;
      },
      keys: async () => [...stores.keys()],
      delete: async (name: string) => {
        stores.delete(name);
        data.clear();
        return true;
      },
      match: async (path: string) => data.get(path),
    },
    fetch: async (input: string | Request) => {
      if (offline) throw Error('offline');
      const path = typeof input === 'string' ? input : new URL(input.url).pathname;
      return new Response(path === '/' ? 'shell' : 'asset', {
        headers:
          path === '/' && authenticated
            ? { 'X-Jardim-Shell': '1' }
            : { 'Content-Type': path.endsWith('.css') ? 'text/css' : 'text/javascript' },
      });
    },
  };
  runInNewContext(readFileSync('dist/web/sw.js', 'utf8'), context);
  const install = () => {
    let task: Promise<void>;
    handlers.get('install')!({
      waitUntil: (p: Promise<void>) => {
        task = p;
      },
    });
    return task!;
  };
  await expect(install()).rejects.toThrow('Entre no Jardim');
  expect(data.size).toBe(0);
  authenticated = true;
  await install();
  expect(data.has('/')).toBe(true);
  let intercepted: Promise<Response> | undefined;
  const dispatch = (
    path: string,
    method = 'GET',
    mode = 'navigate',
  ): Promise<Response> | undefined => {
    intercepted = undefined;
    handlers.get('fetch')!({
      request: { url: 'https://jardim.migos.club' + path, method, mode },
      respondWith: (p: Promise<Response>) => {
        intercepted = p;
      },
    });
    return intercepted;
  };
  offline = true;
  expect(await (await dispatch('/')!).text()).toBe('shell');
  expect(dispatch('/v1/memories', 'GET', 'cors')).toBeUndefined();
  expect(dispatch('/v2/sync/pull', 'GET', 'navigate')).toBeUndefined();
  expect(dispatch('/auth/login', 'POST', 'navigate')).toBeUndefined();
  offline = false;
  await dispatch('/auth/logout', 'POST');
  expect(data.size).toBe(0);
  offline = true;
  expect((await dispatch('/')!).status).toBe(503);
});
