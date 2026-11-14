import { createSignal, onCleanup } from 'solid-js';
import { storedTheme, themeKey, applyTheme, type ThemeMode } from './theme';
export function ThemeSwitch() {
  const [mode, setMode] = createSignal<ThemeMode>(storedTheme());
  const media = matchMedia('(prefers-color-scheme: dark)');
  const labels = { system: 'Sistema', light: 'Claro', dark: 'Escuro' };
  const update = () => applyTheme(mode(), media.matches);
  const crossTab = (event: StorageEvent) => {
    if (event.key === themeKey || event.key === null) {
      setMode(storedTheme());
      update();
    }
  };
  update();
  media.addEventListener('change', update);
  window.addEventListener('storage', crossTab);
  onCleanup(() => {
    media.removeEventListener('change', update);
    window.removeEventListener('storage', crossTab);
  });
  function cycle() {
    const modes: ThemeMode[] = ['system', 'light', 'dark'];
    const next = modes[(modes.indexOf(mode()) + 1) % modes.length];
    setMode(next);
    update();
    try {
      localStorage.setItem(themeKey, next);
    } catch {
      /* Theme remains usable with storage disabled. */
    }
  }
  return (
    <button
      type="button"
      class="subtle theme-switch"
      aria-label={`Tema: ${labels[mode()]}. Alterar tema`}
      title={`Tema: ${labels[mode()]} · Sistema → Claro → Escuro`}
      onClick={cycle}
    >
      <span aria-hidden="true">{mode() === 'dark' ? '☾' : mode() === 'light' ? '☀' : '◐'}</span>
    </button>
  );
}
