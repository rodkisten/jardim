// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import { Push, type Memory } from '@rodkisten/jardim-contracts';
import { readFileSync, readdirSync } from 'node:fs';
test('Solid 2 compiled application mounts and reacts to local save', async () => {
  document.body.innerHTML = '<div id="root"></div>';
  let releaseInitial!: (response: Response) => void;
  const initialPull = new Promise<Response>((resolve) => {
    releaseInitial = resolve;
  });
  let firstPull = true,
    posted = 0;
  const remote: Memory[] = [];
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (_url: unknown, init?: RequestInit) => {
      if (String(_url).includes('/v2/preferences')) return Response.json({});
      if (init?.method === 'POST') {
        const batch = Push.parse(JSON.parse(String(init.body)));
        posted++;
        remote.push(...batch.operations.map((op) => op.memory));
        return Response.json({ acknowledged: batch.operations.map((op) => op.operationId) });
      }
      if (firstPull) {
        firstPull = false;
        return initialPull;
      }
      return Response.json({
        snapshots: remote.map((memory) => ({ memory, revision: 1, deletedAt: null })),
        cursor: remote.length,
        hasMore: false,
      });
    },
  });
  const file = readdirSync('dist/web/assets').find((f) => f.endsWith('.js'))!;
  const code = readFileSync('dist/web/assets/' + file, 'utf8');
  // Vite output is a self-contained browser module with no imports.
  window.eval(code);
  await new Promise((r) => setTimeout(r, 150));
  expect(document.querySelector('h1')?.textContent).toContain('Sua vida,');
  const theme = document.querySelector<HTMLButtonElement>('.theme-switch')!;
  theme.click();
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(document.documentElement.dataset.theme).toBe('light');
  theme.click();
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(theme.getAttribute('aria-label')).toContain('Escuro');
  theme.click();
  await new Promise((resolve) => setTimeout(resolve, 30));

  document.querySelector<HTMLButtonElement>('.new-memory')!.click();
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(true);

  let released = 0;
  const oldMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  const oldRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder');
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => released++ }] }) },
  });
  Object.defineProperty(globalThis, 'MediaRecorder', {
    configurable: true,
    value: class {
      static isTypeSupported() {
        return true;
      }
      constructor() {
        throw Error('encoder unavailable');
      }
    },
  });
  const voice = Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent === 'Gravar voz',
  )!;
  voice.click();
  await expect.poll(() => released, { timeout: 1000 }).toBeGreaterThan(0);
  // Closing while the permission prompt is pending must release late streams,
  // without constructing a recorder or attaching an abandoned recording.
  let resolvePermission!: (value: unknown) => void;
  const permission = new Promise((resolve) => {
    resolvePermission = resolve;
  });
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: () => permission },
  });
  const before = released;
  Array.from(document.querySelectorAll('button'))
    .find((button) => button.textContent === 'Gravar voz')!
    .click();
  await new Promise((resolve) => setTimeout(resolve, 30));
  Array.from(document.querySelectorAll('button'))
    .find((button) => button.textContent === 'Fechar editor')!
    .click();
  await new Promise((resolve) => setTimeout(resolve, 30));
  resolvePermission({ getTracks: () => [{ stop: () => released++ }] });
  await expect.poll(() => released, { timeout: 1000 }).toBeGreaterThan(before);
  expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  document.querySelector<HTMLButtonElement>('.new-memory')!.click();
  await new Promise((resolve) => setTimeout(resolve, 30));
  if (oldMediaDevices) Object.defineProperty(navigator, 'mediaDevices', oldMediaDevices);
  else Reflect.deleteProperty(navigator, 'mediaDevices');
  if (oldRecorder) Object.defineProperty(globalThis, 'MediaRecorder', oldRecorder);
  else Reflect.deleteProperty(globalThis, 'MediaRecorder');
  const title = document.querySelector<HTMLInputElement>('#title')!;
  title.value = 'Uma nova memória';
  title.dispatchEvent(new InputEvent('input', { bubbles: true }));
  const body = document.querySelector<HTMLTextAreaElement>('#body')!;
  body.value = 'Um momento importante';
  body.dispatchEvent(new InputEvent('input', { bubbles: true }));
  const draftSearch = document.querySelector<HTMLInputElement>('#search')!;
  draftSearch.value = 'outra atualização';
  draftSearch.dispatchEvent(new InputEvent('input', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(title.value).toBe('Uma nova memória');
  expect(body.value).toBe('Um momento importante');
  draftSearch.value = '';
  draftSearch.dispatchEvent(new InputEvent('input', { bubbles: true }));
  title.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 250));
  expect(document.querySelector('.memory h3')?.textContent).toBe('Uma nova memória');
  // The save happened while the initial pull was in flight. It must be sent without waiting 30 seconds.
  expect(posted).toBe(0);
  releaseInitial(Response.json({ snapshots: [], cursor: 0, hasMore: false }));
  await expect.poll(() => posted, { timeout: 1500 }).toBe(1);

  // A manual title must survive reactive updates such as changing the media kind
  // or receiving integration configuration while the user is filling the form.
  const cultureTitle = document.querySelector<HTMLInputElement>('#culture-title')!;
  cultureTitle.value = 'Filme digitado';
  cultureTitle.dispatchEvent(new InputEvent('input', { bubbles: true }));
  const kind = document.querySelector('#culture-kind')! as unknown as HTMLSelectElement;
  kind.value = 'série';
  kind.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(cultureTitle.value).toBe('Filme digitado');

  const search = document.querySelector<HTMLInputElement>('#search')!;
  search.value = 'sem resultado';
  search.dispatchEvent(new InputEvent('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));
  expect(document.body.textContent).toContain('Ainda não encontramos por aqui.');
});
