import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
try {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const origin = process.env.TEST_ORIGIN || 'https://localhost:8787';
  await page.goto(origin);
  await page.getByLabel('Sua senha').fill('wrong');
  await page.getByRole('button', { name: 'Entrar no meu jardim' }).click();
  await page.getByRole('alert').waitFor();
  await page.getByLabel('Sua senha').fill('local-test-only');
  await page.getByRole('button', { name: 'Entrar no meu jardim' }).click();
  await page.getByText('O que você quer lembrar?').waitFor();
  const title = 'Teste de integração ' + Date.now();
  await page.getByLabel('Dê um nome a esse momento').fill(title);
  await page.getByLabel('Sua memória', { exact: true }).fill('Memória de teste local');
  await page.getByRole('button', { name: 'Plantar uma memória' }).click();
  await page.getByRole('heading', { name: title }).waitFor();
  await page.getByText('Tudo sincronizado', { exact: false }).waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.getByLabel('Dê um nome a esse momento').fill(title + ' offline');
  await page.getByLabel('Sua memória', { exact: true }).fill('Salva sem rede');
  await page.getByRole('button', { name: 'Plantar uma memória' }).click();
  await page.getByRole('heading', { name: title + ' offline' }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: title + ' offline' }).waitFor();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Atualizar' }).click();
  await page.getByText('Tudo sincronizado', { exact: false }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: title + ' offline' }).waitFor();
  const second = await browser.newContext({ ignoreHTTPSErrors: true });
  const tab = await second.newPage();
  await tab.goto(origin);
  await tab.getByLabel('Sua senha').fill('local-test-only');
  await tab.getByRole('button', { name: 'Entrar no meu jardim' }).click();
  await tab.getByRole('heading', { name: title + ' offline' }).waitFor();
  await page.getByRole('searchbox').fill('inexistente');
  await page.getByText('Ainda não encontramos por aqui.').waitFor();
  await page.getByRole('searchbox').fill('');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: 'test-results/jardim-mobile.png',
    fullPage: true,
  });
  await page.getByText('Dispositivos e captura do YouTube', { exact: true }).click();
  await page.getByLabel('Nome do dispositivo').fill('YouTube E2E');
  await page.getByRole('button', { name: 'Criar token de captura' }).click();
  const token = await page.getByLabel('Token de captura').inputValue();
  const event = {
    id: crypto.randomUUID(),
    title: 'Vídeo capturado E2E',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=private',
    observedAt: new Date().toISOString(),
  };
  for (let i = 0; i < 2; i++) {
    const response = await context.request.post(origin + '/v1/events/batch', {
      headers: { Authorization: 'Bearer ' + token },
      data: { events: [event] },
    });
    assert.equal(response.status(), 200);
    assert.deepEqual(await response.json(), { acknowledged: [event.id] });
  }
  await tab.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await tab.getByRole('heading', { name: event.title, exact: true }).waitFor();
  assert.equal(
    await tab.getByRole('link', { name: 'Abrir no YouTube' }).getAttribute('href'),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  );
  await page.getByRole('button', { name: 'Ocultar token' }).click();
  await page.getByRole('button', { name: 'Revogar acesso' }).click();
  await page.getByText('YouTube E2E · Revogado', { exact: true }).waitFor();
  assert.equal(
    (
      await context.request.post(origin + '/v1/events/batch', {
        headers: { Authorization: 'Bearer ' + token },
        data: { events: [event] },
      })
    ).status(),
    401,
  );
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.getByLabel('Sua senha').waitFor();
  assert.equal((await context.request.get(origin + '/v1/memories')).status(), 401);
  console.log(
    'PASS: wrong password, login, create, offline save + offline reload, reconnect, second device, search, mobile width, YouTube capture + retry + revocation, logout; no browser errors',
  );
} finally {
  await browser.close();
}
