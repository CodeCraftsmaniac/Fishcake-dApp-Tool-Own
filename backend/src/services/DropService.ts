/**
 * Drop Service - Business logic for drop operations
 * NO UI CODE - Pure business logic for executing drops
 */

import { ethers } from "ethers";
import { getEventManagerContract, getFastGasOverride } from "../blockchain/contracts.js";
import { getWalletAddress } from "../wallet/connection.js";
import { getTokenSymbol, TOKEN_DECIMALS, isFCCToken } from "../config/addresses.js";
import { fromWei } from "../utils/format.js";
import { getEventInfo, isEventOwner, EventFullInfo } from "./EventService.js";
import type { TransactionResult } from "../types/index.js";

/**
 * Drop validation result
 */
export interface DropValidation {
    valid: boolean;
    error?: string;
    eventInfo?: EventFullInfo;
}

/**
 * Single drop result
 */
export interface DropResult extends TransactionResult {
    eventId?: number;
    recipient?: string;
    amount?: bigint;
}

/**
 * Batch drop result
 */
export interface BatchDropResult {
    totalAttempted: number;
    successful: number;
    failed: number;
    results: DropResult[];
}

/**
 * Validate if a drop can be executed
 */
export async function validateDrop(
    eventId: number,
    recipientAddress: string,
    userAddress?: string
): Promise<DropValidation> {
    // Check event ownership
    const walletAddress = userAddress || getWalletAddress();
    
    // Get event info
    const eventInfo = await getEventInfo(eventId);
    if (!eventInfo) {
        return { valid: false, error: "Event not found" };
    }

    // Ownership check
    if (eventInfo.base.businessAccount.toLowerCase() !== walletAddress.toLowerCase()) {
        return { valid: false, error: "You are not the owner of this event" };
    }

    // Event status check
    if (eventInfo.status === "finished") {
        return { valid: false, error: "Event is already finished" };
    }

    if (eventInfo.status === "expired") {
        return { valid: false, error: "Event has expired" };
    }

    // Remaining drops check
    if (eventInfo.dropsRemaining <= 0) {
        return { valid: false, error: "No drops remaining" };
    }

    // Remaining amount check
    if (eventInfo.amountRemaining <= 0n) {
        return { valid: false, error: "No amount remaining" };
    }

    // Validate recipient address
    if (!ethers.isAddress(recipientAddress)) {
        return { valid: false, error: "Invalid recipient address" };
    }

    return { valid: true, eventInfo };
}

/**
 * Execute a single drop
 */
export async function executeDrop(
    eventId: number,
    recipientAddress: string,
    amount: bigint,
    onStart?: () => void,
    onComplete?: (txHash: string) => void
): Promise<DropResult> {
    try {
        // Validate first
        const validation = await validateDrop(eventId, recipientAddress);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        if (onStart) onStart();

        const eventManager = getEventManagerContract(true);
        const gasOverride = await getFastGasOverride();

        const tx = await eventManager.drop(eventId, recipientAddress, amount, gasOverride);
        const receipt = await tx.wait();

        if (receipt.status !== 1) {
            return { success: false, error: "Transaction reverted" };
        }

        if (onComplete) onComplete(receipt.hash);

        return {
            success: true,
            hash: receipt.hash,
            gasUsed: receipt.gasUsed,
            eventId,
            recipient: recipientAddress,
            amount,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Execute drops to multiple addresses
 */
export async function executeBatchDrop(
    eventId: number,
    addresses: string[],
    onProgress?: (current: number, total: number, address: string, success: boolean) => void
): Promise<BatchDropResult> {
    const results: DropResult[] = [];
    let successful = 0;
    let failed = 0;

    // Get event info once
    const eventInfo = await getEventInfo(eventId);
    if (!eventInfo) {
        return {
            totalAttempted: addresses.length,
            successful: 0,
            failed: addresses.length,
            results: addresses.map(addr => ({ success: false, error: "Event not found", recipient: addr })),
        };
    }

    // Verify ownership
    const walletAddress = getWalletAddress();
    if (eventInfo.base.businessAccount.toLowerCase() !== walletAddress.toLowerCase()) {
        return {
            totalAttempted: addresses.length,
            successful: 0,
            failed: addresses.length,
            results: addresses.map(addr => ({ success: false, error: "Not event owner", recipient: addr })),
        };
    }

    // Calculate amount per drop
    const dropAmount = eventInfo.base.minDropAmt;
    let remainingDrops = eventInfo.dropsRemaining;

    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        
        if (remainingDrops <= 0) {
            results.push({
                success: false,
                error: "No drops remaining",
                recipient: address,
            });
            failed++;
            if (onProgress) onProgress(i + 1, addresses.length, address, false);
            continue;
        }

        if (!ethers.isAddress(address)) {
            results.push({
                success: false,
                error: "Invalid address",
                recipient: address,
            });
            failed++;
            if (onProgress) onProgress(i + 1, addresses.length, address, false);
            continue;
        }

        const result = await executeDrop(eventId, address, dropAmount);
        results.push(result);

        if (result.success) {
            successful++;
            remainingDrops--;
        } else {
            failed++;
        }

        if (onProgress) onProgress(i + 1, addresses.length, address, result.success);

        // Small delay between drops to avoid nonce issues
        if (i < addresses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    return {
        totalAttempted: addresses.length,
        successful,
        failed,
        results,
    };
}

/**
 * Get drop history for an event
 */
export interface DropHistoryEntry {
    eventId: number;
    recipient: string;
    amount: bigint;
    amountFormatted: string;
    tokenSymbol: string;
    txHash: string;
    blockNumber: number;
    timestamp?: number;
}

export async function getDropHistory(
    eventId?: number,
    ownerAddress?: string,
    limit: number = 100
): Promise<DropHistoryEntry[]> {
    const eventManager = getEventManagerContract();
    const walletAddress = ownerAddress || getWalletAddress();
    
    // Get Drop events from logs
    const dropEventSig = eventManager.interface.getEvent("Drop")?.topicHash;
    if (!dropEventSig) {
        return [];
    }

    const filter = {
        address: await eventManager.getAddress(),
        topics: [dropEventSig],
    };

    try {
        const provider = eventManager.runner?.provider;
        if (!provider) return [];

        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - 50000); // Last ~50k blocks

        const logs = await provider.getLogs({
            ...filter,
            fromBlock,
            toBlock: latestBlock,
        });

        const history: DropHistoryEntry[] = [];

        for (const log of logs.slice(-limit)) {
            try {
                // Topics: [sig, who (indexed), _activityId (indexed)]
                const whoAddress = ethers.getAddress("0x" + log.topics[1].slice(26));
                const logEventId = Number(BigInt(log.topics[2]));

                // Filter by event ID if specified
                if (eventId !== undefined && logEventId !== eventId) {
                    continue;
                }

                // Filter by owner if not filtering by event
                if (eventId === undefined && whoAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                    continue;
                }

                // Decode the non-indexed data
                const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                    ["uint256"],
                    log.data
                );
                const dropAmt = decoded[0] as bigint;

                // Get token info from event
                const eventInfo = await getEventInfo(logEventId);
                const tokenSymbol = eventInfo?.tokenSymbol || "FCC";
                const decimals = tokenSymbol === "USDT" ? TOKEN_DECIMALS.USDT : TOKEN_DECIMALS.FCC;

                history.push({
                    eventId: logEventId,
                    recipient: whoAddress, // This is actually the "to" address in drop(), need to parse differently
                    amount: dropAmt,
                    amountFormatted: fromWei(dropAmt, decimals),
                    tokenSymbol,
                    txHash: log.transactionHash,
                    blockNumber: log.blockNumber,
                });
            } catch {
                continue;
            }
        }

        return history.reverse(); // Most recent first
    } catch {
        return [];
    }
}

/**
 * Calculate how many addresses can be dropped to with remaining event allocation
 */
export async function calculateRemainingCapacity(eventId: number): Promise<{
    remainingDrops: number;
    remainingAmount: bigint;
    amountPerDrop: bigint;
    tokenSymbol: string;
}> {
    const eventInfo = await getEventInfo(eventId);
    if (!eventInfo) {
        return {
            remainingDrops: 0,
            remainingAmount: 0n,
            amountPerDrop: 0n,
            tokenSymbol: "FCC",
        };
    }

    return {
        remainingDrops: eventInfo.dropsRemaining,
        remainingAmount: eventInfo.amountRemaining,
        amountPerDrop: eventInfo.base.minDropAmt,
        tokenSymbol: eventInfo.tokenSymbol,
    };
}
