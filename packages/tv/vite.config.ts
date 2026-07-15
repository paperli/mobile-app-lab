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
  // Ensure a single copy of three across react-three-fiber / drei / postprocessing.
  resolve: {
    dedupe: ['three', '@react-three/fiber'],
  },
  server: {
    port: 5173,
    host: true, // Expose to network
    https: httpsConfig,
  },
});
