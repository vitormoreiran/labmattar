import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The matrix is a client-only instrument. Publish it as a static browser entry
// rather than invoking the Node-targeted SSR bundle in a Workers request.
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  base: '/',
  build: {
    outDir: 'dist/matrix',
    emptyOutDir: true,
    rollupOptions: {
      input: 'design/matrix/index.html',
      output: {
        entryFileNames: 'matrix-assets/[name]-[hash].js',
        chunkFileNames: 'matrix-assets/[name]-[hash].js',
        assetFileNames: 'matrix-assets/[name]-[hash][extname]',
      },
    },
  },
});
