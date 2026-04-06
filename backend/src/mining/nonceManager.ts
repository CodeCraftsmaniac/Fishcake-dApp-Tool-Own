// Nonce Manager - Track nonces per wallet to prevent conflicts
import { ethers } from 'ethers';

interface NonceEntry {
  nonce: number;
  pendingCount: number;
  lastUpdated: number;
}

class NonceManager {
  private nonces: Map<string, NonceEntry> = new Map();
  private locks: Map<string, Promise<void>> = new Map();

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
        return nextNonce;
      }

      // Fetch from chain
      const chainNonce = await provider.getTransactionCount(address, 'pending');
      this.nonces.set(key, {
        nonce: chainNonce,
        pendingCount: 1,
        lastUpdated: now,
      });

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
      this.nonces.set(key, {
        nonce: nonce + 1,
        pendingCount: Math.max(0, entry.pendingCount - 1),
        lastUpdated: Date.now(),
      });
    }
  }

  /**
   * Reset nonce for an address (after error)
   */
  resetNonce(address: string): void {
    this.nonces.delete(address.toLowerCase());
  }

  /**
   * Clear all cached nonces
   */
  clearAll(): void {
    this.nonces.clear();
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
