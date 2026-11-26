import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  root: fileURLToPath(new URL('./apps/web', import.meta.url)),
  plugins: [tailwindcss()],
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  build: {
    outDir: fileURLToPath(new URL('./dist/react-preview', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: { input: fileURLToPath(new URL('./apps/web/react.html', import.meta.url)) },
  },
  server: { proxy: { '/v1': 'http://localhost:8787', '/auth': 'http://localhost:8787' } },
});
