import { useSyncExternalStore } from 'react';
import { isThemeMode, themeKey, resolvedTheme, type ThemeMode } from '../theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();
function read(): ThemeMode {
  try {
    const value = localStorage.getItem(themeKey);
    return isThemeMode(value) ? value : 'dark';
  } catch {
    return 'dark';
  }
}
let mode = read();
function apply() {
  const theme = resolvedTheme(mode, media.matches);
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#101113' : '#faf9f5');
}
function emit() {
  apply();
  listeners.forEach((fn) => fn());
}
media.addEventListener('change', emit);
window.addEventListener('storage', (event) => {
  if (event.key === themeKey || event.key === null) {
    mode = read();
    emit();
  }
});
export function initializeTheme() {
  apply();
}
export function setTheme(value: ThemeMode) {
  mode = value;
  try {
    localStorage.setItem(themeKey, value);
  } catch {
    /* Theme remains active for this session. */
  }
  emit();
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function useTheme() {
  return { mode: useSyncExternalStore(subscribe, () => mode), setTheme };
}
