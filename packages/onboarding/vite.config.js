import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import fs from 'fs';
import path from 'path';

// HTTPS in dev when the repo's mkcert certificates are present, matching the
// TV app so both prototypes can be opened from a phone on the same network.
const keyPath = path.resolve(__dirname, '../tv/certs/localhost+3-key.pem');
const certPath = path.resolve(__dirname, '../tv/certs/localhost+3.pem');
const httpsConfig =
  fs.existsSync(keyPath) && fs.existsSync(certPath)
    ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    : undefined;

// The Pages build drops this inside the TV demo's output, so the hub sits at
// /<base>/ and the onboarding at /<base>/onboarding/ in one artifact.
const pagesOutDir = process.env.PAGES_OUT_DIR;

export default defineConfig({
  // Relative, so the build runs from any path — it is published to a
  // subdirectory of the Pages site (/<base>/onboarding/).
  base: './',
  plugins: [
    // TV browsers lag well behind desktop; the legacy bundle is the point of
    // building this on Lightning in the first place.
    legacy({ targets: ['chrome >= 53', 'safari >= 11'] }),
  ],
  resolve: {
    alias: {
      // The original prototype aliased this; Blits exposes the live renderer
      // instance from its launch module and has no public export for it.
      'blits-renderer': path.resolve(
        __dirname,
        '../../node_modules/@lightningjs/blits/src/launch.js',
      ),
    },
  },
  build: {
    outDir: pagesOutDir || 'dist',
    // Never wipe the directory when building into the TV demo's output.
    emptyOutDir: !pagesOutDir,
    // Keeps the GLSL in the orb shader readable in a deployed build.
    minify: 'terser',
    terserOptions: { compress: { drop_console: true } },
  },
  server: {
    port: 5175,
    host: true,
    https: httpsConfig,
  },
});
