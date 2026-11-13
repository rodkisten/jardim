import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, test } from 'vitest';

test('built userscript recovers after closing offline, rejects false receipts and preserves concurrent tab entries', async () => {
  const storage = new Map<string, unknown>([
    ['jardim.token', 'a'.repeat(64)],
    ['jardim.enabled', true],
  ]);
  const received = new Set<string>();
  let mode: 'offline' | 'invalid' | 'online' = 'offline';
  function open(video = 'dQw4w9WgXcQ') {
    const timeouts: (() => void)[] = [];
    const menus = new Map<string, () => void>();
    const context = {
      crypto,
      URL,
      Date,
      Math,
      Set,
      Promise,
      Error,
      JSON,
      location: { href: `https://www.youtube.com/watch?v=${video}&list=private` },
      document: {
        title: 'Um vídeo - YouTube',
        visibilityState: 'visible',
        querySelector: () => null,
        addEventListener: () => {},
      },
      window: { addEventListener: () => {} },
      setTimeout: (fn: () => void) => {
        timeouts.push(fn);
      },
      setInterval: () => {},
      prompt: () => null,
      alert: () => {},
      GM_getValue: (key: string, fallback: unknown) =>
        storage.has(key) ? storage.get(key) : fallback,
      GM_setValue: (key: string, value: unknown) => storage.set(key, structuredClone(value)),
      GM_listValues: () => [...storage.keys()],
      GM_deleteValue: (key: string) => storage.delete(key),
      GM_registerMenuCommand: (name: string, fn: () => void) => menus.set(name, fn),
      GM_xmlhttpRequest: (input: {
        data: string;
        onerror: () => void;
        onload: (res: unknown) => void;
      }) => {
        if (mode === 'offline') {
          input.onerror();
          return;
        }
        const events = JSON.parse(input.data).events as { id: string; url: string }[];
        events.forEach((event) => {
          expect(event.url).not.toContain('private');
          received.add(event.id);
        });
        input.onload({
          status: 200,
          responseText: JSON.stringify({
            acknowledged:
              mode === 'invalid' ? [crypto.randomUUID()] : events.map((event) => event.id),
          }),
        });
      },
    };
    runInNewContext(readFileSync('dist/web/downloads/jardim-youtube.user.js', 'utf8'), context);
    return {
      observe: () => timeouts.shift()?.(),
      retry: () => menus.get('Jardim · fila e reenviar')!(),
    };
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
  const pending = () => [...storage.keys()].filter((key) => key.startsWith('jardim.event.'));
  open().observe();
  await settle();
  expect(pending()).toHaveLength(1);
  const original = pending()[0];
  // A second tab writes an independent key while both pages are offline.
  open('abcdefghijk').observe();
  await settle();
  expect(pending()).toHaveLength(2);
  expect(pending()).toContain(original);
  mode = 'invalid';
  const reopened = open();
  await settle();
  expect(pending()).toHaveLength(2);
  mode = 'online';
  reopened.retry();
  await settle();
  expect(pending()).toHaveLength(0);
  expect(received.size).toBe(2);
});
