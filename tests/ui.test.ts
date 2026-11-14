// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
test('Solid 2 compiled application mounts and reacts to local save', async () => {
  document.body.innerHTML = '<div id="root"></div>';
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (_url: unknown, init?: RequestInit) =>
      Response.json(init ? { acknowledged: [] } : { memories: [], cursor: 0, hasMore: false }),
  });
  const file = readdirSync('dist/web/assets').find((f) => f.endsWith('.js'))!;
  const code = readFileSync('dist/web/assets/' + file, 'utf8');
  // Vite output is a self-contained browser module with no imports.
  window.eval(code);
  await new Promise((r) => setTimeout(r, 150));
  expect(document.querySelector('h1')?.textContent).toContain('A vida acontece.');
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

  const title = document.querySelector<HTMLInputElement>('#title')!;
  title.value = 'Uma nova memória';
  document.querySelector<HTMLTextAreaElement>('#body')!.value = 'Um momento importante';
  title.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 250));
  expect(document.querySelector('.memory h3')?.textContent).toBe('Uma nova memória');
  const search = document.querySelector<HTMLInputElement>('#search')!;
  search.value = 'sem resultado';
  search.dispatchEvent(new InputEvent('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));
  expect(document.body.textContent).toContain('Ainda não encontramos por aqui.');
});
