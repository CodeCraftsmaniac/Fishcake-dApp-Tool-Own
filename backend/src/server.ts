/**
 * Fishcake Backend Server - Supabase (Production)
 * 
 * Standalone Express server for the Mining Automation backend.
 * Uses Supabase (PostgreSQL) for persistent database storage.
 */

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { initializeDatabase, walletOps, closeDatabase } from './mining/databaseAdapter.js';
import miningRoutes from './mining/miningRoutesAsync.js';
import { miningScheduler } from './mining/schedulerAsync.js';
import { getAllRpcStatus, getCurrentRpc } from './blockchain/rpcManager.js';
import logger from './utils/logger.js';

const BACKEND_VERSION = '2.0.0-supabase';

// Environment configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'production';
const FRONTEND_URLS = (process.env.FRONTEND_URLS || 'https://fishcake-dapp.vercel.app,http://localhost:3000').split(',');

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/+$/, '');
    const isAllowed = FRONTEND_URLS.some(url => {
      const normalizedUrl = url.trim().replace(/\/+$/, '');
      return normalizedOrigin === normalizedUrl;
    });
    
    if (isAllowed) {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const rpcStatus = getAllRpcStatus();
    const currentRpc = getCurrentRpc();
    const schedulerStatus = await miningScheduler.getStatus();
    
    // Check Supabase connectivity
    let dbStatus = 'ok';
    let walletCount = 0;
    try {
      const activeWallets = await walletOps.getActive();
      walletCount = activeWallets.length;
    } catch {
      dbStatus = 'error';
    }

    res.json({
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      version: BACKEND_VERSION,
      database: 'supabase',
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      rpc: {
        current: currentRpc.name,
        currentLatency: currentRpc.latency,
        healthy: rpcStatus.filter((e: { isHealthy: boolean }) => e.isHealthy).length,
        total: rpcStatus.length,
      },
      scheduler: {
        running: schedulerStatus.isRunning,
        processingWallets: schedulerStatus.processingCount,
        activeWallets: walletCount,
        lastTickAt: schedulerStatus.lastTickAt,
        startedAt: schedulerStatus.startedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: (error as Error).message,
    });
  }
});

// Version endpoint
app.get('/version', (_req: Request, res: Response) => {
  res.json({
    version: BACKEND_VERSION,
    nodeVersion: process.version,
    environment: NODE_ENV,
    database: 'supabase',
  });
});

// API routes
app.use('/api/mining', miningRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Initialize and start server
async function startServer() {
  try {
    logger.info('Fishcake Backend Server Starting (Supabase)...');
    logger.info(`Environment: ${NODE_ENV}`);
    logger.info(`Port: ${PORT}`);
    logger.info('Database: Supabase (PostgreSQL)');
    
    // Initialize Supabase database
    logger.info('Initializing Supabase database...');
    await initializeDatabase();
    logger.info('Database initialized');
    
    // Initialize scheduler
    logger.info('Initializing scheduler...');
    await miningScheduler.initialize();
    logger.info('Scheduler initialized');
    
    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info('API available at /api/mining');
      logger.info('Health check at /health');
    });
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.warn(`Received ${signal}. Shutting down gracefully...`);
      
      if (miningScheduler) {
        logger.info('Stopping mining scheduler...');
        await miningScheduler.stop();
      }
      
      logger.info('Closing database connection...');
      closeDatabase();
      
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
      
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', { error: (error as Error).message });
    process.exit(1);
  }
}

startServer();

export { app, startServer };
