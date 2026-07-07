import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Static build of the hub layout demo for GitHub Pages.
// Entry lives in pages/index.html; base is relative so it works under any
// Pages sub-path (e.g. https://<user>.github.io/<repo>/).
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'pages'),
  base: './',
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist-demo'),
    emptyOutDir: true,
  },
});
