/**
 * Fishcake Backend Server - Async version with Supabase
 * 
 * Standalone Express server for the Mining Automation backend.
 * Uses Supabase for persistent database storage (survives restarts).
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { initializeDatabase, walletOps, closeDatabase } from './mining/databaseAdapter.js';
import miningRoutes from './mining/miningRoutesAsync.js';
import { miningScheduler } from './mining/schedulerAsync.js';
import { getAllRpcStatus, getCurrentRpc } from './blockchain/rpcManager.js';

// Version
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

// CORS configuration - Fixed to use exact match instead of startsWith
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check against allowed frontend URLs (exact match, not startsWith)
    const normalizedOrigin = origin.replace(/\/$/, ''); // Remove trailing slash
    const allowed = FRONTEND_URLS.some(url => {
      const normalizedUrl = url.trim().replace(/\/$/, '');
      return normalizedOrigin === normalizedUrl;
    });
    
    if (allowed) {
      return callback(null, true);
    }
    
    // Also allow localhost for development
    if (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression middleware
app.use(compression());

// Body parsing middleware with reasonable limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const rpcStatus = getAllRpcStatus();
    const currentRpc = getCurrentRpc();
    const schedulerStatus = await miningScheduler.getStatus();
    
    // Get active wallet count from Supabase
    let walletCount = 0;
    try {
      const activeWallets = await walletOps.getActive();
      walletCount = activeWallets.length;
    } catch (error) {
      console.error('Failed to get wallet count:', error);
    }
    
    res.json({
      status: 'healthy',
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
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[ERROR] ${err.message}`);
  console.error(err.stack);
  
  // Don't expose stack traces in production
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Initialize and start server
async function startServer() {
  try {
    console.log('🐠 Fishcake Backend Server Starting...');
    console.log(`📍 Environment: ${NODE_ENV}`);
    console.log(`🔌 Port: ${PORT}`);
    console.log(`💾 Database: Supabase (PostgreSQL)`);
    
    // Initialize Supabase database
    console.log('📦 Initializing Supabase database...');
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Initialize scheduler
    console.log('🔄 Initializing scheduler...');
    await miningScheduler.initialize();
    console.log('✅ Scheduler initialized');
    
    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 API available at /api/mining`);
      console.log(`❤️  Health check at /health`);
    });
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n⚠️  Received ${signal}. Shutting down gracefully...`);
      
      // Stop scheduler
      if (miningScheduler) {
        console.log('⏸️  Stopping mining scheduler...');
        await miningScheduler.stop();
      }
      
      // Close database connection
      console.log('📦 Closing database connection...');
      closeDatabase();
      
      // Close server
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start if running directly
startServer();

export { app, startServer, BACKEND_VERSION };
