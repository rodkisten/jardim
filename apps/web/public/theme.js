(() => {
  const key = 'jardim.theme';
  const valid = (value) => ['system', 'light', 'dark'].includes(value);
  const read = () => {
    try {
      const value = localStorage.getItem(key);
      return valid(value) ? value : 'system';
    } catch {
      return 'system';
    }
  };
  const media = matchMedia('(prefers-color-scheme: dark)');
  function apply(mode) {
    document.documentElement.dataset.theme = mode;
    const dark = mode === 'dark' || (mode === 'system' && media.matches);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#17161d' : '#faf9fc');
    const button = document.querySelector('[data-login-theme]');
    if (button)
      button.textContent = `◐ Tema: ${mode === 'system' ? 'Sistema' : mode === 'dark' ? 'Escuro' : 'Claro'}`;
  }
  // Run before first paint; blocked storage must not prevent login or application startup.
  apply(read());
  document.addEventListener('DOMContentLoaded', () => {
    apply(read());
    document.querySelector('[data-login-theme]')?.addEventListener('click', () => {
      const modes = ['system', 'light', 'dark'];
      const mode =
        modes[
          (modes.indexOf(document.documentElement.dataset.theme || 'system') + 1) % modes.length
        ];
      try {
        localStorage.setItem(key, mode);
      } catch {
        /* The visual preference still applies without storage. */
      }
      apply(mode);
    });
  });
  media.addEventListener('change', () => apply(document.documentElement.dataset.theme || 'system'));
  addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) apply(read());
  });
})();
