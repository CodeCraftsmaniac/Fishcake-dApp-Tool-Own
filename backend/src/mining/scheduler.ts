// Mining Scheduler - Cron-based automation
import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { configOps, logOps } from './database.js';
import { getReadyWallets, MiningWallet } from './walletService.js';
import { processWallet, MiningConfig } from './eventProcessor.js';

export class MiningScheduler extends EventEmitter {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private provider: ethers.JsonRpcProvider;
  private passphrase: string = '';
  private processingWallets = new Set<number>();

  constructor(rpcUrl: string = 'https://polygon-rpc.com') {
    super();
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
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

      // Get ready wallets
      const readyWallets = getReadyWallets(
        config.offset_minutes,
        config.max_concurrent_wallets || 3
      );

      // Filter out wallets currently being processed
      const walletsToProcess = readyWallets.filter(
        (w: MiningWallet) => !this.processingWallets.has(w.id)
      );

      // Process each ready wallet
      for (const wallet of walletsToProcess) {
        this.processWalletAsync(wallet);
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
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    processingCount: number;
  } {
    return {
      isRunning: this.isRunning,
      processingCount: this.processingWallets.size,
    };
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
