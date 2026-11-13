import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
await import('./build-capture.mjs');
await import('./build-pwa.mjs');
await import('./assets.mjs');
const root = fileURLToPath(new URL('../', import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ['apps/api/src/index.ts'],
  outfile: 'dist/worker.js',
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  plugins: [
    {
      name: 'prisma-cloudflare-wasm',
      setup(build) {
        build.onResolve({ filter: /\.wasm\?module$/ }, async (args) => {
          // Workers require an imported, precompiled Wasm module; never compile bytes dynamically in production.
          await copyFile(
            resolve(args.resolveDir, args.path.replace(/\?module$/, '')),
            root + 'dist/prisma-query-compiler.wasm',
          );
          return { path: './prisma-query-compiler.wasm', external: true };
        });
      },
    },
  ],
});
