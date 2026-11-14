import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { resolvedTheme, isThemeMode } from '../apps/web/src/theme';
test('manual theme overrides the system and invalid preferences do not become modes', () => {
  expect(resolvedTheme('light', true)).toBe('light');
  expect(resolvedTheme('dark', false)).toBe('dark');
  expect(resolvedTheme('system', true)).toBe('dark');
  expect(resolvedTheme('system', false)).toBe('light');
  expect(isThemeMode('<script>')).toBe(false);
});
test('early bootstrap restores theme, follows system changes and remains usable with storage blocked', () => {
  for (const blocked of [false, true]) {
    let stored = 'dark';
    const handlers = new Map<string, (event?: { key: string }) => void>();
    const meta = new Map<string, string>();
    const root = { dataset: {} as Record<string, string> };
    const button = {
      textContent: '',
      addEventListener: (name: string, fn: () => void) => handlers.set('button:' + name, fn),
    };
    const media = {
      matches: false,
      addEventListener: (name: string, fn: () => void) => handlers.set('media:' + name, fn),
    };
    runInNewContext(readFileSync('apps/web/public/theme.js', 'utf8'), {
      document: {
        documentElement: root,
        querySelector: (selector: string) =>
          selector === '[data-login-theme]'
            ? button
            : { setAttribute: (key: string, value: string) => meta.set(key, value) },
        addEventListener: (name: string, fn: () => void) => handlers.set(name, fn),
      },
      localStorage: {
        getItem: () => {
          if (blocked) throw Error('blocked');
          return stored;
        },
        setItem: (_key: string, value: string) => {
          if (blocked) throw Error('blocked');
          stored = value;
        },
      },
      matchMedia: () => media,
      addEventListener: (name: string, fn: (event: { key: string }) => void) =>
        handlers.set(name, () => fn({ key: 'jardim.theme' })),
    });
    expect(root.dataset.theme).toBe(blocked ? 'system' : 'dark');
    handlers.get('DOMContentLoaded')!();
    handlers.get('button:click')!();
    expect(root.dataset.theme).toBe(blocked ? 'light' : 'system');
    media.matches = true;
    handlers.get('media:change')!();
    expect(meta.get('content')).toBe(blocked ? '#faf9fc' : '#17161d');
    if (!blocked) {
      stored = 'light';
      handlers.get('storage')!({ key: 'jardim.theme' });
      expect(root.dataset.theme).toBe('light');
      expect(button.textContent).toContain('Claro');
    }
  }
});
