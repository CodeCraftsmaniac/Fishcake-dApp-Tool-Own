/**
 * Advanced Multi-RPC Manager
 * Features:
 * - Latency measurement and ranking
 * - Automatic failover
 * - Load balancing
 * - Health monitoring
 */

import { JsonRpcProvider } from "ethers";
import logger from '../utils/logger.js';

// RPC Configuration with all provided endpoints
export interface RpcEndpoint {
  url: string;
  name: string;
  priority: number; // 1 = highest priority
  isPrivate: boolean;
  apiKey?: string;
}

export interface RpcHealth {
  url: string;
  latency: number; // ms
  lastCheck: number;
  isHealthy: boolean;
  consecutiveFailures: number;
  successRate: number;
  totalRequests: number;
  totalSuccesses: number;
}

// Build RPC endpoints from environment variables
const buildRpcEndpoints = (): RpcEndpoint[] => {
  const endpoints: RpcEndpoint[] = [];
  
  // Add Alchemy if provided
  if (process.env.RPC_ALCHEMY) {
    endpoints.push({
      url: process.env.RPC_ALCHEMY,
      name: "Alchemy",
      priority: 1,
      isPrivate: true,
    });
  }
  
  // Add dRPC if provided
  if (process.env.RPC_DRPC) {
    endpoints.push({
      url: process.env.RPC_DRPC,
      name: "dRPC",
      priority: 2,
      isPrivate: true,
    });
  }
  
  // Add public RPCs
  if (process.env.RPC_PUBLICNODE) {
    endpoints.push({
      url: process.env.RPC_PUBLICNODE,
      name: "PublicNode",
      priority: 3,
      isPrivate: false,
    });
  }
  
  if (process.env.RPC_ANKR) {
    endpoints.push({
      url: process.env.RPC_ANKR,
      name: "Ankr",
      priority: 4,
      isPrivate: false,
    });
  }
  
  if (process.env.RPC_LLAMARPC) {
    endpoints.push({
      url: process.env.RPC_LLAMARPC,
      name: "LlamaRPC",
      priority: 5,
      isPrivate: false,
    });
  }
  
  if (process.env.RPC_BLOCKPI) {
    endpoints.push({
      url: process.env.RPC_BLOCKPI,
      name: "BlockPI",
      priority: 6,
      isPrivate: false,
    });
  }
  
  // Fallback public RPC if no endpoints configured
  if (endpoints.length === 0) {
    endpoints.push({
      url: "https://polygon-bor-rpc.publicnode.com",
      name: "PublicNode-Fallback",
      priority: 1,
      isPrivate: false,
    });
  }
  
  return endpoints;
};

// All RPC endpoints (built from environment)
const RPC_ENDPOINTS: RpcEndpoint[] = buildRpcEndpoints();

// Health tracking for each RPC
const rpcHealthMap = new Map<string, RpcHealth>();

// Provider cache
const providerCache = new Map<string, JsonRpcProvider>();

// Current active provider
let activeProvider: JsonRpcProvider | null = null;
let activeRpcUrl: string = "";

// Export for external use
export { RPC_ENDPOINTS };

// Configuration
const CONFIG = {
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  LATENCY_TIMEOUT: 5000, // 5 second timeout for health checks
  MAX_CONSECUTIVE_FAILURES: 3,
  MIN_SUCCESS_RATE: 0.7, // 70%
  LOAD_BALANCE_THRESHOLD: 100, // ms - if top RPCs within this, load balance
};

/**
 * Initialize RPC health tracking
 */
export function initializeRpcHealth(): void {
  for (const rpc of RPC_ENDPOINTS) {
    rpcHealthMap.set(rpc.url, {
      url: rpc.url,
      latency: Infinity,
      lastCheck: 0,
      isHealthy: true, // Assume healthy until proven otherwise
      consecutiveFailures: 0,
      successRate: 1,
      totalRequests: 0,
      totalSuccesses: 0,
    });
  }
}

/**
 * Measure latency to an RPC endpoint
 */
async function measureLatency(url: string): Promise<number> {
  const start = Date.now();
  
  try {
    const provider = getOrCreateProvider(url);
    
    // Use a simple call to measure latency
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.LATENCY_TIMEOUT);
    
    await Promise.race([
      provider.getBlockNumber(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), CONFIG.LATENCY_TIMEOUT)
      )
    ]);
    
    clearTimeout(timeout);
    return Date.now() - start;
  } catch {
    return Infinity;
  }
}

/**
 * Get or create a provider for an RPC URL
 */
function getOrCreateProvider(url: string): JsonRpcProvider {
  let provider = providerCache.get(url);
  
  if (!provider) {
    provider = new JsonRpcProvider(url, {
      name: "polygon",
      chainId: 137,
    }, {
      staticNetwork: true,
      batchMaxCount: 1,
    });
    providerCache.set(url, provider);
  }
  
  return provider;
}

/**
 * Check health of a single RPC
 */
async function checkRpcHealth(url: string): Promise<RpcHealth> {
  const health = rpcHealthMap.get(url) || {
    url,
    latency: Infinity,
    lastCheck: 0,
    isHealthy: false,
    consecutiveFailures: 0,
    successRate: 0,
    totalRequests: 0,
    totalSuccesses: 0,
  };
  
  health.totalRequests++;
  
  const latency = await measureLatency(url);
  health.lastCheck = Date.now();
  
  if (latency < Infinity) {
    health.latency = latency;
    health.consecutiveFailures = 0;
    health.totalSuccesses++;
    health.isHealthy = true;
  } else {
    health.consecutiveFailures++;
    health.isHealthy = health.consecutiveFailures < CONFIG.MAX_CONSECUTIVE_FAILURES;
  }
  
  health.successRate = health.totalRequests > 0 
    ? health.totalSuccesses / health.totalRequests 
    : 0;
  
  rpcHealthMap.set(url, health);
  return health;
}

/**
 * Check health of all RPCs and rank them
 */
export async function checkAllRpcsHealth(): Promise<RpcHealth[]> {
  const healthChecks = await Promise.all(
    RPC_ENDPOINTS.map(rpc => checkRpcHealth(rpc.url))
  );
  
  // Sort by latency (fastest first), filtering out unhealthy ones
  return healthChecks
    .filter(h => h.isHealthy && h.successRate >= CONFIG.MIN_SUCCESS_RATE)
    .sort((a, b) => a.latency - b.latency);
}

/**
 * Get the fastest healthy RPC
 */
export async function getFastestRpc(): Promise<{ url: string; latency: number; name: string }> {
  const healthyRpcs = await checkAllRpcsHealth();
  
  if (healthyRpcs.length === 0) {
    // Fallback to first RPC if all are unhealthy
    const fallback = RPC_ENDPOINTS[0];
    return { url: fallback.url, latency: -1, name: fallback.name };
  }
  
  const fastest = healthyRpcs[0];
  const endpoint = RPC_ENDPOINTS.find(r => r.url === fastest.url);
  
  return {
    url: fastest.url,
    latency: fastest.latency,
    name: endpoint?.name || "Unknown",
  };
}

/**
 * Get provider using smart selection
 */
export async function getSmartProvider(): Promise<JsonRpcProvider> {
  // If we have a healthy active provider, use it
  if (activeProvider && activeRpcUrl) {
    const health = rpcHealthMap.get(activeRpcUrl);
    if (health?.isHealthy) {
      return activeProvider;
    }
  }
  
  // Select best RPC
  const fastest = await getFastestRpc();
  activeRpcUrl = fastest.url;
  activeProvider = getOrCreateProvider(fastest.url);
  
  logger.info(`[RPC] Switched to ${fastest.name} (${fastest.latency}ms)`);
  
  return activeProvider;
}

/**
 * Execute with automatic failover
 */
export async function executeWithFailover<T>(
  operation: (provider: JsonRpcProvider) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  const triedUrls = new Set<string>();
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const provider = await getSmartProvider();
      triedUrls.add(activeRpcUrl);
      
      const result = await operation(provider);
      
      // Update success stats
      const health = rpcHealthMap.get(activeRpcUrl);
      if (health) {
        health.totalRequests++;
        health.totalSuccesses++;
        health.successRate = health.totalSuccesses / health.totalRequests;
        rpcHealthMap.set(activeRpcUrl, health);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      logger.error(`[RPC] Operation failed on ${activeRpcUrl}:`, { error: (error as Error).message });
      
      // Mark current RPC as failed
      const health = rpcHealthMap.get(activeRpcUrl);
      if (health) {
        health.consecutiveFailures++;
        health.totalRequests++;
        health.successRate = health.totalSuccesses / health.totalRequests;
        health.isHealthy = health.consecutiveFailures < CONFIG.MAX_CONSECUTIVE_FAILURES;
        rpcHealthMap.set(activeRpcUrl, health);
      }
      
      // Force switch to different RPC
      const healthyRpcs = Array.from(rpcHealthMap.values())
        .filter(h => h.isHealthy && !triedUrls.has(h.url))
        .sort((a, b) => a.latency - b.latency);
      
      if (healthyRpcs.length > 0) {
        activeRpcUrl = healthyRpcs[0].url;
        activeProvider = getOrCreateProvider(activeRpcUrl);
        logger.info(`[RPC] Failover to ${getRpcName(activeRpcUrl)}`);
      }
    }
  }
  
  throw lastError || new Error("All RPCs failed");
}

/**
 * Get RPC name from URL
 */
function getRpcName(url: string): string {
  const endpoint = RPC_ENDPOINTS.find(r => r.url === url);
  return endpoint?.name || "Unknown";
}

/**
 * Get load-balanced provider (distributes requests across top RPCs)
 */
export async function getLoadBalancedProvider(): Promise<JsonRpcProvider> {
  const healthyRpcs = await checkAllRpcsHealth();
  
  if (healthyRpcs.length === 0) {
    return getOrCreateProvider(RPC_ENDPOINTS[0].url);
  }
  
  // Get RPCs within threshold of fastest
  const fastest = healthyRpcs[0].latency;
  const eligibleRpcs = healthyRpcs.filter(
    h => h.latency <= fastest + CONFIG.LOAD_BALANCE_THRESHOLD
  );
  
  // Round-robin selection among eligible RPCs
  const selected = eligibleRpcs[Math.floor(Math.random() * eligibleRpcs.length)];
  return getOrCreateProvider(selected.url);
}

/**
 * Get all RPC health status
 */
export function getAllRpcStatus(): Array<RpcHealth & { name: string; priority: number }> {
  return RPC_ENDPOINTS.map(rpc => {
    const health = rpcHealthMap.get(rpc.url) || {
      url: rpc.url,
      latency: -1,
      lastCheck: 0,
      isHealthy: false,
      consecutiveFailures: 0,
      successRate: 0,
      totalRequests: 0,
      totalSuccesses: 0,
    };
    
    return {
      ...health,
      name: rpc.name,
      priority: rpc.priority,
    };
  }).sort((a, b) => a.latency - b.latency);
}

/**
 * Get current active RPC info
 */
export function getCurrentRpc(): { url: string; name: string; latency: number } {
  const endpoint = RPC_ENDPOINTS.find(r => r.url === activeRpcUrl);
  const health = rpcHealthMap.get(activeRpcUrl);
  
  return {
    url: activeRpcUrl || RPC_ENDPOINTS[0].url,
    name: endpoint?.name || "Unknown",
    latency: health?.latency || -1,
  };
}

/**
 * Start background health monitoring
 */
let healthCheckInterval: NodeJS.Timeout | null = null;

export function startHealthMonitoring(): void {
  if (healthCheckInterval) return;
  
  // Initialize health data
  initializeRpcHealth();
  
  // Initial check
  checkAllRpcsHealth().then(results => {
    logger.info(`[RPC] Initial health check complete. ${results.length}/${RPC_ENDPOINTS.length} healthy`);
    if (results.length > 0) {
      logger.info(`[RPC] Fastest: ${getRpcName(results[0].url)} (${results[0].latency}ms)`);
    }
  });
  
  // Periodic health checks
  healthCheckInterval = setInterval(async () => {
    try {
      const results = await checkAllRpcsHealth();
      
      // Auto-switch to faster RPC if current is significantly slower
      if (activeRpcUrl && results.length > 0) {
        const currentHealth = rpcHealthMap.get(activeRpcUrl);
        const fastest = results[0];
        
        if (currentHealth && fastest.url !== activeRpcUrl) {
          // Switch if fastest is >50% faster
          if (fastest.latency < currentHealth.latency * 0.5) {
            logger.info(`[RPC] Auto-switching from ${getRpcName(activeRpcUrl)} to ${getRpcName(fastest.url)} (${currentHealth.latency}ms -> ${fastest.latency}ms)`);
            activeRpcUrl = fastest.url;
            activeProvider = getOrCreateProvider(fastest.url);
          }
        }
      }
    } catch (error) {
      logger.error("[RPC] Health check error:", { error: (error as Error).message });
    }
  }, CONFIG.HEALTH_CHECK_INTERVAL);
}

export function stopHealthMonitoring(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}
