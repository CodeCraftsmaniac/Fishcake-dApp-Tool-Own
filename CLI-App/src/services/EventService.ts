/**
 * Event Service - Business logic for event operations
 * NO UI CODE - Pure business logic, validation, and blockchain interaction
 */

import { ethers } from "ethers";
import { getEventManagerContract, getFastGasOverride } from "../blockchain/contracts.js";
import { approveEventManager } from "../blockchain/approval.js";
import { getWalletAddress, getFCCBalance, getUSDTBalance } from "../wallet/connection.js";
import { getAddress, isFCCToken, TOKEN_DECIMALS, getTokenSymbol } from "../config/addresses.js";
import { validateCreateEventParams } from "../utils/validate.js";
import { toWei, fromWei } from "../utils/format.js";
import { buildActivityContent, parseActivityContent, buildLatitudeLongitude } from "../utils/content.js";
import { dateToUnix, nowUnix, isExpired } from "../utils/time.js";
import { DEFAULT_LOCATION, generateRandomEventName, generateRandomEventDescription, generateRandomDeadline } from "../config/defaults.js";
import type { CreateEventParams, TransactionResult } from "../types/index.js";

// Event status enum
export const EventStatus = {
    ACTIVE: 0,
    EXPIRED: 1,
    FINISHED: 2,
} as const;

// Event info types
export interface EventBaseInfo {
    activityId: number;
    businessAccount: string;
    businessName: string;
    activityContent: string;
    latitudeLongitude: string;
    activityCreateTime: number;
    activityDeadLine: number;
    dropType: number;
    dropNumber: number;
    minDropAmt: bigint;
    maxDropAmt: bigint;
    tokenContractAddr: string;
}

export interface EventExtInfo {
    activityId: number;
    alreadyDropAmts: bigint;
    alreadyDropNumber: number;
    businessMinedAmt: bigint;
    businessMinedWithdrawedAmt: bigint;
    activityStatus: number;
}

export interface EventFullInfo {
    base: EventBaseInfo;
    ext: EventExtInfo;
    tokenSymbol: string;
    parsedContent: {
        description: string;
        address: string;
        link: string;
    };
    status: "active" | "expired" | "finished";
    dropsRemaining: number;
    amountRemaining: bigint;
}

export interface CreateEventInput {
    businessName: string;
    description: string;
    latitude?: number;
    longitude?: number;
    tokenAddress: string;
    totalAmount: number;
    dropType: number; // 1 = EVEN, 2 = RANDOM
    dropNumber: number;
    minDropAmt: number;
    maxDropAmt: number;
    deadline: Date;
}

export interface CreateEventResult {
    success: boolean;
    eventId?: number;
    txHash?: string;
    error?: string;
}

/**
 * Get event info by ID
 */
export async function getEventInfo(eventId: number): Promise<EventFullInfo | null> {
    try {
        const eventManager = getEventManagerContract();
        const arrayIndex = eventId - 1; // 1-indexed to 0-indexed

        const [baseInfo, extInfo] = await Promise.all([
            eventManager.activityInfoArrs(arrayIndex),
            eventManager.activityInfoExtArrs(arrayIndex),
        ]);

        // Check if event exists
        if (Number(baseInfo.activityId) === 0) {
            return null;
        }

        const tokenSymbol = getTokenSymbol(baseInfo.tokenContractAddr);
        const rawParsedContent = parseActivityContent(baseInfo.activityContent);
        const now = nowUnix();

        // Determine status
        let status: "active" | "expired" | "finished";
        if (Number(extInfo.activityStatus) === EventStatus.FINISHED) {
            status = "finished";
        } else if (Number(baseInfo.activityDeadLine) < now) {
            status = "expired";
        } else {
            status = "active";
        }

        return {
            base: {
                activityId: Number(baseInfo.activityId),
                businessAccount: baseInfo.businessAccount,
                businessName: baseInfo.businessName,
                activityContent: baseInfo.activityContent,
                latitudeLongitude: baseInfo.latitudeLongitude,
                activityCreateTime: Number(baseInfo.activityCreateTime),
                activityDeadLine: Number(baseInfo.activityDeadLine),
                dropType: Number(baseInfo.dropType),
                dropNumber: Number(baseInfo.dropNumber),
                minDropAmt: baseInfo.minDropAmt,
                maxDropAmt: baseInfo.maxDropAmt,
                tokenContractAddr: baseInfo.tokenContractAddr,
            },
            ext: {
                activityId: Number(extInfo.activityId),
                alreadyDropAmts: extInfo.alreadyDropAmts,
                alreadyDropNumber: Number(extInfo.alreadyDropNumber),
                businessMinedAmt: extInfo.businessMinedAmt,
                businessMinedWithdrawedAmt: extInfo.businessMinedWithdrawedAmt,
                activityStatus: Number(extInfo.activityStatus),
            },
            tokenSymbol,
            parsedContent: {
                description: rawParsedContent.activityContentDescription || "",
                address: rawParsedContent.activityContentAddress || "",
                link: rawParsedContent.activityContentLink || "",
            },
            status,
            dropsRemaining: Number(baseInfo.dropNumber) - Number(extInfo.alreadyDropNumber),
            // Calculate total amount: for EVEN type it's dropNumber * maxDropAmt
            // amountRemaining = totalAmount - alreadyDropped
            amountRemaining: (BigInt(baseInfo.dropNumber) * BigInt(baseInfo.maxDropAmt)) - BigInt(extInfo.alreadyDropAmts),
        };
    } catch {
        return null;
    }
}

/**
 * Check if user owns the event
 */
export async function isEventOwner(eventId: number, address?: string): Promise<boolean> {
    const walletAddress = address || getWalletAddress();
    const eventInfo = await getEventInfo(eventId);
    if (!eventInfo) return false;
    return eventInfo.base.businessAccount.toLowerCase() === walletAddress.toLowerCase();
}

/**
 * Get all events owned by user
 */
export async function getUserEvents(
    address?: string,
    onProgress?: (current: number, total: number) => void
): Promise<EventFullInfo[]> {
    const walletAddress = address || getWalletAddress();
    const eventManager = getEventManagerContract();
    
    // Get total event count (approximate by trying to read events)
    let totalEvents = 0;
    try {
        // Binary search for the highest event ID
        let low = 1;
        let high = 10000;
        while (low < high) {
            const mid = Math.floor((low + high + 1) / 2);
            try {
                const info = await eventManager.activityInfoArrs(mid - 1);
                if (Number(info.activityId) > 0) {
                    low = mid;
                } else {
                    high = mid - 1;
                }
            } catch {
                high = mid - 1;
            }
        }
        totalEvents = low;
    } catch {
        totalEvents = 3500; // Fallback estimate
    }

    const userEvents: EventFullInfo[] = [];
    const batchSize = 50;
    
    // Scan in reverse (newest first)
    for (let i = totalEvents; i > 0; i -= batchSize) {
        const start = Math.max(1, i - batchSize + 1);
        const promises: Promise<EventFullInfo | null>[] = [];
        
        for (let j = i; j >= start; j--) {
            promises.push(getEventInfo(j));
        }
        
        const results = await Promise.all(promises);
        
        for (const event of results) {
            if (event && event.base.businessAccount.toLowerCase() === walletAddress.toLowerCase()) {
                userEvents.push(event);
            }
        }
        
        if (onProgress) {
            onProgress(totalEvents - start + 1, totalEvents);
        }
        
        // Stop early if we have enough events
        if (userEvents.length >= 50) break;
    }

    return userEvents;
}

/**
 * Validate event creation parameters
 */
export function validateEventCreation(params: CreateEventInput): { valid: boolean; error?: string } {
    // Basic validation
    if (!params.businessName || params.businessName.length < 2) {
        return { valid: false, error: "Event name must be at least 2 characters" };
    }
    if (!params.description || params.description.length < 5) {
        return { valid: false, error: "Description must be at least 5 characters" };
    }
    if (params.totalAmount <= 0) {
        return { valid: false, error: "Total amount must be greater than 0" };
    }
    if (params.dropNumber < 1) {
        return { valid: false, error: "Drop number must be at least 1" };
    }
    if (params.deadline.getTime() <= Date.now()) {
        return { valid: false, error: "Deadline must be in the future" };
    }
    
    // Drop type validation
    if (params.dropType === 1) { // EVEN
        if (params.minDropAmt !== params.maxDropAmt) {
            return { valid: false, error: "For EVEN drop type, min and max must be equal" };
        }
        const expectedTotal = params.minDropAmt * params.dropNumber;
        if (Math.abs(expectedTotal - params.totalAmount) > 0.000001) {
            return { valid: false, error: "Total amount must equal minDropAmt × dropNumber for EVEN type" };
        }
    }
    
    return { valid: true };
}

/**
 * Check if user has sufficient balance for event creation
 */
export async function checkEventCreationBalance(
    tokenAddress: string,
    amount: number
): Promise<{ sufficient: boolean; balance: string; required: string }> {
    const decimals = isFCCToken(tokenAddress) ? TOKEN_DECIMALS.FCC : TOKEN_DECIMALS.USDT;
    const requiredWei = toWei(amount.toString(), decimals);
    
    let balanceWei: bigint;
    if (isFCCToken(tokenAddress)) {
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
 * Create a new event
 * Returns event ID on success
 */
export async function createEvent(
    input: CreateEventInput,
    onApprovalStart?: () => void,
    onApprovalComplete?: (txHash: string) => void,
    onCreationStart?: () => void,
    onCreationComplete?: (eventId: number, txHash: string) => void
): Promise<CreateEventResult> {
    try {
        // Validate
        const validation = validateEventCreation(input);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const decimals = isFCCToken(input.tokenAddress) ? TOKEN_DECIMALS.FCC : TOKEN_DECIMALS.USDT;
        const totalDropAmts = toWei(input.totalAmount.toString(), decimals);
        const minDropAmt = toWei(input.minDropAmt.toString(), decimals);
        const maxDropAmt = toWei(input.maxDropAmt.toString(), decimals);
        const deadlineUnix = dateToUnix(input.deadline);

        // Build activity content
        const activityContent = buildActivityContent({
            description: input.description,
            address: DEFAULT_LOCATION.name,
            link: "",
            startTime: new Date(),
            endTime: input.deadline,
        });

        const latitudeLongitude = buildLatitudeLongitude(
            input.latitude || DEFAULT_LOCATION.latitude,
            input.longitude || DEFAULT_LOCATION.longitude
        );

        // Approve tokens
        if (onApprovalStart) onApprovalStart();
        const approvalResult = await approveEventManager(input.tokenAddress, totalDropAmts);
        if (approvalResult.needed && !approvalResult.result?.success) {
            return { success: false, error: approvalResult.result?.error || "Approval failed" };
        }
        if (approvalResult.needed && approvalResult.result?.hash && onApprovalComplete) {
            onApprovalComplete(approvalResult.result.hash);
        }

        // Create event
        if (onCreationStart) onCreationStart();
        
        const eventManager = getEventManagerContract(true);
        const gasOverride = await getFastGasOverride();

        const tx = await eventManager.activityAdd(
            input.businessName,
            activityContent,
            latitudeLongitude,
            deadlineUnix,
            totalDropAmts,
            input.dropType,
            input.dropNumber,
            minDropAmt,
            maxDropAmt,
            input.tokenAddress,
            gasOverride
        );

        const receipt = await tx.wait();

        if (receipt.status !== 1) {
            return { success: false, error: "Transaction reverted" };
        }

        // Extract event ID from ActivityAdd event
        let eventId = 0;
        const activityAddSig = eventManager.interface.getEvent("ActivityAdd")?.topicHash;
        
        for (const log of receipt.logs) {
            try {
                if (log.topics[0] === activityAddSig && log.topics.length >= 3) {
                    eventId = Number(BigInt(log.topics[2]));
                    break;
                }
                
                const parsed = eventManager.interface.parseLog({
                    topics: log.topics as string[],
                    data: log.data,
                });
                if (parsed && parsed.name === "ActivityAdd") {
                    eventId = Number(parsed.args._activityId || parsed.args[1]);
                    break;
                }
            } catch {
                continue;
            }
        }

        if (eventId === 0) {
            return { success: false, error: "Could not extract event ID from transaction" };
        }

        if (onCreationComplete) onCreationComplete(eventId, receipt.hash);

        return {
            success: true,
            eventId,
            txHash: receipt.hash,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Create a quick event with random name/description
 */
export async function createQuickEvent(
    amountPerDrop: number,
    dropNumber: number,
    tokenAddress: string,
    onApprovalStart?: () => void,
    onApprovalComplete?: (txHash: string) => void,
    onCreationStart?: () => void,
    onCreationComplete?: (eventId: number, txHash: string) => void
): Promise<CreateEventResult> {
    const eventName = generateRandomEventName();
    const description = generateRandomEventDescription();
    const deadline = generateRandomDeadline();
    const totalAmount = amountPerDrop * dropNumber;

    return createEvent(
        {
            businessName: eventName,
            description,
            tokenAddress,
            totalAmount,
            dropType: 1, // EVEN
            dropNumber,
            minDropAmt: amountPerDrop,
            maxDropAmt: amountPerDrop,
            deadline,
        },
        onApprovalStart,
        onApprovalComplete,
        onCreationStart,
        onCreationComplete
    );
}

/**
 * Finish an event
 */
export async function finishEvent(
    eventId: number,
    onStart?: () => void,
    onComplete?: (returnAmount: bigint, minedAmount: bigint, txHash: string) => void
): Promise<TransactionResult> {
    try {
        // Verify ownership
        const isOwner = await isEventOwner(eventId);
        if (!isOwner) {
            return { success: false, error: "You are not the owner of this event" };
        }

        // Get event info
        const eventInfo = await getEventInfo(eventId);
        if (!eventInfo) {
            return { success: false, error: "Event not found" };
        }

        if (eventInfo.status === "finished") {
            return { success: false, error: "Event is already finished" };
        }

        if (onStart) onStart();

        const eventManager = getEventManagerContract(true);
        const gasOverride = await getFastGasOverride();
        
        const tx = await eventManager.activityFinish(eventId, gasOverride);
        const receipt = await tx.wait();

        if (receipt.status !== 1) {
            return { success: false, error: "Transaction reverted" };
        }

        // Extract return/mined amounts from ActivityFinish event
        let returnAmount = 0n;
        let minedAmount = 0n;

        const activityFinishSig = eventManager.interface.getEvent("ActivityFinish")?.topicHash;
        
        for (const log of receipt.logs) {
            try {
                if (log.topics[0] === activityFinishSig) {
                    const parsed = eventManager.interface.parseLog({
                        topics: log.topics as string[],
                        data: log.data,
                    });
                    if (parsed) {
                        returnAmount = parsed.args._returnAmount || 0n;
                        minedAmount = parsed.args._minedAmount || 0n;
                        break;
                    }
                }
            } catch {
                continue;
            }
        }

        if (onComplete) onComplete(returnAmount, minedAmount, receipt.hash);

        return {
            success: true,
            hash: receipt.hash,
            gasUsed: receipt.gasUsed,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Calculate estimated refund for finishing an event
 */
export async function calculateEventRefund(eventId: number): Promise<{
    remainingAmount: bigint;
    remainingDrops: number;
    tokenSymbol: string;
}> {
    const eventInfo = await getEventInfo(eventId);
    if (!eventInfo) {
        return { remainingAmount: 0n, remainingDrops: 0, tokenSymbol: "FCC" };
    }

    return {
        remainingAmount: eventInfo.amountRemaining,
        remainingDrops: eventInfo.dropsRemaining,
        tokenSymbol: eventInfo.tokenSymbol,
    };
}
