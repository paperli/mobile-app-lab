import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// HTTPS in dev when the repo's mkcert certificates are present, matching the
// TV app and the other standalone prototypes.
const keyPath = path.resolve(__dirname, '../tv/certs/localhost+3-key.pem');
const certPath = path.resolve(__dirname, '../tv/certs/localhost+3.pem');
const httpsConfig =
  fs.existsSync(keyPath) && fs.existsSync(certPath)
    ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    : undefined;

// The Pages build drops this inside the TV demo's output, so the hub sits at
// /<base>/ and this prototype at /<base>/funnel/ in one artifact.
const pagesOutDir = process.env.PAGES_OUT_DIR;

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/funnel/' : './',
  build: {
    outDir: pagesOutDir || 'dist',
    emptyOutDir: !pagesOutDir,
  },
  server: {
    port: 5177,
    host: true,
    https: httpsConfig,
  },
}));
