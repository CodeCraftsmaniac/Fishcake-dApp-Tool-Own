/**
 * Provider Setup and Management
 * Uses private RPCs for better speed and reliability
 */

import { JsonRpcProvider, FeeData } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// Public RPCs (reliable, no API key needed)
const PUBLIC_RPCS = [
    "https://polygon-bor-rpc.publicnode.com",
    "https://polygon-rpc.com",
    "https://rpc.ankr.com/polygon",
];

// Private RPCs (faster & higher rate limits)
const PRIVATE_RPCS = [
    "https://lb.drpc.org/ogrpc?network=polygon&dkey=Ai-2uYNWu0OmkBvx0BdHgkDK29YkMEwR8aE0Grar0DFx",
];

const ALL_RPCS = [...PUBLIC_RPCS, ...PRIVATE_RPCS];
const POLYGON_CHAIN_ID = 137n;

let _provider: JsonRpcProvider | null = null;
let _currentRpcIndex = 0;

// Gas tracking cache
let _lastGasData: {
    standard: bigint;
    fast: bigint;
    rapid: bigint;
    timestamp: number;
} | null = null;
const GAS_CACHE_TTL = 15000; // 15 seconds

export function getRpcUrl(): string {
    // First try env var, then private RPCs
    if (process.env.RPC_URL) {
        return process.env.RPC_URL;
    }
    return ALL_RPCS[_currentRpcIndex];
}

export function getExpectedChainId(): bigint {
    return BigInt(process.env.CHAIN_ID || POLYGON_CHAIN_ID);
}

export function createProvider(rpcUrl?: string): JsonRpcProvider {
    const url = rpcUrl || getRpcUrl();
    _provider = new JsonRpcProvider(url, undefined, {
        staticNetwork: true,
        batchMaxCount: 1,
    });
    return _provider;
}

export function getProvider(): JsonRpcProvider {
    if (!_provider) {
        _provider = createProvider();
    }
    return _provider;
}

/**
 * Try next RPC if current one fails
 */
export function switchToNextRpc(): string {
    _currentRpcIndex = (_currentRpcIndex + 1) % ALL_RPCS.length;
    const newUrl = ALL_RPCS[_currentRpcIndex];
    if (_provider) {
        _provider.destroy();
    }
    _provider = new JsonRpcProvider(newUrl, undefined, {
        staticNetwork: true,
        batchMaxCount: 1,
    });
    return newUrl;
}

export async function verifyChainId(): Promise<boolean> {
    const provider = getProvider();
    const network = await provider.getNetwork();
    const expectedChainId = getExpectedChainId();
    return network.chainId === expectedChainId;
}

export async function getBlockNumber(): Promise<number> {
    const provider = getProvider();
    return provider.getBlockNumber();
}

/**
 * Get gas price (standard)
 */
export async function getGasPrice(): Promise<bigint> {
    const gasData = await getGasTracker();
    return gasData.fast; // Use fast by default for quicker confirmations
}

/**
 * Get detailed gas tracker data
 * Returns standard, fast, and rapid gas prices
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

    const provider = getProvider();
    
    try {
        const feeData = await provider.getFeeData();
        const baseFee = feeData.gasPrice || 0n;
        
        // Calculate gas tiers based on base fee
        // Standard: base + 10% priority
        // Fast: base + 30% priority
        // Rapid: base + 50% priority
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
    } catch {
        // Fallback values in gwei
        const gwei = 1_000_000_000n;
        return {
            standard: 100n * gwei,
            fast: 130n * gwei,
            rapid: 150n * gwei,
            baseFee: 80n * gwei,
            timestamp: Date.now(),
        };
    }
}

/**
 * Get fee data with boosted gas for faster confirmations
 * Uses "fast" tier by default
 */
export async function getFastFeeData(): Promise<FeeData> {
    const provider = getProvider();
    const feeData = await provider.getFeeData();
    const gasTracker = await getGasTracker();
    
    // Use fast gas price
    return new FeeData(
        gasTracker.fast,
        feeData.maxFeePerGas ? (feeData.maxFeePerGas * 130n / 100n) : null,
        feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * 150n / 100n) : null
    );
}

/**
 * Format gas price to Gwei for display
 */
export function formatGasToGwei(gasWei: bigint): string {
    const gwei = Number(gasWei) / 1_000_000_000;
    return gwei.toFixed(2);
}

export async function waitForTransaction(txHash: string, confirmations: number = 1): Promise<boolean> {
    const provider = getProvider();
    const receipt = await provider.waitForTransaction(txHash, confirmations);
    return receipt?.status === 1;
}

export function isConnected(): boolean {
    return _provider !== null;
}

export function disconnect(): void {
    if (_provider) {
        _provider.destroy();
        _provider = null;
    }
}

/**
 * Get current RPC info
 */
export function getCurrentRpcInfo(): { url: string; isPrivate: boolean } {
    const url = getRpcUrl();
    const isPrivate = PRIVATE_RPCS.some(rpc => url.includes("alchemy") || url.includes("drpc"));
    return { url, isPrivate };
}
