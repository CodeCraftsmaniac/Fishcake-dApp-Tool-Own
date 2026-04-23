/**
 * Provider Setup and Management
 * Uses Multi-RPC Manager for smart switching and failover
 */

import { JsonRpcProvider, FeeData } from "ethers";
import dotenv from "dotenv";
import logger from '../utils/logger.js';
import {
  getSmartProvider,
  executeWithFailover,
  startHealthMonitoring,
  stopHealthMonitoring,
  getCurrentRpc,
  getAllRpcStatus,
  initializeRpcHealth,
  RPC_ENDPOINTS,
} from "./rpcManager.js";

dotenv.config();

const POLYGON_CHAIN_ID = 137n;

// Cached sync provider for contract creation
let _syncProvider: JsonRpcProvider | null = null;

// Gas tracking cache
let _lastGasData: {
    standard: bigint;
    fast: bigint;
    rapid: bigint;
    timestamp: number;
} | null = null;
const GAS_CACHE_TTL = 15000; // 15 seconds

// Initialize on module load
let _initialized = false;

export function initializeProvider(): void {
  if (_initialized) return;
  _initialized = true;
  initializeRpcHealth();
  startHealthMonitoring();
  logger.info("[Provider] Initialized with Multi-RPC Manager");
}

export function getRpcUrl(): string {
  return getCurrentRpc().url;
}

export function getExpectedChainId(): bigint {
  return BigInt(process.env.CHAIN_ID || POLYGON_CHAIN_ID);
}

/**
 * Synchronous provider getter for contract creation
 * Uses the best known RPC or falls back to publicnode
 */
export function getProvider(): JsonRpcProvider {
  if (!_initialized) initializeProvider();
  
  if (!_syncProvider) {
    // Use the current best RPC or fall back to a reliable one
    const current = getCurrentRpc();
    const url = current.url || 'https://polygon-bor-rpc.publicnode.com';
    
    _syncProvider = new JsonRpcProvider(url, {
      name: 'polygon',
      chainId: 137,
    }, {
      staticNetwork: true,
      batchMaxCount: 1,
    });
  }
  
  return _syncProvider;
}

/**
 * Async provider getter with smart selection
 */
export async function getSmartProviderAsync(): Promise<JsonRpcProvider> {
  if (!_initialized) initializeProvider();
  return getSmartProvider();
}

/**
 * Switch to next RPC (triggered by health monitor automatically)
 */
export function switchToNextRpc(): string {
  // Reset sync provider to pick up new RPC
  if (_syncProvider) {
    _syncProvider.destroy();
    _syncProvider = null;
  }
  const current = getCurrentRpc();
  logger.info(`[Provider] Switched RPC: ${current.name} (${current.latency}ms)`);
  return current.url;
}

export async function verifyChainId(): Promise<boolean> {
  return executeWithFailover(async (provider) => {
    const network = await provider.getNetwork();
    return network.chainId === getExpectedChainId();
  });
}

export async function getBlockNumber(): Promise<number> {
  return executeWithFailover(async (provider) => {
    return provider.getBlockNumber();
  });
}

/**
 * Get gas price (standard)
 */
export async function getGasPrice(): Promise<bigint> {
    const gasData = await getGasTracker();
    return gasData.fast;
}

/**
 * Get detailed gas tracker data
 */
export async function getGasTracker(): Promise<{
    standard: bigint;
    fast: bigint;
    rapid: bigint;
    baseFee: bigint;
    timestamp: number;
}> {
    // Return cached if fresh
    if (_lastGasData && Date.now() - _lastGasData.timestamp < GAS_CACHE_TTL) {
        return { ..._lastGasData, baseFee: 0n };
    }

    return executeWithFailover(async (provider) => {
        const feeData = await provider.getFeeData();
        const baseFee = feeData.gasPrice || 0n;
        
        const priorityStandard = baseFee / 10n;
        const priorityFast = baseFee * 30n / 100n;
        const priorityRapid = baseFee / 2n;
        
        _lastGasData = {
            standard: baseFee + priorityStandard,
            fast: baseFee + priorityFast,
            rapid: baseFee + priorityRapid,
            timestamp: Date.now(),
        };
        
        return { ..._lastGasData, baseFee };
    }).catch(() => {
        const gwei = 1_000_000_000n;
        return {
            standard: 100n * gwei,
            fast: 130n * gwei,
            rapid: 150n * gwei,
            baseFee: 80n * gwei,
            timestamp: Date.now(),
        };
    });
}

/**
 * Get fee data with boosted gas
 */
export async function getFastFeeData(): Promise<FeeData> {
    return executeWithFailover(async (provider) => {
        const feeData = await provider.getFeeData();
        const gasTracker = await getGasTracker();
        
        return new FeeData(
            gasTracker.fast,
            feeData.maxFeePerGas ? (feeData.maxFeePerGas * 130n / 100n) : null,
            feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * 150n / 100n) : null
        );
    });
}

/**
 * Format gas price to Gwei
 */
export function formatGasToGwei(gasWei: bigint): string {
    const gwei = Number(gasWei) / 1_000_000_000;
    return gwei.toFixed(2);
}

export async function waitForTransaction(txHash: string, confirmations: number = 1): Promise<boolean> {
    return executeWithFailover(async (provider) => {
        const receipt = await provider.waitForTransaction(txHash, confirmations);
        return receipt?.status === 1;
    });
}

export function isConnected(): boolean {
    return _initialized;
}

export function disconnect(): void {
    stopHealthMonitoring();
    if (_syncProvider) {
        _syncProvider.destroy();
        _syncProvider = null;
    }
    _initialized = false;
}

/**
 * Get current RPC info
 */
export function getCurrentRpcInfo(): { url: string; name: string; latency: number; isPrivate: boolean } {
    const current = getCurrentRpc();
    const endpoint = RPC_ENDPOINTS.find(r => r.url === current.url);
    return {
        url: current.url,
        name: current.name,
        latency: current.latency,
        isPrivate: endpoint?.isPrivate || false,
    };
}

/**
 * Get all RPC status for monitoring
 */
export function getRpcStatus() {
    return getAllRpcStatus();
}

// Re-export executeWithFailover for use by other modules
export { executeWithFailover };

