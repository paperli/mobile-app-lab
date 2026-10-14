import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// HTTPS in dev when the repo's mkcert certificates are present, matching the
// TV app and the onboarding.
const keyPath = path.resolve(__dirname, '../tv/certs/localhost+3-key.pem');
const certPath = path.resolve(__dirname, '../tv/certs/localhost+3.pem');
const httpsConfig =
  fs.existsSync(keyPath) && fs.existsSync(certPath)
    ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    : undefined;

// The Pages build drops this inside the TV demo's output, so the hub sits at
// /<base>/ and this prototype at /<base>/preroll/ in one artifact.
const pagesOutDir = process.env.PAGES_OUT_DIR;

export default defineConfig(({ command }) => ({
  // Everything lives under /preroll/, apart from the hub (/) and the
  // onboarding (/onboarding/). The build is relative, so it runs from
  // /<base>/preroll/ on Pages; dev serves the same /preroll/ path.
  base: command === 'serve' ? '/preroll/' : './',
  build: {
    outDir: pagesOutDir || 'dist',
    // Never wipe the directory when building into the TV demo's output.
    emptyOutDir: !pagesOutDir,
    // Two pages: the versions landing page (index) and the prototype (play).
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        play: path.resolve(__dirname, 'play.html'),
      },
    },
  },
  server: {
    port: 5176,
    host: true,
    https: httpsConfig,
  },
}));
