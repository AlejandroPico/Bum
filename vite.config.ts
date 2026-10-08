import { defineConfig } from 'vite';

// `base` relativo para que funcione tanto en local como en GitHub Pages (/<repo>/)
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true, port: 5173 },
});
