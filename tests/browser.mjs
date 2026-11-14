import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: [
    '--no-sandbox',
    '--ignore-certificate-errors',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
  ],
});
try {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
  });
  context.setDefaultTimeout(20000);
  context.setDefaultNavigationTimeout(30000);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const origin = process.env.TEST_ORIGIN || 'https://localhost:8787';
  console.log('E2E: login');
  await page.goto(origin);
  await page.getByLabel('Sua senha').fill('wrong');
  await page.getByRole('button', { name: 'Entrar no meu jardim' }).click();
  await page.getByRole('alert').waitFor();
  await page.getByLabel('Sua senha').fill('local-test-only');
  await page.getByRole('button', { name: 'Entrar no meu jardim' }).click();
  await page.getByText('O que você quer lembrar?').waitFor();
  console.log('E2E: manual dark theme and persisted preference');
  await page.getByRole('button', { name: 'Tema: Sistema. Alterar tema', exact: true }).click();
  await page.getByRole('button', { name: 'Tema: Claro. Alterar tema', exact: true }).click();
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor),
    'rgb(23, 32, 25)',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Tema: Escuro. Alterar tema', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.getByRole('button', { name: 'Tema: Escuro. Alterar tema', exact: true }).click();
  const title = 'Teste de integração ' + Date.now();
  await page.getByLabel('Dê um nome a esse momento').fill(title);
  await page.getByLabel('Sua memória', { exact: true }).fill('Memória de teste local');
  await page.getByRole('button', { name: 'Plantar uma memória' }).click();
  await page.getByRole('heading', { name: title }).waitFor();
  await page.getByText('Tudo sincronizado', { exact: false }).waitFor();
  console.log('E2E: service worker and offline reload');
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
  second.setDefaultTimeout(20000);
  const tab = await second.newPage();
  console.log('E2E: second device');
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
  console.log('E2E: capture and revocation');
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
  console.log('E2E: edit and synchronized trash');
  const original = page
    .locator('article.memory')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await original.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Dê um nome a esse momento').fill(title + ' editada');
  await page.getByRole('button', { name: 'Salvar edição', exact: true }).click();
  await page.getByRole('heading', { name: title + ' editada', exact: true }).waitFor();
  await page.getByText('Tudo sincronizado', { exact: false }).waitFor();
  await tab.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await tab.getByRole('heading', { name: title + ' editada', exact: true }).waitFor();
  await page
    .locator('article.memory')
    .filter({ has: page.getByRole('heading', { name: title + ' editada', exact: true }) })
    .getByRole('button', { name: 'Mover para a lixeira', exact: true })
    .click();
  await page.getByText('Tudo sincronizado', { exact: false }).waitFor();
  await tab.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await tab
    .getByRole('heading', { name: title + ' editada', exact: true })
    .waitFor({ state: 'hidden' });
  console.log('E2E: attachment upload and remote byte range');
  await page.getByLabel('Dê um nome a esse momento').fill('Anexo E2E');
  await page.getByLabel('Sua memória', { exact: true }).fill('Foto com original preservado');
  await page.locator('#media-files').setInputFiles({
    name: 'tiny.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByRole('button', { name: 'Plantar uma memória', exact: false }).click();
  await page.getByRole('heading', { name: 'Anexo E2E', exact: true }).waitFor();
  await page.getByText('Tudo sincronizado', { exact: false }).waitFor();
  await tab.getByRole('button', { name: 'Atualizar', exact: true }).click();
  const remotePhoto = tab
    .locator('article.memory')
    .filter({ has: tab.getByRole('heading', { name: 'Anexo E2E', exact: true }) })
    .getByRole('img', { name: 'Foto da memória' });
  await remotePhoto.waitFor();
  const mediaUrl = await remotePhoto.getAttribute('src');
  assert.ok(mediaUrl?.startsWith('/v2/media/'));
  const partial = await second.request.get(origin + mediaUrl, { headers: { Range: 'bytes=0-7' } });
  assert.equal(partial.status(), 206);
  assert.equal((await partial.body()).length, 8);
  console.log('E2E: voice recording with synthetic microphone');
  await page.getByRole('button', { name: 'Gravar voz', exact: true }).click();
  await page.getByText('Gravando · até 30 segundos', { exact: true }).waitFor();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Parar gravação', exact: true }).click();
  await page.getByRole('button', { name: 'Remover anexo', exact: true }).waitFor();
  await page.getByLabel('Dê um nome a esse momento').fill('Voz E2E');
  await page.getByLabel('Sua memória', { exact: true }).fill('Áudio sintético de teste');
  await page.getByRole('button', { name: 'Plantar uma memória', exact: false }).click();
  await page.getByRole('heading', { name: 'Voz E2E', exact: true }).waitFor();
  await page.getByText('Tudo sincronizado', { exact: false }).waitFor();
  console.log('E2E: cultural entry and sealed capsule');
  await page.getByText('Cultura, Spotify e conexões', { exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Filme E2E');
  await page.getByRole('button', { name: 'Guardar registro cultural', exact: true }).click();
  await page.getByRole('heading', { name: 'Filme · Filme E2E', exact: true }).waitFor();
  await page.getByText('Cápsula mensal do Jardim', { exact: true }).click();
  await page.getByLabel('Nome da cápsula').fill('Cápsula E2E');
  await page.getByRole('button', { name: 'Selar uma nova versão privada', exact: true }).click();
  await page.getByRole('heading', { name: 'Cápsula E2E', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cápsula E2E · sincronizada', exact: true }).waitFor();
  console.log('E2E: exact PNG card dimensions');
  const [cardDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar PNG · og', exact: true }).click(),
  ]);
  const cardPath = await cardDownload.path();
  assert.ok(cardPath);
  const png = await readFile(cardPath);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  console.log('E2E: portable backup');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar', exact: true }).click(),
  ]);
  const backupPath = await download.path();
  assert.ok(backupPath);
  const backup = JSON.parse(await readFile(backupPath, 'utf8'));
  assert.equal(backup.schemaVersion, 1);
  assert.equal(new Set(backup.memories.map((memory) => memory.id)).size, backup.memories.length);
  await page.getByText('Importar backup', { exact: true }).click();
  await page.locator('#backup-file').setInputFiles(backupPath);
  await page.getByText(/já existente\(s\) preservada\(s\)/).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.getByLabel('Sua senha').waitFor();
  assert.equal((await context.request.get(origin + '/v1/memories')).status(), 401);
  console.log(
    'PASS: wrong password, login, create, offline save + offline reload, reconnect, second device, search, mobile width, YouTube capture + retry + revocation, logout; no browser errors',
  );
} finally {
  await browser.close();
}
