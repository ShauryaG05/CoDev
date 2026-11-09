import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/index.js';
import { initRealtimeGateway } from './sockets/gateway.js';
import { docManager } from './services/docManager.js';

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  // Database Connection
  await connectDB();

  // Middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );
  app.use(
    cors({
      origin: [ENV.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
  app.use(express.json());

  // Health Route
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'CoDev API & Realtime Gateway',
      time: new Date().toISOString(),
    });
  });

  // REST API Routes
  app.use('/api', apiRoutes);

  // Real-time Gateway (Socket.IO)
  const io = new SocketIOServer(server, {
    cors: {
      origin: [ENV.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  initRealtimeGateway(io);

  // Central Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Unhandled Error]', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
    });
  });

  server.listen(ENV.PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 CoDev Server running on http://localhost:${ENV.PORT}`);
    console.log(`📡 Realtime Gateway ready on ws://localhost:${ENV.PORT}`);
    console.log(`🌐 Allowed client origin: ${ENV.CLIENT_ORIGIN}`);
    console.log(`================================================================`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
    try {
      await docManager.flushAll();
      server.close(() => {
        console.log('[Server] HTTP and Socket server closed.');
        process.exit(0);
      });
    } catch (e) {
      console.error('[Server] Error during shutdown flush:', e);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Error]', err);
});
