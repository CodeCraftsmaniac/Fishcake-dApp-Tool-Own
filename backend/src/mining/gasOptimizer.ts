// Gas Price Optimizer - Fetch current gas and apply multiplier
import { ethers } from 'ethers';

const MAX_GAS_PRICE_GWEI = 500;
const DEFAULT_MULTIPLIER = 1.1;

export interface GasEstimate {
  gasPrice: bigint;
  gasPriceGwei: string;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

/**
 * Get optimized gas price from the network
 */
export async function getOptimizedGasPrice(
  provider: ethers.JsonRpcProvider,
  multiplier: number = DEFAULT_MULTIPLIER
): Promise<GasEstimate> {
  const feeData = await provider.getFeeData();
  
  // Get base gas price
  let gasPrice = feeData.gasPrice || ethers.parseUnits('30', 'gwei');
  
  // Apply multiplier
  gasPrice = (gasPrice * BigInt(Math.floor(multiplier * 100))) / 100n;
  
  // Cap at max
  const maxGas = ethers.parseUnits(MAX_GAS_PRICE_GWEI.toString(), 'gwei');
  if (gasPrice > maxGas) {
    gasPrice = maxGas;
  }

  // Calculate EIP-1559 fees
  const maxFeePerGas = feeData.maxFeePerGas 
    ? (feeData.maxFeePerGas * BigInt(Math.floor(multiplier * 100))) / 100n
    : gasPrice * 2n;
  
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
    ? (feeData.maxPriorityFeePerGas * BigInt(Math.floor(multiplier * 100))) / 100n
    : ethers.parseUnits('30', 'gwei');

  return {
    gasPrice,
    gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei'),
    maxFeePerGas: maxFeePerGas > maxGas ? maxGas : maxFeePerGas,
    maxPriorityFeePerGas,
  };
}

/**
 * Estimate transaction cost in native token
 */
export async function estimateTransactionCost(
  provider: ethers.JsonRpcProvider,
  gasLimit: bigint,
  multiplier: number = DEFAULT_MULTIPLIER
): Promise<{ cost: bigint; costFormatted: string }> {
  const { gasPrice } = await getOptimizedGasPrice(provider, multiplier);
  const cost = gasPrice * gasLimit;
  
  return {
    cost,
    costFormatted: ethers.formatEther(cost),
  };
}

/**
 * Check if gas price is reasonable
 */
export async function isGasPriceReasonable(
  provider: ethers.JsonRpcProvider,
  maxAcceptableGwei: number = 100
): Promise<boolean> {
  const { gasPrice } = await getOptimizedGasPrice(provider, 1);
  const maxAcceptable = ethers.parseUnits(maxAcceptableGwei.toString(), 'gwei');
  return gasPrice <= maxAcceptable;
}

/**
 * Wait for gas price to drop below threshold
 */
export async function waitForLowGas(
  provider: ethers.JsonRpcProvider,
  maxGwei: number = 50,
  checkIntervalMs: number = 30000,
  maxWaitMs: number = 3600000 // 1 hour
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    if (await isGasPriceReasonable(provider, maxGwei)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }
  
  return false;
}
