// RPC Connection Pool - Multiple RPC endpoints with failover
import { ethers } from 'ethers';
import logger from '../utils/logger.js';

interface RpcEndpoint {
  url: string;
  priority: number;
  failures: number;
  lastFailure: number;
  responseTimeMs: number;
}

const DEFAULT_ENDPOINTS = [
  { url: 'https://polygon-rpc.com', priority: 2 },
  { url: 'https://rpc-mainnet.matic.network', priority: 3 },
  { url: 'https://polygon-mainnet.public.blastapi.io', priority: 4 },
  { url: 'https://polygon.llamarpc.com', priority: 5 },
  { url: 'https://polygon-bor-rpc.publicnode.com', priority: 6 },
];

const FAILURE_COOLDOWN_MS = 60000; // 1 minute
const MAX_FAILURES = 5;

class RpcPool {
  private endpoints: Map<string, RpcEndpoint> = new Map();
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private currentProvider: ethers.JsonRpcProvider | null = null;
  private currentUrl: string | null = null;
  private balanceCache: Map<string, { balance: string; timestamp: number }> = new Map();
  private readonly BALANCE_CACHE_TTL = 10000; // 10 seconds

  constructor() {
    // Primary RPC from env var (highest priority)
    const primaryRpc = process.env.RPC_ALCHEMY || process.env.RPC_PRIMARY;
    if (primaryRpc) {
      this.endpoints.set(primaryRpc, {
        url: primaryRpc,
        priority: 1,
        failures: 0,
        lastFailure: 0,
        responseTimeMs: 0,
      });
    }

    // Initialize with default endpoints
    for (const ep of DEFAULT_ENDPOINTS) {
      this.endpoints.set(ep.url, {
        url: ep.url,
        priority: ep.priority,
        failures: 0,
        lastFailure: 0,
        responseTimeMs: 0,
      });
    }
  }

  /**
   * Add a custom RPC endpoint
   */
  addEndpoint(url: string, priority: number = 10): void {
    this.endpoints.set(url, {
      url,
      priority,
      failures: 0,
      lastFailure: 0,
      responseTimeMs: 0,
    });
  }

  /**
   * Remove an RPC endpoint
   */
  removeEndpoint(url: string): void {
    this.endpoints.delete(url);
    this.providers.delete(url);
    
    if (this.currentUrl === url) {
      this.currentProvider = null;
      this.currentUrl = null;
    }
  }

  /**
   * Get the best available provider
   */
  getProvider(): ethers.JsonRpcProvider {
    // Return cached provider if healthy
    if (this.currentProvider && this.currentUrl) {
      const endpoint = this.endpoints.get(this.currentUrl);
      if (endpoint && this.isEndpointHealthy(endpoint)) {
        return this.currentProvider;
      }
    }

    // Find best endpoint
    const bestEndpoint = this.findBestEndpoint();
    if (!bestEndpoint) {
      throw new Error('No healthy RPC endpoints available');
    }

    // Get or create provider
    let provider = this.providers.get(bestEndpoint.url);
    if (!provider) {
      provider = new ethers.JsonRpcProvider(bestEndpoint.url);
      this.providers.set(bestEndpoint.url, provider);
    }

    this.currentProvider = provider;
    this.currentUrl = bestEndpoint.url;
    
    return provider;
  }

  /**
   * Report a failure for the current endpoint
   */
  reportFailure(error?: Error): void {
    if (this.currentUrl) {
      const endpoint = this.endpoints.get(this.currentUrl);
      if (endpoint) {
        endpoint.failures++;
        endpoint.lastFailure = Date.now();
        logger.warn(`RPC failure (${endpoint.failures}/${MAX_FAILURES}): ${this.currentUrl}`, { error: error?.message });
      }
    }
    
    // Force switch on next getProvider call
    this.currentProvider = null;
    this.currentUrl = null;
  }

  /**
   * Report success and update response time
   */
  reportSuccess(responseTimeMs: number): void {
    if (this.currentUrl) {
      const endpoint = this.endpoints.get(this.currentUrl);
      if (endpoint) {
        endpoint.failures = Math.max(0, endpoint.failures - 1);
        endpoint.responseTimeMs = responseTimeMs;
      }
    }
  }

  /**
   * Execute a function with automatic failover
   */
  async execute<T>(fn: (provider: ethers.JsonRpcProvider) => Promise<T>): Promise<T> {
    const maxRetries = Math.min(this.endpoints.size, 3);
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const provider = this.getProvider();
        const startTime = Date.now();
        const result = await fn(provider);
        this.reportSuccess(Date.now() - startTime);
        return result;
      } catch (error) {
        lastError = error as Error;
        // Don't retry on transaction reverts (permanent failure)
        const msg = lastError.message || '';
        if (msg.includes('revert') || msg.includes('REVERT') || msg.includes('execution reverted')) {
          throw lastError;
        }
        this.reportFailure(lastError);
      }
    }

    throw lastError || new Error('All RPC endpoints failed');
  }

  /**
   * Check if an endpoint is healthy
   */
  private isEndpointHealthy(endpoint: RpcEndpoint): boolean {
    if (endpoint.failures >= MAX_FAILURES) {
      // Check if cooldown has passed
      if (Date.now() - endpoint.lastFailure < FAILURE_COOLDOWN_MS) {
        return false;
      }
      // Reset failures after cooldown
      endpoint.failures = 0;
    }
    return true;
  }

  /**
   * Find the best available endpoint
   */
  private findBestEndpoint(): RpcEndpoint | null {
    const healthyEndpoints = Array.from(this.endpoints.values())
      .filter(ep => this.isEndpointHealthy(ep))
      .sort((a, b) => {
        // Sort by priority first, then by response time
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.responseTimeMs - b.responseTimeMs;
      });

    return healthyEndpoints[0] || null;
  }

  /**
   * Get status of all endpoints
   */
  getStatus(): Array<{
    url: string;
    healthy: boolean;
    failures: number;
    responseTimeMs: number;
  }> {
    return Array.from(this.endpoints.values()).map(ep => ({
      url: ep.url,
      healthy: this.isEndpointHealthy(ep),
      failures: ep.failures,
      responseTimeMs: ep.responseTimeMs,
    }));
  }

  /**
   * Reset all endpoint failure counts
   */
  reset(): void {
    for (const endpoint of this.endpoints.values()) {
      endpoint.failures = 0;
      endpoint.lastFailure = 0;
    }
    this.currentProvider = null;
    this.currentUrl = null;
  }

  /**
   * Get balance with 10-second cache to reduce RPC calls
   */
  async getBalance(address: string): Promise<string> {
    const cached = this.balanceCache.get(address);
    if (cached && Date.now() - cached.timestamp < this.BALANCE_CACHE_TTL) {
      return cached.balance;
    }

    const balance = await this.execute(async (provider) => {
      return (await provider.getBalance(address)).toString();
    });

    this.balanceCache.set(address, { balance, timestamp: Date.now() });
    return balance;
  }

  /**
   * Batch multiple calls into a single RPC request using Multicall3
   * Falls back to individual calls if Multicall3 is not available
   */
  async batchCalls<T>(calls: Array<{ target: string; callData: string; decode: (result: string) => T }>): Promise<T[]> {
    const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976EA11'; // Polygon Mainnet
    
    try {
      return await this.execute(async (provider) => {
        const multicall = new ethers.Contract(MULTICALL3_ADDRESS, [
          'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) returns (tuple(bool success, bytes returnData)[] results)'
        ], provider);

        const callTuples = calls.map(c => ({ target: c.target, allowFailure: true, callData: c.callData }));
        const results = await multicall.aggregate3.staticCall(callTuples);
        
        return results.map((r: { success: boolean; returnData: string }, i: number) => {
          if (!r.success) return null as T;
          return calls[i].decode(r.returnData);
        });
      });
    } catch {
      // Fallback: execute individually
      const results: T[] = [];
      for (const call of calls) {
        try {
          const result = await this.execute(async (provider) => {
            const response = await provider.call({ to: call.target, data: call.callData });
            return call.decode(response);
          });
          results.push(result);
        } catch {
          results.push(null as T);
        }
      }
      return results;
    }
  }
}

// Singleton instance
export const rpcPool = new RpcPool();

/**
 * Get a healthy provider from the pool
 */
export function getProvider(): ethers.JsonRpcProvider {
  return rpcPool.getProvider();
}

/**
 * Execute with automatic failover
 */
export async function withFailover<T>(
  fn: (provider: ethers.JsonRpcProvider) => Promise<T>
): Promise<T> {
  return rpcPool.execute(fn);
}
