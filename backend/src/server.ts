/**
 * Fishcake Backend Server
 * 
 * Standalone Express server for the Mining Automation backend.
 * This server runs independently from the frontend (Vercel) and handles:
 * - Mining automation engine
 * - Scheduler
 * - Wallet processing
 * - Blockchain interactions
 * - Database operations
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { initializeDatabase, walletOps, closeDatabase } from './mining/database.js';
import miningRoutes from './mining/miningRoutes.js';
import { miningScheduler } from './mining/scheduler.js';
import { getAllRpcStatus, getCurrentRpc } from './blockchain/rpcManager.js';
import { BACKEND_VERSION } from './index.js';
import logger from './utils/logger.js';

// Environment configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'production';
const FRONTEND_URLS = (process.env.FRONTEND_URLS || 'https://fishcake-dapp.vercel.app').split(',');

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Disable for API server
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check against allowed frontend URLs using exact match (secure)
    // Normalize URLs: remove trailing slashes and compare exactly
    const normalizedOrigin = origin.replace(/\/+$/, '');
    const isAllowed = FRONTEND_URLS.some(url => {
      const normalizedUrl = url.trim().replace(/\/+$/, '');
      return normalizedOrigin === normalizedUrl;
    });
    
    if (isAllowed) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // Cache preflight for 24 hours
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    let dbStatus = 'ok';
    try {
      const { db } = await import('./mining/database.js');
      db.prepare('SELECT 1').get();
    } catch {
      dbStatus = 'error';
    }

    const rpcStatus = getAllRpcStatus();
    const currentRpc = getCurrentRpc();
    const schedulerStatus = miningScheduler.getStatus();
    // Get active wallet count from prepared statement
    const activeWallets = (walletOps.getActive as { all: () => unknown[] }).all() || [];
    const walletCount = activeWallets.length;

    res.json({
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      version: BACKEND_VERSION,
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
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
app.get('/version', (req: Request, res: Response) => {
  res.json({
    version: BACKEND_VERSION,
    nodeVersion: process.version,
    environment: NODE_ENV,
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
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Initialize and start server
async function startServer() {
  try {
    logger.info('Fishcake Backend Server Starting...');
    logger.info(`Environment: ${NODE_ENV}`);
    logger.info(`Port: ${PORT}`);
    
    // Initialize database
    logger.info('Initializing database...');
    initializeDatabase();
    logger.info('Database initialized');
    
    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info('API available at /api/mining');
      logger.info('Health check at /health');
    });
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.warn(`Received ${signal}. Shutting down gracefully...`);
      
      // Stop scheduler
      if (miningScheduler) {
        logger.info('Stopping mining scheduler...');
        miningScheduler.stop();
      }
      
      // Close database connection
      logger.info('Closing database connection...');
      closeDatabase();
      
      // Close server
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
      
      // Force close after 10 seconds
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

// Start if running directly
startServer();

export { app, startServer };
