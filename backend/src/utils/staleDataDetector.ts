/**
 * Stale data detection for balance and contract reads.
 * Tracks timestamps of last successful reads and flags stale data.
 */

interface DataTimestamp {
  value: string;
  timestamp: number;
  blockNumber?: number;
}

const STALE_THRESHOLD_MS = 30_000; // 30 seconds - data older than this is considered stale
const MAX_CACHE_ENTRIES = 500;

class StaleDataDetector {
  private cache: Map<string, DataTimestamp> = new Map();

  /**
   * Record a fresh data read
   */
  record(key: string, value: string, blockNumber?: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      blockNumber,
    });

    // Evict oldest entries if cache is too large
    if (this.cache.size > MAX_CACHE_ENTRIES) {
      const entries = [...this.cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
      for (const [k] of toRemove) {
        this.cache.delete(k);
      }
    }
  }

  /**
   * Check if data for a key is stale
   */
  isStale(key: string, thresholdMs: number = STALE_THRESHOLD_MS): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true; // No data = stale
    return Date.now() - entry.timestamp > thresholdMs;
  }

  /**
   * Get data age in milliseconds
   */
  getAge(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return Date.now() - entry.timestamp;
  }

  /**
   * Get cached value if not stale
   */
  getCached(key: string, thresholdMs: number = STALE_THRESHOLD_MS): string | null {
    const entry = this.cache.get(key);
    if (!entry || this.isStale(key, thresholdMs)) return null;
    return entry.value;
  }

  /**
   * Compare new value with cached value to detect changes
   */
  hasChanged(key: string, newValue: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return entry.value !== newValue;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get stats about cached data
   */
  getStats(): { total: number; stale: number; fresh: number } {
    let stale = 0;
    let fresh = 0;
    for (const [, entry] of this.cache.entries()) {
      if (Date.now() - entry.timestamp > STALE_THRESHOLD_MS) {
        stale++;
      } else {
        fresh++;
      }
    }
    return { total: this.cache.size, stale, fresh };
  }
}

// Singleton instance
export const staleDataDetector = new StaleDataDetector();

/**
 * Create a balance cache key
 */
export function balanceKey(address: string, token: string): string {
  return `balance:${address.toLowerCase()}:${token}`;
}

/**
 * Create a contract read cache key
 */
export function contractReadKey(contract: string, method: string, args: string): string {
  return `read:${contract}:${method}:${args}`;
}
