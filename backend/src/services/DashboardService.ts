/**
 * Dashboard Service - Business logic for dashboard data
 * NO UI CODE - Pure data fetching and aggregation
 */

import { getFCCBalance, getUSDTBalance, getPOLBalance, getWalletAddress } from "../wallet/connection.js";
import { getGasTracker, getGasPrice } from "../blockchain/provider.js";
import { getNFTStatus } from "./NFTService.js";
import { getEventInfo, getUserEvents, type EventFullInfo } from "./EventService.js";
import { fromWei } from "../utils/format.js";
import { TOKEN_DECIMALS } from "../config/addresses.js";
import { getUserEventsInstant, type CachedEvent } from "../cache/eventCache.js";

export interface BalanceData {
    fcc: string;
    usdt: string;
    pol: string;
    fccRaw: bigint;
    usdtRaw: bigint;
    polRaw: bigint;
}

export interface PassInfo {
    hasPass: boolean;
    passType: "basic" | "pro" | null;
    daysRemaining: number;
    isExpired: boolean;
    expiryTime: number | null;
}

export interface EventSummary {
    eventId: number;
    tokenSymbol: string;
    dropsUsed: number;
    totalDrops: number;
    isFinished: boolean;
    isExpired: boolean;
    deadline: number;
    link: string;
}

export interface DashboardData {
    walletAddress: string;
    walletAddressShort: string;
    balances: BalanceData;
    pass: PassInfo;
    events: EventSummary[];
    gasGwei: string;
    lastUpdated: number;
}

/**
 * Fetch all balances in parallel
 */
export async function fetchBalances(): Promise<BalanceData> {
    const [fccRaw, usdtRaw, polRaw] = await Promise.all([
        getFCCBalance(),
        getUSDTBalance(),
        getPOLBalance(),
    ]);

    return {
        fcc: fromWei(fccRaw, TOKEN_DECIMALS.FCC),
        usdt: fromWei(usdtRaw, TOKEN_DECIMALS.USDT),
        pol: fromWei(polRaw, TOKEN_DECIMALS.POL),
        fccRaw,
        usdtRaw,
        polRaw,
    };
}

/**
 * Fetch pass info
 */
export async function fetchPassInfo(): Promise<PassInfo> {
    const nftStatus = await getNFTStatus();
    return {
        hasPass: nftStatus.hasPass,
        passType: nftStatus.passType,
        daysRemaining: nftStatus.daysRemaining,
        isExpired: nftStatus.isExpired,
        expiryTime: nftStatus.expiryTime,
    };
}

/**
 * Get gas price for display
 */
export async function fetchGasPrice(): Promise<string> {
    try {
        const gasData = await getGasTracker();
        const gwei = Number(gasData.standard) / 1e9;
        return gwei.toFixed(2);
    } catch {
        try {
            const feeData = await getGasPrice();
            const gwei = Number(feeData) / 1e9;
            return gwei.toFixed(2);
        } catch { /* ignore fee fetch error */ }
        return "-.--";
    }
}

/**
 * Convert event to summary format
 */
export function eventToSummary(event: EventFullInfo): EventSummary {
    const now = Math.floor(Date.now() / 1000);
    return {
        eventId: event.base.activityId,
        tokenSymbol: event.tokenSymbol,
        dropsUsed: event.ext.alreadyDropNumber,
        totalDrops: event.base.dropNumber,
        isFinished: event.status === "finished",
        isExpired: event.status === "expired",
        deadline: event.base.activityDeadLine,
        link: `https://fishcake.io/event?activityId=${event.base.activityId}`,
    };
}

/**
 * Convert cached event to summary format
 */
function cachedEventToSummary(event: CachedEvent): EventSummary {
    const now = Math.floor(Date.now() / 1000);
    return {
        eventId: event.activityId,
        tokenSymbol: event.tokenSymbol,
        dropsUsed: event.alreadyDropNumber,
        totalDrops: event.dropNumber,
        isFinished: event.activityStatus === 2,
        isExpired: event.activityDeadLine < now,
        deadline: event.activityDeadLine,
        link: `https://fishcake.io/event?activityId=${event.activityId}`,
    };
}

/**
 * Fetch user's active events (with caching)
 */
export async function fetchUserEvents(forceRefresh: boolean = false): Promise<EventSummary[]> {
    const walletAddress = getWalletAddress();
    
    // Use instant cache-based loading
    const cachedEvents = await getUserEventsInstant(walletAddress);
    return cachedEvents.map(cachedEventToSummary);
}

/**
 * Fetch complete dashboard data
 */
export async function fetchDashboardData(forceRefresh: boolean = false): Promise<DashboardData> {
    const walletAddress = getWalletAddress();
    const walletAddressShort = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

    // Fetch everything in parallel
    const [balances, pass, gasGwei, events] = await Promise.all([
        fetchBalances(),
        fetchPassInfo(),
        fetchGasPrice(),
        fetchUserEvents(forceRefresh),
    ]);

    return {
        walletAddress,
        walletAddressShort,
        balances,
        pass,
        events,
        gasGwei,
        lastUpdated: Date.now(),
    };
}

/**
 * Refresh just the balances (fast)
 */
export async function refreshBalances(): Promise<BalanceData> {
    return fetchBalances();
}

/**
 * Refresh just the gas price (fast)
 */
export async function refreshGas(): Promise<string> {
    return fetchGasPrice();
}

/**
 * Calculate time remaining string
 */
export function formatTimeRemaining(deadline: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = deadline - now;
    
    if (diff <= 0) {
        return "EXPIRED";
    }
    
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Format pass validity string
 */
export function formatPassValidity(pass: PassInfo): string {
    if (!pass.hasPass) {
        return "None";
    }
    
    if (pass.isExpired) {
        return `${pass.passType?.toUpperCase()} (Expired)`;
    }
    
    const typeStr = pass.passType === "pro" ? "Pro" : "Basic";
    
    if (pass.daysRemaining > 30) {
        return `${typeStr} (${pass.daysRemaining}d)`;
    } else if (pass.daysRemaining > 0) {
        return `${typeStr} (${pass.daysRemaining}d left)`;
    } else {
        // Less than a day
        if (pass.expiryTime) {
            const diff = pass.expiryTime - Math.floor(Date.now() / 1000);
            const hours = Math.floor(diff / 3600);
            const mins = Math.floor((diff % 3600) / 60);
            return `${typeStr} (${hours}h ${mins}m left)`;
        }
        return `${typeStr} (<1d left)`;
    }
}
