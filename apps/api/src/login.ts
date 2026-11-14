export const loginPage = (error = false) => /* HTML */ `
  <!doctype html>
  <html lang="pt-BR">
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>Entre no Jardim</title>
    <meta name="theme-color" content="#f4f1e9" />
    <link rel="stylesheet" href="/theme.css" />
    <script src="/theme.js"></script>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: var(--g-background);
        color: var(--g-text);
        font: 17px system-ui;
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      main {
        width: 100%;
        max-width: 420px;
      }
      span {
        font-size: 48px;
      }
      h1 {
        font: 64px Georgia;
        margin: 16px 0;
      }
      p {
        line-height: 1.7;
        color: var(--g-muted);
      }
      label {
        display: block;
        margin: 32px 0 10px;
      }
      input {
        background: var(--g-surface);
        color: var(--g-text);
      }
      input,
      button {
        width: 100%;
        font: inherit;
        padding: 17px;
        border-radius: 12px;
        border: 1px solid var(--g-border);
      }
      button {
        margin-top: 14px;
        background: var(--g-accent);
        color: var(--g-on-accent);
        cursor: pointer;
      }
      small {
        display: block;
        margin-top: 30px;
        color: var(--g-muted);
      }
    </style>
    <main>
      <span aria-hidden="true">🌱</span>
      <h1>Jardim</h1>
      <p>
        Um lugar tranquilo para cultivar
        <br />
        as memórias da sua vida.
      </p>
      <form method="post" action="/auth/login">
        <label for="password">Sua senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          maxlength="256"
          autofocus
        />
        ${error ? '<p role="alert">Senha incorreta. Tente novamente.</p>' : ''}
        <button>Entrar no meu jardim →</button>
      </form>
      <button type="button" data-login-theme>◐ Tema: Sistema</button>
      <small>Seu espaço pessoal. Uma memória de cada vez.</small>
    </main>
  </html>
`;
