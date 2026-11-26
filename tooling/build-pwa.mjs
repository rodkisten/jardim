// VitePWA owns the manifest and service worker. Never overwrite its precache.
import { readFile, writeFile, access } from 'node:fs/promises';
const root = new URL('../dist/web/', import.meta.url);
await Promise.all(
  ['sw.js', 'manifest.webmanifest', 'icon.svg'].map((path) => access(new URL(path, root))),
);
await writeFile(
  new URL('theme.css', root),
  await readFile(new URL('../packages/girassol/src/tokens.css', import.meta.url), 'utf8'),
);
