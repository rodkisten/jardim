import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { transformAsync } from '@babel/core';
export default defineConfig({
  root: fileURLToPath(new URL('./apps/web', import.meta.url)),
  plugins: [
    {
      name: 'solid-2',
      enforce: 'pre',
      async transform(code, id) {
        if (!/\.tsx$/.test(id)) return;
        // RC compiler/runtime use different delegated-event internals; direct listeners preserve input/click behavior.
        const result = await transformAsync(code, {
          filename: id,
          presets: [['babel-preset-solid', { generate: 'dom', delegateEvents: false }]],
          parserOpts: { plugins: ['typescript', 'jsx'] },
          sourceMaps: true,
        });
        return result?.code ? { code: result.code, map: result.map } : null;
      },
    },
  ],
  // Temporarily keep production bundles readable so E2E stack traces identify the Solid runtime callsite.
  build: { outDir: fileURLToPath(new URL('./dist/web', import.meta.url)), emptyOutDir: true, minify: false, sourcemap: true },
  server: { proxy: { '/v1': 'http://localhost:8787', '/auth': 'http://localhost:8787' } },
});
