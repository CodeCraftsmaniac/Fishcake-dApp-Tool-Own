// Mining API Routes for Express backend
import { Router, Request, Response } from 'express';
import { miningEngine, MiningConfig, MiningWallet } from './MiningAutomationEngine';
import crypto from 'crypto';

const router = Router();

// Track connected SSE clients
const sseClients = new Set<Response>();

// Hook up engine events to SSE
miningEngine.on('log', (log) => {
  broadcast('log', log);
});

miningEngine.on('workflow', (workflow) => {
  broadcast('workflow', workflow);
});

miningEngine.on('step', (step) => {
  broadcast('step', step);
});

miningEngine.on('started', () => {
  broadcast('status', { isRunning: true });
});

miningEngine.on('stopped', () => {
  broadcast('status', { isRunning: false });
});

/**
 * Broadcast event to all SSE clients
 */
function broadcast(type: string, data: unknown): void {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  sseClients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  });
}

/**
 * GET /api/mining/status
 * Get current automation status
 */
router.get('/status', (_req: Request, res: Response) => {
  try {
    const status = miningEngine.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

/**
 * POST /api/mining/start
 * Start the automation scheduler
 */
router.post('/start', (_req: Request, res: Response) => {
  try {
    miningEngine.start();
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
    miningEngine.stop();
    res.json({ success: true, message: 'Mining automation stopped' });
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
    const updates: Partial<MiningConfig> = req.body;

    // Validate addresses
    if (updates.recipientAddress1 && !/^0x[a-fA-F0-9]{40}$/.test(updates.recipientAddress1)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid recipient address 1' 
      });
    }
    if (updates.recipientAddress2 && !/^0x[a-fA-F0-9]{40}$/.test(updates.recipientAddress2)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid recipient address 2' 
      });
    }

    miningEngine.updateConfig(updates);
    res.json({ success: true, message: 'Configuration updated' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

/**
 * POST /api/mining/wallet
 * Add a wallet for mining automation
 */
router.post('/wallet', (req: Request, res: Response) => {
  try {
    const { privateKey, passphrase } = req.body;

    if (!privateKey || !passphrase) {
      return res.status(400).json({
        success: false,
        error: 'Private key and passphrase required'
      });
    }

    // Validate private key
    let address: string;
    try {
      const { ethers } = require('ethers');
      const wallet = new ethers.Wallet(privateKey);
      address = wallet.address;
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid private key'
      });
    }

    // Encrypt private key with AES-256-GCM
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    const miningWallet: MiningWallet = {
      id: `wallet_${Date.now()}`,
      address,
      encryptedKey: encrypted + authTag,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      status: 'active',
      nftType: 'NONE',
      nftExpiry: null,
      failureCount: 0,
      lastEventId: null,
      nextEventAt: null,
    };

    miningEngine.addWallet(miningWallet);

    res.json({ 
      success: true, 
      data: {
        id: miningWallet.id,
        address: miningWallet.address,
        status: miningWallet.status,
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
 * DELETE /api/mining/wallet/:id
 * Remove a wallet from automation
 */
router.delete('/wallet/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    miningEngine.removeWallet(id);
    res.json({ success: true, message: 'Wallet removed' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

/**
 * GET /api/mining/events
 * Server-Sent Events for real-time updates
 */
router.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial status
  const status = miningEngine.getStatus();
  res.write(`data: ${JSON.stringify({ type: 'status', data: status })}\n\n`);

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

export default router;
