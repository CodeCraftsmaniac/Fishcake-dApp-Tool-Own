/**
 * Quick Airdrop Service - Orchestrates quick event + drop workflow
 * NO UI CODE - Pure business logic composition
 */

import { 
    createQuickEvent, 
    createEvent, 
    getEventInfo,
    type CreateEventResult,
    type CreateEventInput,
} from "./EventService.js";
import { 
    executeBatchDrop, 
    validateDrop,
    type BatchDropResult,
} from "./DropService.js";
import { getEntries, type AddressEntry } from "../storage/addressBook.js";
import { getAddress, isFCCToken, TOKEN_DECIMALS } from "../config/addresses.js";
import { fromWei } from "../utils/format.js";

export interface QuickAirdropConfig {
    // Token selection
    tokenSymbol: "FCC" | "USDT";
    // Amount configuration
    amountPerDrop: number;
    dropNumber: number;
    // Target addresses
    addresses: string[];
}

export interface QuickAirdropResult {
    success: boolean;
    eventId?: number;
    eventTxHash?: string;
    dropResults?: BatchDropResult;
    error?: string;
}

export interface AirdropProgress {
    phase: "approval" | "creating" | "dropping" | "complete" | "error";
    eventId?: number;
    dropsCompleted?: number;
    dropsTotal?: number;
    currentAddress?: string;
    error?: string;
}

// Default template configuration
export const QUICK_AIRDROP_TEMPLATES = {
    standard: {
        name: "Standard Airdrop",
        amountPerDrop: 12,
        dropNumber: 2,
        totalFCC: 24,
    },
    small: {
        name: "Small Airdrop",
        amountPerDrop: 5,
        dropNumber: 1,
        totalFCC: 5,
    },
    medium: {
        name: "Medium Airdrop",
        amountPerDrop: 25,
        dropNumber: 2,
        totalFCC: 50,
    },
    large: {
        name: "Large Airdrop",
        amountPerDrop: 50,
        dropNumber: 5,
        totalFCC: 250,
    },
} as const;

/**
 * Get all saved addresses from address book
 */
export function getSavedAddresses(): AddressEntry[] {
    return getEntries();
}

/**
 * Calculate total cost for a quick airdrop
 */
export function calculateAirdropCost(config: QuickAirdropConfig): {
    totalAmount: number;
    amountPerDrop: number;
    dropNumber: number;
    addressCount: number;
    totalDrops: number;
} {
    const totalDrops = config.addresses.length;
    // Each address gets 1 drop
    const totalAmount = config.amountPerDrop * config.dropNumber;
    
    return {
        totalAmount,
        amountPerDrop: config.amountPerDrop,
        dropNumber: config.dropNumber,
        addressCount: config.addresses.length,
        totalDrops,
    };
}

/**
 * Validate quick airdrop configuration
 */
export function validateQuickAirdrop(config: QuickAirdropConfig): {
    valid: boolean;
    error?: string;
} {
    if (config.addresses.length === 0) {
        return { valid: false, error: "No addresses selected" };
    }
    
    if (config.addresses.length > config.dropNumber) {
        return { 
            valid: false, 
            error: `Too many addresses (${config.addresses.length}) for drop count (${config.dropNumber})` 
        };
    }
    
    if (config.amountPerDrop <= 0) {
        return { valid: false, error: "Amount per drop must be greater than 0" };
    }
    
    if (config.dropNumber < 1) {
        return { valid: false, error: "Drop number must be at least 1" };
    }
    
    return { valid: true };
}

/**
 * Execute quick airdrop - creates event and drops to all addresses
 */
export async function executeQuickAirdrop(
    config: QuickAirdropConfig,
    onProgress?: (progress: AirdropProgress) => void
): Promise<QuickAirdropResult> {
    // Validate
    const validation = validateQuickAirdrop(config);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const tokenAddress = config.tokenSymbol === "FCC" 
        ? getAddress("FCC_TOKEN") 
        : getAddress("USDT_TOKEN");

    try {
        // Phase 1: Create event
        let eventId: number | undefined;
        let eventTxHash: string | undefined;

        const createResult = await createQuickEvent(
            config.amountPerDrop,
            config.dropNumber,
            tokenAddress,
            () => {
                if (onProgress) onProgress({ phase: "approval" });
            },
            (txHash) => {
                // Approval complete
            },
            () => {
                if (onProgress) onProgress({ phase: "creating" });
            },
            (id, txHash) => {
                eventId = id;
                eventTxHash = txHash;
            }
        );

        if (!createResult.success || !createResult.eventId) {
            if (onProgress) onProgress({ phase: "error", error: createResult.error });
            return { success: false, error: createResult.error || "Failed to create event" };
        }

        eventId = createResult.eventId;
        eventTxHash = createResult.txHash;

        // Phase 2: Execute drops
        if (onProgress) {
            onProgress({ 
                phase: "dropping", 
                eventId,
                dropsCompleted: 0,
                dropsTotal: config.addresses.length,
            });
        }

        const dropResults = await executeBatchDrop(
            eventId,
            config.addresses,
            (current, total, address, success) => {
                if (onProgress) {
                    onProgress({
                        phase: "dropping",
                        eventId,
                        dropsCompleted: current,
                        dropsTotal: total,
                        currentAddress: address,
                    });
                }
            }
        );

        // Phase 3: Complete
        if (onProgress) {
            onProgress({
                phase: "complete",
                eventId,
                dropsCompleted: dropResults.successful,
                dropsTotal: dropResults.totalAttempted,
            });
        }

        return {
            success: true,
            eventId,
            eventTxHash,
            dropResults,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        if (onProgress) {
            onProgress({ phase: "error", error: errorMessage });
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Execute custom airdrop with user-specified parameters
 */
export async function executeCustomAirdrop(
    params: CreateEventInput,
    addresses: string[],
    onProgress?: (progress: AirdropProgress) => void
): Promise<QuickAirdropResult> {
    if (addresses.length === 0) {
        return { success: false, error: "No addresses provided" };
    }

    if (addresses.length > params.dropNumber) {
        return { 
            success: false, 
            error: `Too many addresses (${addresses.length}) for drop count (${params.dropNumber})` 
        };
    }

    try {
        // Phase 1: Create event
        let eventId: number | undefined;
        let eventTxHash: string | undefined;

        const createResult = await createEvent(
            params,
            () => {
                if (onProgress) onProgress({ phase: "approval" });
            },
            (txHash) => {
                // Approval complete
            },
            () => {
                if (onProgress) onProgress({ phase: "creating" });
            },
            (id, txHash) => {
                eventId = id;
                eventTxHash = txHash;
            }
        );

        if (!createResult.success || !createResult.eventId) {
            if (onProgress) onProgress({ phase: "error", error: createResult.error });
            return { success: false, error: createResult.error || "Failed to create event" };
        }

        eventId = createResult.eventId;
        eventTxHash = createResult.txHash;

        // Phase 2: Execute drops
        if (onProgress) {
            onProgress({ 
                phase: "dropping", 
                eventId,
                dropsCompleted: 0,
                dropsTotal: addresses.length,
            });
        }

        const dropResults = await executeBatchDrop(
            eventId,
            addresses,
            (current, total, address, success) => {
                if (onProgress) {
                    onProgress({
                        phase: "dropping",
                        eventId,
                        dropsCompleted: current,
                        dropsTotal: total,
                        currentAddress: address,
                    });
                }
            }
        );

        // Phase 3: Complete
        if (onProgress) {
            onProgress({
                phase: "complete",
                eventId,
                dropsCompleted: dropResults.successful,
                dropsTotal: dropResults.totalAttempted,
            });
        }

        return {
            success: true,
            eventId,
            eventTxHash,
            dropResults,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        if (onProgress) {
            onProgress({ phase: "error", error: errorMessage });
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Power user mode - one-click workflow for all saved addresses
 */
export async function executePowerUserAirdrop(
    templateKey: keyof typeof QUICK_AIRDROP_TEMPLATES = "standard",
    tokenSymbol: "FCC" | "USDT" = "FCC",
    onProgress?: (progress: AirdropProgress) => void
): Promise<QuickAirdropResult> {
    const template = QUICK_AIRDROP_TEMPLATES[templateKey];
    const savedAddresses = getSavedAddresses();
    
    if (savedAddresses.length === 0) {
        return { success: false, error: "No addresses in address book" };
    }

    const addresses = savedAddresses.map(a => a.address);
    
    return executeQuickAirdrop(
        {
            tokenSymbol,
            amountPerDrop: template.amountPerDrop,
            dropNumber: Math.max(template.dropNumber, addresses.length),
            addresses,
        },
        onProgress
    );
}
