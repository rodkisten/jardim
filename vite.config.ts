import { defineConfig } from 'vite';
import { transformAsync } from '@babel/core';
export default defineConfig({
  root: 'apps/web',
  plugins: [
    {
      name: 'solid-2',
      enforce: 'pre',
      async transform(code, id) {
        if (!/\.tsx$/.test(id)) return;
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
  build: { outDir: '../../dist/web', emptyOutDir: true },
  server: { proxy: { '/v1': 'http://localhost:8787', '/auth': 'http://localhost:8787' } },
});
