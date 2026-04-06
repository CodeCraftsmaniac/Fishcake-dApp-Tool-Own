/**
 * Swap Service - Business logic for FCC buy/sell operations
 * NO UI CODE - Pure business logic for token swaps
 */

import { ethers } from "ethers";
import { 
    getDirectSalePoolContract, 
    getInvestorSalePoolContract, 
    getRedemptionPoolContract,
    getFastGasOverride 
} from "../blockchain/contracts.js";
import { approveDirectSalePool, approveInvestorSalePool, approveRedemptionPool } from "../blockchain/approval.js";
import { getFCCBalance, getUSDTBalance } from "../wallet/connection.js";
import { getAddress, TOKEN_DECIMALS } from "../config/addresses.js";
import { toWei, fromWei } from "../utils/format.js";
import type { TransactionResult } from "../types/index.js";

// Swap routing thresholds
export const SWAP_THRESHOLDS = {
    USDT_INVESTOR_MIN: 1000,    // USDT >= 1000 → InvestorSalePool
    FCC_INVESTOR_MIN: 16666,    // FCC >= 16666 → InvestorSalePool
} as const;

// Current FCC price
export const FCC_PRICE_USDT = 0.06; // $0.06 per FCC

export type SwapPool = "direct" | "investor" | "redemption";

export interface SwapQuote {
    inputAmount: number;
    outputAmount: number;
    inputToken: "FCC" | "USDT";
    outputToken: "FCC" | "USDT";
    pool: SwapPool;
    pricePerFCC: number;
    fee: number;
}

export interface SwapResult extends TransactionResult {
    inputAmount?: number;
    outputAmount?: number;
    pool?: SwapPool;
}

/**
 * Determine which pool to use for buying FCC
 */
export function getBuyPool(usdtAmount: number): SwapPool {
    return usdtAmount >= SWAP_THRESHOLDS.USDT_INVESTOR_MIN ? "investor" : "direct";
}

/**
 * Determine which pool to use for selling FCC
 */
export function getSellPool(fccAmount: number): SwapPool {
    return fccAmount >= SWAP_THRESHOLDS.FCC_INVESTOR_MIN ? "investor" : "redemption";
}

/**
 * Get a quote for buying FCC with USDT
 */
export function getBuyQuote(usdtAmount: number): SwapQuote {
    const pool = getBuyPool(usdtAmount);
    const fccAmount = usdtAmount / FCC_PRICE_USDT;
    
    return {
        inputAmount: usdtAmount,
        outputAmount: fccAmount,
        inputToken: "USDT",
        outputToken: "FCC",
        pool,
        pricePerFCC: FCC_PRICE_USDT,
        fee: 0, // Direct sale has no fee
    };
}

/**
 * Get a quote for selling FCC for USDT
 */
export function getSellQuote(fccAmount: number): SwapQuote {
    const pool = getSellPool(fccAmount);
    const usdtAmount = fccAmount * FCC_PRICE_USDT;
    
    return {
        inputAmount: fccAmount,
        outputAmount: usdtAmount,
        inputToken: "FCC",
        outputToken: "USDT",
        pool,
        pricePerFCC: FCC_PRICE_USDT,
        fee: 0,
    };
}

/**
 * Check if user has sufficient balance for a swap
 */
export async function checkSwapBalance(
    inputToken: "FCC" | "USDT",
    amount: number
): Promise<{ sufficient: boolean; balance: string; required: string }> {
    const decimals = inputToken === "FCC" ? TOKEN_DECIMALS.FCC : TOKEN_DECIMALS.USDT;
    const requiredWei = toWei(amount.toString(), decimals);
    
    let balanceWei: bigint;
    if (inputToken === "FCC") {
        balanceWei = await getFCCBalance();
    } else {
        balanceWei = await getUSDTBalance();
    }
    
    return {
        sufficient: balanceWei >= requiredWei,
        balance: fromWei(balanceWei, decimals),
        required: amount.toString(),
    };
}

/**
 * Buy FCC with USDT
 */
export async function buyFCC(
    usdtAmount: number,
    onApprovalStart?: () => void,
    onApprovalComplete?: (txHash: string) => void,
    onSwapStart?: () => void,
    onSwapComplete?: (txHash: string) => void
): Promise<SwapResult> {
    try {
        // Check balance
        const balanceCheck = await checkSwapBalance("USDT", usdtAmount);
        if (!balanceCheck.sufficient) {
            return { 
                success: false, 
                error: `Insufficient USDT balance. Have: ${balanceCheck.balance}, Need: ${balanceCheck.required}` 
            };
        }

        const pool = getBuyPool(usdtAmount);
        const usdtWei = toWei(usdtAmount.toString(), TOKEN_DECIMALS.USDT);

        // Approve USDT
        if (onApprovalStart) onApprovalStart();
        
        let approvalResult;
        if (pool === "investor") {
            approvalResult = await approveInvestorSalePool(getAddress("USDT_TOKEN"), usdtWei);
        } else {
            approvalResult = await approveDirectSalePool(getAddress("USDT_TOKEN"), usdtWei);
        }
        
        if (approvalResult.needed && !approvalResult.result?.success) {
            return { success: false, error: approvalResult.result?.error || "Approval failed" };
        }
        
        if (approvalResult.needed && approvalResult.result?.hash && onApprovalComplete) {
            onApprovalComplete(approvalResult.result.hash);
        }

        // Execute swap
        if (onSwapStart) onSwapStart();
        
        const gasOverride = await getFastGasOverride();
        let tx;
        
        if (pool === "investor") {
            const contract = getInvestorSalePoolContract(true);
            tx = await contract.buyFCC(usdtWei, gasOverride);
        } else {
            const contract = getDirectSalePoolContract(true);
            tx = await contract.buyFCC(usdtWei, gasOverride);
        }

        const receipt = await tx.wait();

        if (receipt.status !== 1) {
            return { success: false, error: "Transaction reverted" };
        }

        if (onSwapComplete) onSwapComplete(receipt.hash);

        const fccAmount = usdtAmount / FCC_PRICE_USDT;
        
        return {
            success: true,
            hash: receipt.hash,
            gasUsed: receipt.gasUsed,
            inputAmount: usdtAmount,
            outputAmount: fccAmount,
            pool,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Sell FCC for USDT
 */
export async function sellFCC(
    fccAmount: number,
    onApprovalStart?: () => void,
    onApprovalComplete?: (txHash: string) => void,
    onSwapStart?: () => void,
    onSwapComplete?: (txHash: string) => void
): Promise<SwapResult> {
    try {
        // Check balance
        const balanceCheck = await checkSwapBalance("FCC", fccAmount);
        if (!balanceCheck.sufficient) {
            return { 
                success: false, 
                error: `Insufficient FCC balance. Have: ${balanceCheck.balance}, Need: ${balanceCheck.required}` 
            };
        }

        const pool = getSellPool(fccAmount);
        const fccWei = toWei(fccAmount.toString(), TOKEN_DECIMALS.FCC);

        // Approve FCC
        if (onApprovalStart) onApprovalStart();
        
        let approvalResult;
        if (pool === "investor") {
            approvalResult = await approveInvestorSalePool(getAddress("FCC_TOKEN"), fccWei);
        } else {
            approvalResult = await approveRedemptionPool(getAddress("FCC_TOKEN"), fccWei);
        }
        
        if (approvalResult.needed && !approvalResult.result?.success) {
            return { success: false, error: approvalResult.result?.error || "Approval failed" };
        }
        
        if (approvalResult.needed && approvalResult.result?.hash && onApprovalComplete) {
            onApprovalComplete(approvalResult.result.hash);
        }

        // Execute swap
        if (onSwapStart) onSwapStart();
        
        const gasOverride = await getFastGasOverride();
        let tx;
        
        if (pool === "investor") {
            const contract = getInvestorSalePoolContract(true);
            tx = await contract.sellFCC(fccWei, gasOverride);
        } else {
            const contract = getRedemptionPoolContract(true);
            tx = await contract.sellFCC(fccWei, gasOverride);
        }

        const receipt = await tx.wait();

        if (receipt.status !== 1) {
            return { success: false, error: "Transaction reverted" };
        }

        if (onSwapComplete) onSwapComplete(receipt.hash);

        const usdtAmount = fccAmount * FCC_PRICE_USDT;
        
        return {
            success: true,
            hash: receipt.hash,
            gasUsed: receipt.gasUsed,
            inputAmount: fccAmount,
            outputAmount: usdtAmount,
            pool,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get pool information
 */
export async function getPoolInfo(pool: SwapPool): Promise<{
    address: string;
    fccReserve: bigint;
    usdtReserve: bigint;
}> {
    try {
        let contract;
        
        switch (pool) {
            case "direct":
                contract = getDirectSalePoolContract();
                break;
            case "investor":
                contract = getInvestorSalePoolContract();
                break;
            case "redemption":
                contract = getRedemptionPoolContract();
                break;
        }

        const address = await contract.getAddress();
        
        // These may not be the exact method names - depends on contract implementation
        // Returning placeholder values for now
        return {
            address,
            fccReserve: 0n,
            usdtReserve: 0n,
        };
    } catch {
        return {
            address: "",
            fccReserve: 0n,
            usdtReserve: 0n,
        };
    }
}
