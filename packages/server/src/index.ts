import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './room-manager.js';
import { setupSocketHandlers } from './socket-handler.js';
import { CONFIG } from '@mobile-app-lab/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Try to use HTTPS if certificates are available
let httpServer;
try {
  const certPath = path.resolve(__dirname, '../certs/localhost+3.pem');
  const keyPath = path.resolve(__dirname, '../certs/localhost+3-key.pem');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log('🔒 Using HTTPS with SSL certificates');
    httpServer = createHttpsServer({
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }, app);
  } else {
    console.log('⚠️  SSL certificates not found, using HTTP');
    httpServer = createHttpServer(app);
  }
} catch (error) {
  console.log('⚠️  Failed to load SSL certificates, using HTTP');
  httpServer = createHttpServer(app);
}

// In development, allow any private network origin (so IP changes don't break things).
// In production, use ALLOWED_ORIGINS from the environment.
const isProduction = process.env.NODE_ENV === 'production';

const getAllowedOrigins = () => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',');
  }
  return [];
};

const isPrivateNetworkOrigin = (origin: string): boolean => {
  try {
    const url = new URL(origin);
    const host = url.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
};

// Configure CORS for Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: isProduction
      ? getAllowedOrigins()
      : (origin, callback) => {
          // Allow requests with no origin (e.g. mobile apps, curl)
          if (!origin || isPrivateNetworkOrigin(origin)) {
            callback(null, true);
          } else if (getAllowedOrigins().includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`CORS blocked: ${origin}`));
          }
        },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Express middleware
app.use(cors());
app.use(express.json());

// Initialize room manager
const roomManager = new RoomManager();

// Setup socket handlers
setupSocketHandlers(io, roomManager);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Get all rooms (for debugging)
app.get('/rooms', (req, res) => {
  res.json({ rooms: roomManager.getAllRooms() });
});

// Cleanup expired rooms every 5 minutes
setInterval(() => {
  roomManager.cleanupExpiredRooms(CONFIG.ROOM_EXPIRY_MS);
}, 300000);

// Start server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : CONFIG.SERVER_PORT;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Mobile Lab Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  if (isProduction) {
    console.log(`🌐 Allowed origins: ${getAllowedOrigins().join(', ')}\n`);
  } else {
    console.log(`🌐 CORS: allowing all private network origins (dev mode)\n`);
  }
});
