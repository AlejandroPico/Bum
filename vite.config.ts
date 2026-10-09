import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// `base` relativo para que funcione tanto en local como en GitHub Pages (/<repo>/)
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true, port: 5173 },
  plugins: [
    {
      // publica también el icono en la raíz del sitio (favicon.svg), además de en assets/
      name: 'favicon-root',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'favicon.svg', source: readFileSync('favicon.svg') });
      },
    },
  ],
});
