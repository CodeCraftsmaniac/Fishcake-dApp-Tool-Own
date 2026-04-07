// Mining Scheduler - Cron-based automation with database persistence
import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { configOps, logOps, schedulerOps } from './database.js';
import { getReadyWallets, MiningWallet } from './walletService.js';
import { processWallet, MiningConfig } from './eventProcessor.js';

interface SchedulerState {
  id: number;
  is_running: number;
  passphrase_hash: string | null;
  started_at: number | null;
  last_tick_at: number | null;
  processing_wallets: string;
}

export class MiningScheduler extends EventEmitter {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private provider: ethers.JsonRpcProvider;
  private passphrase: string = '';
  private processingWallets = new Set<number>();

  constructor(rpcUrl: string = 'https://polygon-bor-rpc.publicnode.com') {
    super();
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Check for persisted state on startup
    this.restoreState();
  }

  /**
   * Hash passphrase for storage (we store hash, not actual passphrase)
   */
  private hashPassphrase(passphrase: string): string {
    return crypto.createHash('sha256').update(passphrase).digest('hex');
  }

  /**
   * Restore scheduler state from database on startup
   */
  private restoreState(): void {
    try {
      const state = schedulerOps.get.get() as SchedulerState | undefined;
      
      if (state && state.is_running === 1) {
        // Scheduler was running before - log this but don't auto-restart
        // (need passphrase which we don't store)
        logOps.insert.run({
          wallet_id: null,
          event_id: null,
          level: 'WARN',
          action: 'SCHEDULER_RESTORE',
          message: 'Scheduler was running before restart. Manual restart required.',
          tx_hash: null,
          metadata: JSON.stringify({ last_tick_at: state.last_tick_at }),
        });
        
        // Reset the running state since we can't restore passphrase
        schedulerOps.stop.run();
      }
    } catch (error) {
      console.error('Failed to restore scheduler state:', error);
    }
  }

  /**
   * Start the scheduler
   */
  start(passphrase: string): void {
    if (this.isRunning) {
      this.emit('log', { level: 'warn', message: 'Scheduler already running' });
      return;
    }

    this.passphrase = passphrase;
    this.isRunning = true;

    // Update config
    configOps.updateScheduler.run({
      scheduler_enabled: 1,
      event_interval_hours: 24,
      offset_minutes: 5,
      max_concurrent_events: 3,
    });

    // Persist scheduler state to database
    schedulerOps.start.run({
      passphrase_hash: this.hashPassphrase(passphrase),
    });

    // Log start
    logOps.insert.run({
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

    // Run every minute
    this.intervalId = setInterval(() => this.tick(), 60000);

    // Initial tick
    this.tick();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.passphrase = '';

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Update config
    configOps.updateScheduler.run({
      scheduler_enabled: 0,
      event_interval_hours: 24,
      offset_minutes: 5,
      max_concurrent_events: 3,
    });

    // Persist stop state to database
    schedulerOps.stop.run();

    // Log stop
    logOps.insert.run({
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
  }

  /**
   * Main scheduler tick
   */
  private async tick(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const config = configOps.get.get() as MiningConfig;
      
      if (!config.scheduler_enabled) {
        return;
      }

      // Update tick timestamp in database
      schedulerOps.updateTick.run({
        processing_wallets: JSON.stringify([...this.processingWallets]),
      });

      // Get ready wallets
      const readyWallets = getReadyWallets(
        config.offset_minutes,
        config.max_concurrent_wallets || 3
      );

      this.emit('log', { 
        level: 'debug', 
        message: `Tick: ${readyWallets.length} wallets ready, ${this.processingWallets.size} processing` 
      });

      // Filter out wallets currently being processed
      const walletsToProcess = readyWallets.filter(
        (w: MiningWallet) => !this.processingWallets.has(w.id)
      );

      // Process wallets with controlled concurrency (no fire-and-forget)
      const maxConcurrent = config.max_concurrent_wallets || 3;
      for (let i = 0; i < walletsToProcess.length; i += maxConcurrent) {
        const batch = walletsToProcess.slice(i, i + maxConcurrent);
        await Promise.all(batch.map(wallet => this.processWalletAsync(wallet)));
      }
    } catch (error) {
      this.emit('error', error);
      logOps.insert.run({
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
    schedulerOps.updateTick.run({
      processing_wallets: JSON.stringify([...this.processingWallets]),
    });
    
    this.emit('wallet_start', wallet);
    this.emit('log', { 
      level: 'info', 
      message: `Processing wallet ${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}` 
    });

    try {
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
      schedulerOps.updateTick.run({
        processing_wallets: JSON.stringify([...this.processingWallets]),
      });
    }
  }

  /**
   * Get scheduler status (combines memory and database state)
   */
  getStatus(): {
    isRunning: boolean;
    processingCount: number;
    lastTickAt?: number;
    startedAt?: number;
  } {
    const dbState = schedulerOps.get.get() as SchedulerState | undefined;
    
    return {
      isRunning: this.isRunning,
      processingCount: this.processingWallets.size,
      lastTickAt: dbState?.last_tick_at || undefined,
      startedAt: dbState?.started_at || undefined,
    };
  }

  /**
   * Check if scheduler is running (from database)
   */
  isSchedulerRunning(): boolean {
    const dbState = schedulerOps.get.get() as SchedulerState | undefined;
    return this.isRunning || (dbState?.is_running === 1);
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
