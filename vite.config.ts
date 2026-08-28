import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2022', outDir: 'dist', sourcemap: false, rollupOptions: { input: { main: 'index.html', demo: 'demo/index.html' } } },
  test: { environment: 'node' }
});
