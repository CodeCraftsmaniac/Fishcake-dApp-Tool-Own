/**
 * Live Dashboard - Real-time display of wallet info, balances, pass, and events
 * FAST LOADING: Balances + events loaded in parallel (~3-5 seconds)
 */

import chalk from "chalk";
import boxen from "boxen";
import { shortenAddress } from "../utils/format.js";
import { getWalletAddress, getBalances, formatFCC, formatUSDT, formatPOL } from "../wallet/connection.js";
import { getNFTManagerContract } from "../blockchain/contracts.js";
import { nowUnix } from "../utils/time.js";
import { loadEventCache, saveEventCache, type CachedEvent } from "../cache/eventCache.js";
import { getGasTracker, formatGasToGwei } from "../blockchain/provider.js";

// Token emojis
const TOKEN_EMOJI = {
    FCC: "🍥",
    USDT: "💲",
    UNKNOWN: "❓",
} as const;

// Gradient colors for lines (cyan -> blue -> magenta)
const GRADIENT_COLORS = [
    chalk.cyan,
    chalk.cyanBright,
    chalk.blue,
    chalk.blueBright,
    chalk.magenta,
];

export function renderGradientLine(length: number = 45): string {
    let line = "";
    for (let i = 0; i < length; i++) {
        const colorIdx = Math.floor((i / length) * GRADIENT_COLORS.length);
        line += GRADIENT_COLORS[colorIdx]("─");
    }
    return line;
}

export function renderGradientText(text: string): string {
    let result = "";
    const len = text.length;
    for (let i = 0; i < len; i++) {
        const colorIdx = Math.floor((i / len) * GRADIENT_COLORS.length);
        result += GRADIENT_COLORS[colorIdx](text[i]);
    }
    return result;
}

export interface DashboardData {
    address: string;
    balances: {
        fcc: bigint;
        usdt: bigint;
        pol: bigint;
    };
    pass: {
        type: "Pro" | "Basic" | "None";
        deadline: number;
    };
    events: CachedEvent[];
    gasGwei: string;
}

let cachedDashboardData: DashboardData | null = null;
let lastDashboardUpdate = 0;

/**
 * FAST Load dashboard data - caches aggressively for performance
 * Uses parallel fetching to minimize load time
 */
export async function loadDashboardData(forceRefresh = false): Promise<DashboardData> {
    const now = nowUnix();
    
    // Return cached data if recent (< 30 seconds for balance, always fresh for events countdown)
    if (!forceRefresh && cachedDashboardData && (now - lastDashboardUpdate) < 30) {
        // Refresh gas even from cache
        try {
            const gasData = await getGasTracker();
            cachedDashboardData.gasGwei = formatGasToGwei(gasData.fast);
        } catch { /* ignore */ }
        return cachedDashboardData;
    }
    
    const address = getWalletAddress();
    
    // FAST: Load cached events first (instant if cache exists)
    const cachedEventsData = loadEventCache(address);
    const cachedEvents = cachedEventsData?.events || [];
    
    // Parallel fetch balances, pass info, and gas (fastest possible)
    // Skip NFT check on subsequent loads if we know user has no pass
    const [balances, passInfo, gasData] = await Promise.all([
        getBalances(),
        getPassInfoFast(address, cachedDashboardData?.pass),
        getGasTracker().catch(() => ({ fast: 100_000_000_000n })),
    ]);
    
    cachedDashboardData = {
        address,
        balances,
        pass: passInfo,
        events: cachedEvents,
        gasGwei: formatGasToGwei(gasData.fast),
    };
    lastDashboardUpdate = now;
    
    return cachedDashboardData;
}

/**
 * FAST pass info - skips RPC if we know pass is None
 */
async function getPassInfoFast(
    address: string, 
    cachedPass?: { type: "Pro" | "Basic" | "None"; deadline: number }
): Promise<{ type: "Pro" | "Basic" | "None"; deadline: number }> {
    const now = nowUnix();
    
    // If we cached "None" recently, skip RPC (passes don't appear magically)
    if (cachedPass && cachedPass.type === "None") {
        return cachedPass;
    }
    
    // If we have an active pass cached, just check if it's still valid
    if (cachedPass && cachedPass.type !== "None" && cachedPass.deadline > now) {
        return cachedPass;
    }
    
    try {
        const nftManager = getNFTManagerContract();
        
        // Parallel fetch both deadlines
        const [proDeadline, basicDeadline] = await Promise.all([
            nftManager.getMerchantNTFDeadline(address).catch(() => 0n),
            nftManager.getUserNTFDeadline(address).catch(() => 0n),
        ]);
        
        const proActive = Number(proDeadline) > now;
        const basicActive = Number(basicDeadline) > now;
        
        if (proActive) {
            return { type: "Pro", deadline: Number(proDeadline) };
        } else if (basicActive) {
            return { type: "Basic", deadline: Number(basicDeadline) };
        } else {
            return { type: "None", deadline: 0 };
        }
    } catch {
        return { type: "None", deadline: 0 };
    }
}

/**
 * Format pass countdown (live)
 */
export function formatPassCountdown(deadline: number): string {
    const now = nowUnix();
    const diff = deadline - now;
    
    if (diff <= 0) return "Expired";
    
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    if (days > 30) {
        return `${days}d`;
    } else if (days > 0) {
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
 * Get event time remaining for countdown
 */
export function getEventTimeRemaining(deadline: number): string {
    const now = nowUnix();
    const diff = deadline - now;
    
    if (diff <= 0) return "Ended";
    
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
 * Render the enhanced header with all balances, pass info, and gas tracker
 */
export function renderEnhancedHeader(data: DashboardData): string {
    const shortAddr = shortenAddress(data.address);
    
    // Format balances
    const fccFormatted = formatFCC(data.balances.fcc);
    const usdtFormatted = formatUSDT(data.balances.usdt);
    const polFormatted = formatPOL(data.balances.pol);
    
    // Parse and format for display
    const fccNum = parseFloat(fccFormatted).toFixed(2);
    const usdtNum = parseFloat(usdtFormatted).toFixed(2);
    const polNum = parseFloat(polFormatted).toFixed(4);
    
    // Pass info with countdown
    let passText: string;
    if (data.pass.type === "Pro") {
        const countdown = formatPassCountdown(data.pass.deadline);
        passText = chalk.green(`🎫 Pro`) + chalk.dim(` (${countdown})`);
    } else if (data.pass.type === "Basic") {
        const countdown = formatPassCountdown(data.pass.deadline);
        passText = chalk.yellow(`🎫 Basic`) + chalk.dim(` (${countdown})`);
    } else {
        passText = chalk.dim("🎫 None");
    }
    
    // Gas tracker
    const gasText = `⛽ ${chalk.magenta(data.gasGwei)} Gwei`;
    
    const gradientLine = renderGradientLine(44);
    
    const header = `  ${renderGradientText("🐟 Fishcake CLI")} ${chalk.dim("v1.0")}
  ${gradientLine}
  ${chalk.dim("Wallet:")}  ${chalk.green(shortAddr)} │ 🔗 ${chalk.cyan("Polygon")} │ ${gasText}
  ${chalk.dim("Pass:")}    ${passText}
  ${gradientLine}
  🍥 ${chalk.yellow(fccNum)} FCC  │  💲 ${chalk.green(usdtNum)} USDT  │  ⟠ ${chalk.white(polNum)} POL`;
    
    return boxen(header, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderColor: "cyan",
        borderStyle: "round",
    });
}

/**
 * Render user's events with live countdown under header
 * Format: ActivityID X | FCC/USDT | X/X drops | Link | Ends in XXXXXX
 */
export function renderUserEventsSection(events: CachedEvent[]): string {
    const now = nowUnix();
    
    // Filter events: show active/expired first, then finished (max 5)
    const activeExpired = events.filter(e => e.activityStatus !== 2).slice(0, 5);
    
    if (activeExpired.length === 0) {
        return "";
    }
    
    const lines: string[] = [];
    lines.push(renderGradientLine(50));
    lines.push(chalk.bold.cyan(" 📋 YOUR EVENTS"));
    
    for (const event of activeExpired) {
        const tokenEmoji = TOKEN_EMOJI[event.tokenSymbol as keyof typeof TOKEN_EMOJI] || TOKEN_EMOJI.UNKNOWN;
        const isActive = event.activityDeadLine > now;
        const isFinished = event.activityStatus === 2;
        
        // Format countdown/status
        let statusText: string;
        if (isFinished) {
            statusText = chalk.red("🏁 FINISHED");
        } else if (isActive) {
            statusText = chalk.green(`⏳ ${getEventTimeRemaining(event.activityDeadLine)}`);
        } else {
            statusText = chalk.yellow("⏰ Expired");
        }
        
        const link = chalk.blue.underline(`fishcake.io/event?activityId=${event.activityId}`);
        
        // ActivityID | Token | Drops | Link | Countdown
        const line = ` ${chalk.cyan.bold(`#${event.activityId}`)} │ ${tokenEmoji} ${event.tokenSymbol.padEnd(4)} │ ` +
                     `${chalk.white(`${event.alreadyDropNumber}/${event.dropNumber}`)} │ ${link} │ ${statusText}`;
        
        lines.push(line);
    }
    
    lines.push(renderGradientLine(50));
    
    return "\n" + lines.join("\n");
}

/**
 * Full dashboard render - header + events
 */
export async function renderFullDashboard(): Promise<string> {
    const data = await loadDashboardData();
    
    let output = renderEnhancedHeader(data);
    
    // Add user's events section if they have any (including finished)
    const relevantEvents = data.events.filter(e => e.activityStatus !== 2);
    if (relevantEvents.length > 0) {
        output += renderUserEventsSection(data.events);
    }
    
    return output;
}

/**
 * Just get the header string (for quick refresh)
 */
export async function getHeaderOnly(): Promise<string> {
    const data = await loadDashboardData();
    return renderEnhancedHeader(data);
}

/**
 * Clear cached data to force refresh
 * Also invalidates event cache by resetting lastFullScan
 */
export function clearDashboardCache(): void {
    cachedDashboardData = null;
    lastDashboardUpdate = 0;
    
    // Also invalidate event cache file so it refreshes from blockchain
    try {
        const address = getWalletAddress();
        const cache = loadEventCache(address);
        if (cache) {
            cache.lastFullScan = 0; // Force refresh
            saveEventCache(cache);
        }
    } catch {
        // Ignore errors
    }
}

/**
 * Update events in cache (call this after events scan completes in background)
 */
export function updateCachedEvents(events: CachedEvent[]): void {
    if (cachedDashboardData) {
        cachedDashboardData.events = events;
    }
}
