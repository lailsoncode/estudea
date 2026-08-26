import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'src/site-worker.ts',
    outDir: 'dist/server',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
      },
    },
  },
});
