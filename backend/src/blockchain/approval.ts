/**
 * ERC-20 Approval Flow
 * Handles allowance checks and approval transactions
 */

import { ethers, TransactionReceipt } from "ethers";
import { getTokenContract, getTokenAllowance, getFastGasOverride } from "./contracts.js";
import { getWalletAddress } from "../wallet/connection.js";
import { getAddress, isFCCToken } from "../config/addresses.js";
import type { TransactionResult } from "../types/index.js";

export async function checkAllowance(
    tokenAddress: string,
    spenderAddress: string
): Promise<bigint> {
    const walletAddress = getWalletAddress();
    return getTokenAllowance(tokenAddress, walletAddress, spenderAddress);
}

export async function needsApproval(
    tokenAddress: string,
    spenderAddress: string,
    requiredAmount: bigint
): Promise<boolean> {
    const currentAllowance = await checkAllowance(tokenAddress, spenderAddress);
    return currentAllowance < requiredAmount;
}

export async function approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint
): Promise<TransactionResult> {
    try {
        const tokenContract = getTokenContract(tokenAddress, true);
        const gasOverride = await getFastGasOverride();
        const tx = await tokenContract.approve(spenderAddress, amount, gasOverride);
        const receipt: TransactionReceipt = await tx.wait();
        
        return {
            success: receipt.status === 1,
            hash: receipt.hash,
            gasUsed: receipt.gasUsed,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Approval failed",
        };
    }
}

export async function approveIfNeeded(
    tokenAddress: string,
    spenderAddress: string,
    requiredAmount: bigint
): Promise<{ needed: boolean; result?: TransactionResult }> {
    const needs = await needsApproval(tokenAddress, spenderAddress, requiredAmount);
    
    if (!needs) {
        return { needed: false };
    }
    
    const result = await approveToken(tokenAddress, spenderAddress, requiredAmount);
    return { needed: true, result };
}

export async function approveEventManager(
    tokenAddress: string,
    amount: bigint
): Promise<{ needed: boolean; result?: TransactionResult }> {
    const eventManagerAddress = getAddress("EVENT_MANAGER");
    return approveIfNeeded(tokenAddress, eventManagerAddress, amount);
}

export async function approveNFTManager(tokenAddress: string, amount: bigint): Promise<{ needed: boolean; result?: TransactionResult }> {
    const nftManagerAddress = getAddress("NFT_MANAGER");
    return approveIfNeeded(tokenAddress, nftManagerAddress, amount);
}

export async function approveDirectSalePool(tokenAddress: string, amount: bigint): Promise<{ needed: boolean; result?: TransactionResult }> {
    const poolAddress = getAddress("DIRECT_SALE_POOL");
    return approveIfNeeded(tokenAddress, poolAddress, amount);
}

export async function approveInvestorSalePool(tokenAddress: string, amount: bigint): Promise<{ needed: boolean; result?: TransactionResult }> {
    const poolAddress = getAddress("INVESTOR_SALE_POOL");
    return approveIfNeeded(tokenAddress, poolAddress, amount);
}

export async function approveSalePool(
    tokenAddress: string,
    amount: bigint,
    useInvestorPool: boolean
): Promise<{ needed: boolean; result?: TransactionResult }> {
    if (useInvestorPool) {
        return approveInvestorSalePool(tokenAddress, amount);
    }
    return approveDirectSalePool(tokenAddress, amount);
}

export async function approveRedemptionPool(tokenAddress: string, amount: bigint): Promise<{ needed: boolean; result?: TransactionResult }> {
    const poolAddress = getAddress("REDEMPTION_POOL");
    return approveIfNeeded(tokenAddress, poolAddress, amount);
}

export async function revokeApproval(
    tokenAddress: string,
    spenderAddress: string
): Promise<TransactionResult> {
    return approveToken(tokenAddress, spenderAddress, 0n);
}

export function getTokenLabel(tokenAddress: string): string {
    return isFCCToken(tokenAddress) ? "FCC" : "USDT";
}
