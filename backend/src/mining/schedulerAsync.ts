/**
 * Mining Scheduler - Persistent automation with Supabase
 * 
 * This scheduler runs continuously and persists state to Supabase.
 * It survives server restarts by checking database state on startup.
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { 
  configOps, 
  logOps, 
  schedulerOps, 
  walletOps,
  MiningWallet,
  MiningConfig,
  SchedulerState,
} from './databaseAdapter.js';

export class MiningScheduler extends EventEmitter {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private provider: ethers.JsonRpcProvider;
  private passphrase: string = '';
  private processingWallets = new Set<number>();
  private initialized = false;

  constructor(rpcUrl: string = 'https://polygon-bor-rpc.publicnode.com') {
    super();
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Initialize scheduler (must be called after database is ready)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    logger.info('🔄 Initializing scheduler...');
    
    try {
      // Check for persisted running state
      const state = await schedulerOps.get();
      
      if (state && state.is_running) {
        logger.info('⚠️ Scheduler was running before restart.');
        logger.info('   Passphrase is required to resume. Marking as stopped.');
        
        // Log the restart
        await logOps.insert({
          wallet_id: null,
          event_id: null,
          level: 'WARN',
          action: 'SCHEDULER_RESTART',
          message: 'Server restarted while scheduler was running. Manual restart required.',
          tx_hash: null,
          metadata: JSON.stringify({ 
            last_tick_at: state.last_tick_at,
            started_at: state.started_at,
          }),
        });
        
        // Reset running state (passphrase cannot be restored)
        await schedulerOps.stop();
      }
      
      this.initialized = true;
      logger.info('✅ Scheduler initialized');
    } catch (error) {
      logger.error('Failed to initialize scheduler:', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Hash passphrase for storage verification
   */
  private hashPassphrase(passphrase: string): string {
    return crypto.createHash('sha256').update(passphrase).digest('hex');
  }

  /**
   * Start the scheduler
   */
  async start(passphrase: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (this.isRunning) {
      this.emit('log', { level: 'warn', message: 'Scheduler already running' });
      return;
    }

    this.passphrase = passphrase;
    this.isRunning = true;

    try {
      // Update config
      await configOps.updateScheduler(1, 24, 5, 3);

      // Persist scheduler state to database
      await schedulerOps.start(this.hashPassphrase(passphrase));

      // Log start
      await logOps.insert({
        wallet_id: null,
        event_id: null,
        level: 'SUCCESS',
        action: 'SCHEDULER_START',
        message: 'Mining scheduler started',
        tx_hash: null,
        metadata: null,
      });

      this.emit('started');
      this.emit('log', { level: 'success', message: 'Mining scheduler started' });

      // Run tick every minute
      this.intervalId = setInterval(() => this.tick(), 60000);

      // Initial tick
      await this.tick();
    } catch (error) {
      this.isRunning = false;
      this.passphrase = '';
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.passphrase = '';

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    try {
      // Update config
      await configOps.updateScheduler(0, 24, 5, 3);

      // Persist stop state to database
      await schedulerOps.stop();

      // Log stop
      await logOps.insert({
        wallet_id: null,
        event_id: null,
        level: 'INFO',
        action: 'SCHEDULER_STOP',
        message: 'Mining scheduler stopped',
        tx_hash: null,
        metadata: null,
      });

      this.emit('stopped');
      this.emit('log', { level: 'info', message: 'Mining scheduler stopped' });
    } catch (error) {
      logger.error('Error stopping scheduler:', { error: (error as Error).message });
    }
  }

  /**
   * Main scheduler tick
   */
  private async tick(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const config = await configOps.get();
      
      if (!config.scheduler_enabled) {
        return;
      }

      const maxConcurrent = config.max_concurrent_wallets || 3;
      
      // Early return if already processing max wallets (race condition fix)
      if (this.processingWallets.size >= maxConcurrent) {
        this.emit('log', { 
          level: 'debug', 
          message: `Tick skipped: ${this.processingWallets.size} wallets already processing (max: ${maxConcurrent})` 
        });
        return;
      }

      // Update tick timestamp in database
      await schedulerOps.updateTick(JSON.stringify([...this.processingWallets]));

      // Calculate available slots
      const availableSlots = maxConcurrent - this.processingWallets.size;
      
      // Get ready wallets (limited to available slots)
      const readyWallets = await walletOps.getReadyForEvent(
        config.offset_minutes,
        availableSlots
      );

      this.emit('log', { 
        level: 'debug', 
        message: `Tick: ${readyWallets.length} wallets ready, ${this.processingWallets.size} processing, ${availableSlots} slots available` 
      });

      // Filter out wallets currently being processed (extra safety)
      const walletsToProcess = readyWallets.filter(
        (w: MiningWallet) => !this.processingWallets.has(w.id)
      );

      // Process wallets with controlled concurrency
      for (const wallet of walletsToProcess) {
        if (this.processingWallets.size >= maxConcurrent) break;
        await this.processWalletAsync(wallet);
      }
    } catch (error) {
      this.emit('error', error);
      await logOps.insert({
        wallet_id: null,
        event_id: null,
        level: 'ERROR',
        action: 'SCHEDULER_TICK_ERROR',
        message: (error as Error).message,
        tx_hash: null,
        metadata: null,
      });
    }
  }

  /**
   * Process wallet asynchronously
   */
  private async processWalletAsync(wallet: MiningWallet): Promise<void> {
    this.processingWallets.add(wallet.id);
    
    // Update processing wallets in database
    await schedulerOps.updateTick(JSON.stringify([...this.processingWallets]));
    
    this.emit('wallet_start', wallet);
    this.emit('log', { 
      level: 'info', 
      message: `Processing wallet ${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}` 
    });

    try {
      // Import processWallet dynamically to avoid circular dependency
      const { processWallet } = await import('./eventProcessorAsync.js');
      await processWallet(wallet, this.passphrase, this.provider);
      
      this.emit('wallet_complete', wallet);
      this.emit('log', { 
        level: 'success', 
        message: `Completed wallet ${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}` 
      });
    } catch (error) {
      this.emit('wallet_error', { wallet, error });
      this.emit('log', { 
        level: 'error', 
        message: `Error processing ${wallet.address.slice(0, 8)}...: ${(error as Error).message}` 
      });
    } finally {
      this.processingWallets.delete(wallet.id);
      
      // Update processing wallets in database
      await schedulerOps.updateTick(JSON.stringify([...this.processingWallets]));
    }
  }

  /**
   * Get scheduler status
   */
  async getStatus(): Promise<{
    isRunning: boolean;
    processingCount: number;
    lastTickAt?: number;
    startedAt?: number;
  }> {
    try {
      const dbState = await schedulerOps.get();
      
      return {
        isRunning: this.isRunning,
        processingCount: this.processingWallets.size,
        lastTickAt: dbState?.last_tick_at || undefined,
        startedAt: dbState?.started_at || undefined,
      };
    } catch {
      return {
        isRunning: this.isRunning,
        processingCount: this.processingWallets.size,
      };
    }
  }

  /**
   * Check if scheduler is running (sync version for compatibility)
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Set RPC URL
   */
  setRpcUrl(url: string): void {
    this.provider = new ethers.JsonRpcProvider(url);
  }
}

// Singleton instance
export const miningScheduler = new MiningScheduler();
