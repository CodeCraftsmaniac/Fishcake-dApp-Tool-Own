// Nonce Manager - Track nonces per wallet to prevent conflicts
// Persists pending nonces to database for recovery across restarts
import { ethers } from 'ethers';
import { nonceOps, db } from './database.js';
import logger from '../utils/logger.js';

interface NonceEntry {
  nonce: number;
  pendingCount: number;
  lastUpdated: number;
}

class NonceManager {
  private nonces: Map<string, NonceEntry> = new Map();
  private locks: Map<string, Promise<void>> = new Map();

  /**
   * Load persisted nonces from database on startup
   */
  loadFromDB(): void {
    try {
      const rows = db.prepare('SELECT address, nonce, pending_count, last_updated FROM pending_nonces').all() as Array<{ address: string; nonce: number; pending_count: number; last_updated: number }>;
      for (const row of rows) {
        // Only restore if last_updated within 60 seconds (stale otherwise)
        if (Date.now() - row.last_updated < 60000) {
          this.nonces.set(row.address, {
            nonce: row.nonce,
            pendingCount: row.pending_count,
            lastUpdated: row.last_updated,
          });
        }
      }
      logger.info(`Loaded ${this.nonces.size} persisted nonces from database`);
    } catch (error) {
      logger.error('Failed to load nonces from DB:', { error: (error as Error).message });
    }
  }

  /**
   * Persist current nonce state to database
   */
  private persistToDB(key: string, entry: NonceEntry): void {
    try {
      nonceOps.upsert.run(key, entry.nonce, entry.pendingCount, entry.lastUpdated);
    } catch (error) {
      logger.error('Failed to persist nonce to DB:', { error: (error as Error).message });
    }
  }

  /**
   * Remove nonce from database
   */
  private removeFromDB(key: string): void {
    try {
      nonceOps.delete.run(key);
    } catch (error) {
      logger.error('Failed to remove nonce from DB:', { error: (error as Error).message });
    }
  }

  /**
   * Get next available nonce for an address
   */
  async getNextNonce(
    address: string,
    provider: ethers.JsonRpcProvider
  ): Promise<number> {
    const key = address.toLowerCase();
    
    // Wait for any pending lock
    await this.waitForLock(key);
    
    // Acquire lock
    let releaseLock: () => void;
    this.locks.set(key, new Promise(resolve => { releaseLock = resolve; }));

    try {
      const entry = this.nonces.get(key);
      const now = Date.now();

      // If we have a recent nonce, use it incremented
      if (entry && now - entry.lastUpdated < 60000) {
        const nextNonce = entry.nonce + entry.pendingCount;
        this.nonces.set(key, {
          nonce: entry.nonce,
          pendingCount: entry.pendingCount + 1,
          lastUpdated: now,
        });
        this.persistToDB(key, this.nonces.get(key)!);
        return nextNonce;
      }

      // Fetch from chain
      const chainNonce = await provider.getTransactionCount(address, 'pending');
      this.nonces.set(key, {
        nonce: chainNonce,
        pendingCount: 1,
        lastUpdated: now,
      });
      this.persistToDB(key, this.nonces.get(key)!);

      return chainNonce;
    } finally {
      // Release lock
      releaseLock!();
      this.locks.delete(key);
    }
  }

  /**
   * Mark a nonce as confirmed (transaction mined)
   */
  confirmNonce(address: string, nonce: number): void {
    const key = address.toLowerCase();
    const entry = this.nonces.get(key);
    
    if (entry && entry.nonce <= nonce) {
      const updated = {
        nonce: nonce + 1,
        pendingCount: Math.max(0, entry.pendingCount - 1),
        lastUpdated: Date.now(),
      };
      this.nonces.set(key, updated);
      this.persistToDB(key, updated);
    }
  }

  /**
   * Reset nonce for an address (after error)
   */
  resetNonce(address: string): void {
    const key = address.toLowerCase();
    this.nonces.delete(key);
    this.removeFromDB(key);
  }

  /**
   * Clear all cached nonces
   */
  clearAll(): void {
    this.nonces.clear();
    try {
      nonceOps.clearAll.run();
    } catch { /* ignore clear error */ }
  }

  /**
   * Wait for lock to be released
   */
  private async waitForLock(key: string): Promise<void> {
    const lock = this.locks.get(key);
    if (lock) {
      await lock;
    }
  }
}

// Singleton instance
export const nonceManager = new NonceManager();

/**
 * Send transaction with managed nonce
 */
export async function sendWithManagedNonce(
  wallet: ethers.Wallet,
  tx: ethers.TransactionRequest
): Promise<ethers.TransactionResponse> {
  const nonce = await nonceManager.getNextNonce(wallet.address, wallet.provider as ethers.JsonRpcProvider);
  
  try {
    const response = await wallet.sendTransaction({ ...tx, nonce });
    
    // Wait for confirmation in background
    response.wait().then(() => {
      nonceManager.confirmNonce(wallet.address, nonce);
    }).catch(() => {
      nonceManager.resetNonce(wallet.address);
    });
    
    return response;
  } catch (error) {
    nonceManager.resetNonce(wallet.address);
    throw error;
  }
}
