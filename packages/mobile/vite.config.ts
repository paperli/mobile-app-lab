import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const keyPath = path.resolve(__dirname, 'certs/localhost+3-key.pem');
const certPath = path.resolve(__dirname, 'certs/localhost+3.pem');
const httpsConfig = fs.existsSync(keyPath) && fs.existsSync(certPath)
  ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
  : undefined;

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.riv'],
  server: {
    port: 5174,
    host: true, // Expose to network
    https: httpsConfig,
  },
});
