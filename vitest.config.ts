import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
export default defineConfig({
  plugins: [
    {
      name: 'prisma-test-wasm',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source.endsWith('.wasm?module') && importer) return resolve(dirname(importer), source);
      },
      load(id) {
        if (id.endsWith('.wasm?module')) {
          // Node tests compile the same artifact that Workers receive as an application/wasm module.
          return (
            "import {readFileSync} from 'node:fs'; export default new WebAssembly.Module(readFileSync(" +
            JSON.stringify(
              resolve(
                process.cwd(),
                'packages/database/src/generated/prisma/internal',
                'query_compiler_fast_bg.wasm',
              ),
            ) +
            '));'
          );
        }
      },
    },
  ],
  test: { include: ['tests/**/*.test.ts'] },
});
