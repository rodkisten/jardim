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
async function openEditor(page) {
  if (!(await page.getByRole('dialog').isVisible()))
    await page.getByRole('button', { name: 'Criar memória', exact: true }).click();
}
let pageForFailure;
try {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    timezoneId: 'America/Sao_Paulo',
  });
  context.setDefaultTimeout(20000);
  context.setDefaultNavigationTimeout(30000);
  const page = await context.newPage();
  pageForFailure = page;
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type())) console.log('E2E browser:', message.text());
  });
  const diagnostics = await context.newCDPSession(page);
  await diagnostics.send('ServiceWorker.enable');
  diagnostics.on('ServiceWorker.workerErrorReported', (event) =>
    console.log('E2E service worker:', JSON.stringify(event.errorMessage)),
  );

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const origin = process.env.TEST_ORIGIN || 'https://localhost:8787';
  console.log('E2E: login');
  await page.goto(origin);
  await page.getByLabel('Sua senha').fill('wrong');
  await page.getByRole('button', { name: 'Entrar no Jardim' }).click();
  await page.getByRole('alert').waitFor();
  await page.getByLabel('Sua senha').fill('local-test-only');
  await page.getByRole('button', { name: 'Entrar no Jardim' }).click();
  await page.getByRole('button', { name: 'Criar memória', exact: true }).waitFor();
  console.log('E2E: manual dark theme and persisted preference');
  await page.getByRole('button', { name: 'Tema: Sistema. Alterar tema', exact: true }).click();
  await page.getByRole('button', { name: 'Tema: Claro. Alterar tema', exact: true }).click();
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor),
    'rgb(23, 22, 29)',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Tema: Escuro. Alterar tema', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.getByRole('button', { name: 'Tema: Escuro. Alterar tema', exact: true }).click();
  console.log('E2E: daily weather keeps the city across reload');
  const weatherDate = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  let citySearches = 0;
  await page.route('**/v2/weather/search?*', async (route) => {
    citySearches++;
    await route.fulfill({
      json: { cities: [{ label: 'Simonésia, MG, Brasil', latitude: -20.12, longitude: -42.01 }] },
    });
  });
  await page.route('**/v2/weather?*', async (route) =>
    route.fulfill({
      json: {
        date: weatherDate,
        minimum: 18,
        maximum: 26,
        code: 2,
        rainChance: 35,
        retrievedAt: new Date().toISOString(),
        source: 'Open-Meteo',
        kind: 'forecast',
        latitude: -20.12,
        longitude: -42.01,
        timezone: 'America/Sao_Paulo',
      },
    }),
  );
  await page.getByText('Escolher cidade', { exact: true }).click();
  await page.getByLabel('Cidade', { exact: true }).fill('Simonésia');
  await page.getByRole('button', { name: 'Buscar cidade', exact: true }).click();
  await page.getByRole('button', { name: 'Simonésia, MG, Brasil', exact: true }).click();
  await page.getByText('Previsão do dia', { exact: false }).waitFor();
  await page.reload();
  await page.getByText('Simonésia, MG, Brasil', { exact: true }).waitFor();
  await page.getByText('Previsão do dia', { exact: false }).waitFor();
  assert.equal(citySearches, 1);
  assert.equal(await page.getByRole('dialog').isVisible(), false);
  const title = 'Teste de integração ' + Date.now();
  await openEditor(page);
  await page.getByLabel('Dê um nome a esse momento').fill('Rascunho preservado');
  await page.getByRole('button', { name: 'Fechar editor', exact: true }).click();
  await openEditor(page);
  assert.equal(
    await page.getByLabel('Dê um nome a esse momento').inputValue(),
    'Rascunho preservado',
  );
  await page.getByLabel('Dê um nome a esse momento').fill(title);
  await page.getByLabel('Sua memória', { exact: true }).fill('Memória de teste local');
  await page.getByRole('button', { name: 'Salvar memória' }).click();
  await page.getByRole('heading', { name: title }).waitFor();
  await page.getByText('Tudo sincronizado', { exact: false }).waitFor();
  console.log('E2E: service worker and offline reload');
  // A forced reload can bypass an active service worker. A normal navigation must
  // enter its scope before we assert control and test a genuine offline reload.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.goto(origin);
  await page.getByRole('heading', { name: title, exact: true }).waitFor();
  try {
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  } catch (error) {
    console.log(
      'E2E registration:',
      await page.evaluate(async () => ({
        registrations: (await navigator.serviceWorker.getRegistrations()).map((r) => ({
          scope: r.scope,
          active: r.active?.state,
          waiting: r.waiting?.state,
          installing: r.installing?.state,
        })),
        caches: await caches.keys(),
      })),
    );
    throw error;
  }

  await context.setOffline(true);
  await openEditor(page);
  await page.getByLabel('Dê um nome a esse momento').fill(title + ' offline');
  await page.getByLabel('Sua memória', { exact: true }).fill('Salva sem rede');
  await page.getByRole('button', { name: 'Salvar memória' }).click();
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
  await tab.getByRole('button', { name: 'Entrar no Jardim' }).click();
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
  await openEditor(page);
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
  await openEditor(page);
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
  await page.getByRole('button', { name: 'Salvar memória', exact: false }).click();
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
  await openEditor(page);
  await page.getByRole('button', { name: 'Gravar voz', exact: true }).click();
  await page.getByText('Gravando · até 30 segundos', { exact: true }).waitFor();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Parar gravação', exact: true }).click();
  await page.getByRole('button', { name: 'Remover anexo', exact: true }).waitFor();
  await page.getByRole('img', { name: 'Forma de onda do áudio', exact: true }).waitFor();
  await openEditor(page);
  await page.getByLabel('Dê um nome a esse momento').fill('Voz E2E');
  await page.getByLabel('Sua memória', { exact: true }).fill('Áudio sintético de teste');
  await page.getByRole('button', { name: 'Salvar memória', exact: false }).click();
  await page.getByRole('heading', { name: 'Voz E2E', exact: true }).waitFor();
  await page.getByText('Tudo sincronizado', { exact: false }).waitFor();
  console.log('E2E: audio playback and circular video recording');
  const voiceCard = page
    .locator('article.memory')
    .filter({ has: page.getByRole('heading', { name: 'Voz E2E', exact: true }) });
  await voiceCard.getByRole('button', { name: 'Reproduzir áudio', exact: true }).click();
  await voiceCard.getByRole('img', { name: 'Forma de onda do áudio', exact: true }).waitFor();
  await openEditor(page);
  await page.getByRole('button', { name: 'Gravar vídeo circular', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Gravando · até 30 segundos' }).waitFor();
  await page.getByRole('button', { name: 'Pausar gravação', exact: true }).click();
  await page.getByText('Gravação pausada', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Retomar gravação', exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Parar gravação', exact: true }).click();
  await page.getByRole('button', { name: 'Reproduzir vídeo', exact: true }).waitFor();
  await page.getByLabel('Dê um nome a esse momento').fill('Vídeo E2E');
  await page.getByRole('button', { name: 'Salvar memória', exact: false }).click();
  await page.getByRole('heading', { name: 'Vídeo E2E', exact: true }).waitFor();
  const videoCard = page
    .locator('article.memory')
    .filter({ has: page.getByRole('heading', { name: 'Vídeo E2E', exact: true }) });
  await videoCard.getByRole('button', { name: 'Reproduzir vídeo', exact: true }).click();
  await videoCard.getByRole('button', { name: 'Ampliar vídeo', exact: true }).click();
  await videoCard.getByRole('button', { name: 'Recolher vídeo', exact: true }).waitFor();
  console.log('E2E: cultural entry and sealed capsule');
  await page.getByText('Cultura, Spotify e conexões', { exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Filme E2E');
  await page.getByRole('button', { name: 'Guardar registro cultural', exact: true }).click();
  await page.getByRole('heading', { name: 'Filme · Filme E2E', exact: true }).waitFor();
  console.log('E2E: Spotify setup and PKCE start');
  await page.getByLabel('Client ID do Spotify', { exact: true }).fill('a'.repeat(32));
  await page.getByRole('button', { name: 'Salvar aplicação Spotify', exact: true }).click();
  await page.getByText('pronto para conectar', { exact: false }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Conectar Spotify', exact: true }).isEnabled(),
    true,
  );
  const oauthStart = await context.request.post(origin + '/v2/spotify/start', {
    headers: { Origin: origin },
  });
  assert.equal(oauthStart.status(), 200);
  const oauthUrl = new URL((await oauthStart.json()).url);
  assert.equal(oauthUrl.origin, 'https://accounts.spotify.com');
  assert.equal(oauthUrl.searchParams.get('client_id'), 'a'.repeat(32));
  assert.equal(oauthUrl.searchParams.get('code_challenge_method'), 'S256');
  console.log('E2E: periods, anniversary and source groups');
  const previousYear = new Date();
  previousYear.setUTCFullYear(previousYear.getUTCFullYear() - 1);
  const seeded = await context.request.post(origin + '/v1/sync/push', {
    headers: { Origin: origin },
    data: {
      operations: [
        {
          operationId: crypto.randomUUID(),
          memory: {
            id: crypto.randomUUID(),
            title: 'Trilha de outro ano E2E',
            body: 'Metadados sintéticos de uma lembrança musical',
            tags: ['spotify'],
            createdAt: previousYear.toISOString(),
          },
        },
      ],
    },
  });
  assert.equal(seeded.status(), 200);
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await page.getByRole('heading', { name: 'Trilha de outro ano E2E', exact: true }).waitFor();
  await page.getByLabel('Fonte', { exact: true }).selectOption('culture');
  await page.getByRole('heading', { name: 'Filme · Filme E2E', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Voz E2E', exact: true }).waitFor({ state: 'hidden' });
  for (const period of ['day', 'week', 'month', 'year']) {
    await page.getByLabel('Período', { exact: true }).selectOption(period);
    await page.getByRole('heading', { name: 'Filme · Filme E2E', exact: true }).waitFor();
  }
  await page.getByLabel('Fonte', { exact: true }).selectOption('spotify');
  await page.getByRole('button', { name: 'Neste dia', exact: true }).click();
  await page.getByRole('heading', { name: 'Trilha de outro ano E2E', exact: true }).waitFor();
  await page.getByLabel('Agrupar por', { exact: true }).selectOption('source');
  await page.getByRole('region', { name: 'Spotify', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Período anterior', exact: true }).click();
  await page
    .getByRole('heading', { name: 'Ainda não encontramos por aqui.', exact: true })
    .waitFor();
  await page.getByRole('button', { name: 'Próximo período', exact: true }).click();
  await page.getByRole('heading', { name: 'Trilha de outro ano E2E', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await page.getByRole('heading', { name: 'Voz E2E', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
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
} catch (error) {
  if (pageForFailure)
    await pageForFailure
      .screenshot({ path: 'test-results/failure.png', fullPage: true })
      .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
