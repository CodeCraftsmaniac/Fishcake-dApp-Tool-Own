// RPC Connection Pool - Multiple RPC endpoints with failover
import { ethers } from 'ethers';

interface RpcEndpoint {
  url: string;
  priority: number;
  failures: number;
  lastFailure: number;
  responseTimeMs: number;
}

const DEFAULT_ENDPOINTS = [
  { url: 'https://polygon-rpc.com', priority: 1 },
  { url: 'https://rpc-mainnet.matic.network', priority: 2 },
  { url: 'https://polygon-mainnet.public.blastapi.io', priority: 3 },
  { url: 'https://polygon.llamarpc.com', priority: 4 },
  { url: 'https://polygon-bor-rpc.publicnode.com', priority: 5 },
];

const FAILURE_COOLDOWN_MS = 60000; // 1 minute
const MAX_FAILURES = 5;

class RpcPool {
  private endpoints: Map<string, RpcEndpoint> = new Map();
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private currentProvider: ethers.JsonRpcProvider | null = null;
  private currentUrl: string | null = null;

  constructor() {
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
        console.warn(`RPC failure (${endpoint.failures}/${MAX_FAILURES}): ${this.currentUrl}`, error?.message);
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
