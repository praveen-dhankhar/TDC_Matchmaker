/**
 * TDC Matchmaker — Express API Server
 *
 * Entry point for the backend. Sets up middleware, routes, and initializes
 * the in-memory data store before accepting connections.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { dataStore } from './data/store';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import profileRoutes from './routes/profile.routes';

const app = express();

// ---- Security middleware ----
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ---- Parsing middleware ----
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---- Rate limiting ----
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please slow down.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---- Health check (no auth) ----
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    stats: dataStore.getStats(),
  });
});

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/customers', apiLimiter, authMiddleware, customerRoutes);
app.use('/api/profiles', apiLimiter, authMiddleware, profileRoutes);

// ---- Error handler (must be last) ----
app.use(errorHandler);

// ---- Start server ----
async function start() {
  try {
    await dataStore.initialize();
    app.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════════╗
║     TDC Matchmaker API — v1.0.0                  ║
║     Running on http://localhost:${config.port}            ║
║     Environment: ${config.nodeEnv.padEnd(30)}║
║     CORS Origin: ${config.cors.origin.padEnd(30)}║
╚══════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;
