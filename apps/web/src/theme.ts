export type ThemeMode = 'system' | 'light' | 'dark';
export const themeKey = 'jardim.theme';
export const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'system' || value === 'light' || value === 'dark';
export function storedTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(themeKey);
    return isThemeMode(value) ? value : 'system';
  } catch {
    return 'system';
  }
}
export function resolvedTheme(mode: ThemeMode, systemDark: boolean): 'light' | 'dark' {
  return mode === 'dark' || (mode === 'system' && systemDark) ? 'dark' : 'light';
}
export function applyTheme(mode: ThemeMode, systemDark: boolean) {
  document.documentElement.dataset.theme = mode;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolvedTheme(mode, systemDark) === 'dark' ? '#17161d' : '#faf9fc');
}
