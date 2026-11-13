import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(root + 'dist/web/downloads', { recursive: true });
const metadata = `// ==UserScript==
// @name         Jardim · YouTube
// @namespace    https://jardim.migos.club
// @version      0.1.0
// @description  Capture opt-in de vídeos observados com fila persistente e sincronização privada.
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      jardim.migos.club
// @run-at       document-idle
// @updateURL    https://jardim.migos.club/downloads/jardim-youtube.user.js
// @downloadURL  https://jardim.migos.club/downloads/jardim-youtube.user.js
// ==/UserScript==`;
await build({
  absWorkingDir: root,
  entryPoints: ['apps/userscript/src/main.ts'],
  outfile: 'dist/web/downloads/jardim-youtube.user.js',
  bundle: true,
  format: 'iife',
  target: 'safari16',
  minify: true,
  legalComments: 'none',
  banner: { js: metadata },
});
