// Mining API Routes for Express backend
import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { 
  miningScheduler,
  importWallets,
  getAllWallets,
  getWalletByAddress,
  deleteWalletFromMining,
  getRecentEvents,
  getMiningStats,
  configOps,
  logOps,
  MiningWallet,
  WalletImportResult,
} from './index.js';
import { 
  getSmartProvider, 
  getAllRpcStatus, 
  getCurrentRpc,
  startHealthMonitoring,
  initializeRpcHealth,
} from '../blockchain/rpcManager.js';

const router = Router();

// Track connected SSE clients
const sseClients = new Set<Response>();
const MAX_SSE_CONNECTIONS = 50;
const SSE_CLIENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes stale timeout

// Periodic cleanup of stale SSE clients
setInterval(() => {
  sseClients.forEach((client) => {
    if (client.writableEnded || client.destroyed) {
      sseClients.delete(client);
    }
  });
}, SSE_CLIENT_TIMEOUT_MS);

// Initialize RPC health monitoring
initializeRpcHealth();
startHealthMonitoring();

// Get provider dynamically
async function getProvider(): Promise<ethers.JsonRpcProvider> {
  return getSmartProvider();
}

/**
 * Broadcast a message to all connected SSE clients
 */
function broadcast(event: string, data: unknown): void {
  if (sseClients.size >= MAX_SSE_CONNECTIONS) {
    // Evict oldest client if at capacity
    const oldest = sseClients.values().next().value;
    if (oldest) {
      oldest.end();
      sseClients.delete(oldest);
    }
  }

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      if (!client.writableEnded) {
        client.write(message);
      }
    } catch {
      sseClients.delete(client);
    }
  });
}

// Hook up scheduler events to SSE
miningScheduler.on('log', (log: { level: string; message: string }) => {
  broadcast('log', log);
});

miningScheduler.on('started', () => {
  broadcast('status', { isRunning: true });
});

miningScheduler.on('stopped', () => {
  broadcast('status', { isRunning: false });
});

miningScheduler.on('wallet_start', (wallet: MiningWallet) => {
  broadcast('wallet_start', { address: wallet.address });
});

miningScheduler.on('wallet_complete', (wallet: MiningWallet) => {
  broadcast('wallet_complete', { address: wallet.address });
});

miningScheduler.on('wallet_error', ({ wallet, error }: { wallet: MiningWallet; error: Error }) => {
  broadcast('wallet_error', { address: wallet.address, error: error.message });
});

// ==================== STATUS ====================

/**
 * GET /api/mining/status
 * Get current automation status
 */
router.get('/status', (_req: Request, res: Response) => {
  try {
    const schedulerStatus = miningScheduler.getStatus();
    const config = configOps.get.get();
    const stats = getMiningStats();
    
    res.json({ 
      success: true, 
      data: {
        scheduler: schedulerStatus,
        config,
        stats,
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

// ==================== SCHEDULER ====================

/**
 * POST /api/mining/start
 * Start the automation scheduler
 */
router.post('/start', (req: Request, res: Response) => {
  try {
    const { passphrase } = req.body;
    
    if (!passphrase) {
      return res.status(400).json({
        success: false,
        error: 'Passphrase required to decrypt wallets'
      });
    }

    miningScheduler.start(passphrase);
    res.json({ success: true, message: 'Mining automation started' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

/**
 * POST /api/mining/stop
 * Stop the automation scheduler
 */
router.post('/stop', (_req: Request, res: Response) => {
  try {
    miningScheduler.stop();
    res.json({ success: true, message: 'Mining automation stopped' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

// ==================== CONFIG ====================

/**
 * GET /api/mining/config
 * Get current mining configuration
 */
router.get('/config', (_req: Request, res: Response) => {
  try {
    const config = configOps.get.get();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

/**
 * PUT /api/mining/config
 * Update mining configuration
 */
router.put('/config', (req: Request, res: Response) => {
  try {
    const { 
      recipientAddress1, 
      recipientAddress2,
      fccPerRecipient,
      offsetMinutes,
    } = req.body;

    // Validate addresses
    if (recipientAddress1 && !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress1)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid recipient address 1' 
      });
    }
    if (recipientAddress2 && !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress2)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid recipient address 2' 
      });
    }

    // Update recipients
    if (recipientAddress1 || recipientAddress2) {
      const current = configOps.get.get() as { recipient_address_1: string; recipient_address_2: string };
      configOps.updateRecipients.run({
        recipient_address_1: recipientAddress1 || current.recipient_address_1,
        recipient_address_2: recipientAddress2 || current.recipient_address_2,
      });
    }

    // Update amounts
    if (fccPerRecipient) {
      const parsed = parseFloat(fccPerRecipient);
      if (isNaN(parsed) || parsed <= 0 || parsed > 1000000) {
        return res.status(400).json({ success: false, error: 'FCC per recipient must be between 0 and 1,000,000' });
      }
      const totalFcc = (parsed * 2).toString();
      const reward = (parsed * 2 * 0.25).toString(); // 25% reward
      configOps.updateAmounts.run({
        fcc_per_recipient: fccPerRecipient,
        total_fcc_per_event: totalFcc,
        expected_mining_reward: reward,
      });
    }

    // Update scheduler settings
    if (offsetMinutes !== undefined) {
      const parsed = parseInt(offsetMinutes, 10);
      if (isNaN(parsed) || parsed < 0 || parsed > 1440) {
        return res.status(400).json({ success: false, error: 'Offset minutes must be between 0 and 1440' });
      }
      const current = configOps.get.get() as { scheduler_enabled: number; event_interval_hours: number; max_concurrent_events: number };
      configOps.updateScheduler.run({
        scheduler_enabled: current.scheduler_enabled,
        event_interval_hours: current.event_interval_hours,
        offset_minutes: offsetMinutes,
        max_concurrent_events: current.max_concurrent_events,
      });
    }

    res.json({ success: true, message: 'Configuration updated' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

// ==================== WALLETS ====================

/**
 * GET /api/mining/wallets
 * Get all mining wallets
 */
router.get('/wallets', (_req: Request, res: Response) => {
  try {
    const wallets = getAllWallets();
    // Remove sensitive data
    const safeWallets = wallets.map((w: MiningWallet) => ({
      id: w.id,
      address: w.address,
      status: w.status,
      nft_type: w.nft_type,
      nft_expiry_at: w.nft_expiry_at,
      fcc_balance: w.fcc_balance,
      usdt_balance: w.usdt_balance,
      pol_balance: w.pol_balance,
      failure_count: w.failure_count,
      last_error: w.last_error,
      created_at: w.created_at,
    }));
    res.json({ success: true, data: safeWallets });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

/**
 * POST /api/mining/wallets/import
 * Import wallets from private keys
 */
router.post('/wallets/import', async (req: Request, res: Response) => {
  try {
    const { privateKeys, passphrase } = req.body;

    // Validate private keys array
    if (!privateKeys || !Array.isArray(privateKeys) || privateKeys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Private keys array required'
      });
    }

    // Rate limit: max 50 wallets per import
    const MAX_IMPORT_SIZE = 50;
    if (privateKeys.length > MAX_IMPORT_SIZE) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_IMPORT_SIZE} wallets per import`
      });
    }

    // Validate passphrase
    if (!passphrase || typeof passphrase !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Passphrase required'
      });
    }

    if (passphrase.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Passphrase must be at least 8 characters'
      });
    }

    // Passphrase complexity: must contain uppercase, lowercase, and number
    const hasUpper = /[A-Z]/.test(passphrase);
    const hasLower = /[a-z]/.test(passphrase);
    const hasDigit = /[0-9]/.test(passphrase);
    if (!hasUpper || !hasLower || !hasDigit) {
      return res.status(400).json({
        success: false,
        error: 'Passphrase must contain uppercase, lowercase, and a number'
      });
    }

    const providerInstance = await getProvider();
    const results = await importWallets(privateKeys, passphrase, providerInstance);
    
    const successCount = results.filter((r: WalletImportResult) => r.success).length;
    const failCount = results.filter((r: WalletImportResult) => !r.success).length;

    res.json({ 
      success: true, 
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failCount,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

/**
 * GET /api/mining/wallets/:address
 * Get single wallet details
 */
router.get('/wallets/:address', (req: Request, res: Response) => {
  try {
    const address = req.params.address as string;
    
    // Validate address format
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }
    
    const wallet = getWalletByAddress(address);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    // Remove sensitive data
    const safeWallet = {
      id: wallet.id,
      address: wallet.address,
      status: wallet.status,
      nft_type: wallet.nft_type,
      nft_expiry_at: wallet.nft_expiry_at,
      fcc_balance: wallet.fcc_balance,
      usdt_balance: wallet.usdt_balance,
      pol_balance: wallet.pol_balance,
      failure_count: wallet.failure_count,
      last_error: wallet.last_error,
      created_at: wallet.created_at,
    };

    res.json({ success: true, data: safeWallet });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

/**
 * DELETE /api/mining/wallets/:address
 * Remove a wallet
 */
router.delete('/wallets/:address', (req: Request, res: Response) => {
  try {
    const address = req.params.address as string;
    const deleted = deleteWalletFromMining(address);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    res.json({ success: true, message: 'Wallet removed' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

// ==================== EVENTS ====================

/**
 * GET /api/mining/events
 * Get recent mining events with pagination
 */
router.get('/events', (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const allEvents = getRecentEvents(10000); // Get all for counting
    const events = allEvents.slice(offset, offset + limit);
    const total = allEvents.length;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/mining/wallets/:address/events
 * Get events for a specific wallet
 */
router.get('/wallets/:address/events', (req: Request, res: Response) => {
  try {
    const address = req.params.address as string;
    const wallet = getWalletByAddress(address);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    const { getEventsByWallet } = require('./eventProcessor.js');
    const events = getEventsByWallet(wallet.id);
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

/**
 * GET /api/mining/wallets/:address/stats
 * Get mining stats for a specific wallet
 */
router.get('/wallets/:address/stats', (req: Request, res: Response) => {
  try {
    const address = req.params.address as string;
    const wallet = getWalletByAddress(address);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    const { getEventsByWallet } = require('./eventProcessor.js');
    const events = getEventsByWallet(wallet.id);
    
    // Calculate wallet-specific stats
    const finishedEvents = events.filter((e: { status: string }) => e.status === 'FINISHED');
    const ongoingEvents = events.filter((e: { status: string }) => !['FINISHED', 'FAILED', 'TIMEOUT'].includes(e.status));
    const totalMined = finishedEvents
      .filter((e: { reward_received: string | null }) => e.reward_received)
      .reduce((sum: number, e: { reward_received: string }) => sum + parseFloat(e.reward_received || '0'), 0);
    
    // Calculate unique mining days
    const miningDays = new Set(
      finishedEvents
        .filter((e: { finished_at: number | null }) => e.finished_at)
        .map((e: { finished_at: number }) => new Date(e.finished_at * 1000).toDateString())
    ).size;
    
    const stats = {
      pol: wallet.pol_balance || '0',
      fcc: wallet.fcc_balance || '0',
      totalMined: totalMined.toFixed(2),
      miningDays,
      totalEvents: events.length,
      ongoingEvents: ongoingEvents.length,
      finishedEvents: finishedEvents.length,
      passExpiry: wallet.nft_expiry_at 
        ? new Date(wallet.nft_expiry_at * 1000).toISOString()
        : null,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// ==================== LOGS ====================

/**
 * GET /api/mining/logs
 * Get recent logs with pagination
 */
router.get('/logs', (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const allLogs = logOps.getRecent.all(10000); // Get all for counting
    const logs = allLogs.slice(offset, offset + limit);
    const total = allLogs.length;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// ==================== SSE ====================

/**
 * GET /api/mining/stream
 * Server-Sent Events for real-time updates
 */
router.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial status
  const status = miningScheduler.getStatus();
  res.write(`data: ${JSON.stringify({ type: 'connected', data: status })}\n\n`);

  // Add to clients
  sseClients.add(res);

  // Keep alive ping every 30s
  const pingInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`);
  }, 30000);

  // Cleanup on close
  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});

// ==================== RPC STATUS ====================

/**
 * GET /api/mining/rpc/status
 * Get all RPC endpoints status with latency
 */
router.get('/rpc/status', (_req: Request, res: Response) => {
  try {
    const status = getAllRpcStatus();
    const current = getCurrentRpc();
    
    res.json({ 
      success: true, 
      data: {
        current: current,
        endpoints: status.map(s => ({
          name: s.name,
          url: s.url.substring(0, 50) + (s.url.length > 50 ? '...' : ''),
          latency: s.latency,
          isHealthy: s.isHealthy,
          successRate: Math.round(s.successRate * 100),
          lastCheck: s.lastCheck,
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

/**
 * GET /api/mining/rpc/current
 * Get current active RPC
 */
router.get('/rpc/current', (_req: Request, res: Response) => {
  try {
    const current = getCurrentRpc();
    res.json({ success: true, data: current });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

export default router;
