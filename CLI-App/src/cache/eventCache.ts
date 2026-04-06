/**
 * Event Cache - Local caching for instant event loading
 * Stores user's events locally for fast access
 */

import fs from "fs";
import path from "path";
import os from "os";
import { getEventManagerContract } from "../blockchain/contracts.js";
import { getTokenSymbol, getTokenDecimals } from "../config/addresses.js";
import { nowUnix } from "../utils/time.js";

// Cache file location
const CACHE_DIR = path.join(os.homedir(), ".fishcake-cli");
const CACHE_FILE = path.join(CACHE_DIR, "events-cache.json");

export interface CachedEvent {
    activityId: number;
    businessName: string;
    tokenSymbol: string;
    tokenDecimals: number;
    dropNumber: number;
    alreadyDropNumber: number;
    alreadyDropAmts: string;
    maxDropAmt: string;
    activityDeadLine: number;
    activityStatus: number;
    tokenContractAddr: string;
    lastUpdated: number;
}

interface EventCache {
    walletAddress: string;
    events: CachedEvent[];
    lastFullScan: number;
    highestKnownEventId: number;
}

function ensureCacheDir(): void {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
}

export function loadEventCache(walletAddress: string): EventCache | null {
    try {
        if (!fs.existsSync(CACHE_FILE)) return null;
        
        const data = fs.readFileSync(CACHE_FILE, "utf-8");
        const cache: EventCache = JSON.parse(data);
        
        // Return cache only if it matches this wallet
        if (cache.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return null;
        }
        
        return cache;
    } catch {
        return null;
    }
}

export function saveEventCache(cache: EventCache): void {
    ensureCacheDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

export function clearEventCache(): void {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            fs.unlinkSync(CACHE_FILE);
        }
    } catch {
        // Ignore errors
    }
}

/**
 * Get user events instantly from cache + quick blockchain update
 * This is MUCH faster than full blockchain scanning
 */
export async function getUserEventsInstant(
    walletAddress: string,
    onProgress?: (msg: string) => void
): Promise<CachedEvent[]> {
    // Try to load from cache
    let cache = loadEventCache(walletAddress);
    const now = nowUnix();
    
    // If no cache or cache is stale (>5 minutes), do incremental update
    if (!cache) {
        cache = {
            walletAddress,
            events: [],
            lastFullScan: 0,
            highestKnownEventId: 0,
        };
    }
    
    // Quick update: Only fetch status for cached events + check for new events
    const cacheAge = now - cache.lastFullScan;
    
    if (cache.events.length > 0 && cacheAge < 300) {
        // Cache is fresh (< 5 minutes), just update status for active events
        onProgress?.("📋 Loading from cache...");
        
        const activeEvents = cache.events.filter(e => 
            e.activityStatus === 1 && e.activityDeadLine > now
        );
        
        // Quick status update for active events only
        if (activeEvents.length > 0 && activeEvents.length <= 5) {
            onProgress?.("🔄 Updating active events...");
            await updateEventStatuses(cache, activeEvents.map(e => e.activityId));
            saveEventCache(cache);
        }
        
        return cache.events;
    }
    
    // If we have cached events but they're stale, update them quickly
    if (cache.events.length > 0) {
        onProgress?.("🔄 Updating event statuses...");
        
        // Update all cached events
        await updateEventStatuses(cache, cache.events.map(e => e.activityId));
        
        // Also check for new events (incrementally)
        const newEvents = await scanForNewEvents(
            walletAddress,
            cache.highestKnownEventId,
            onProgress
        );
        
        for (const evt of newEvents) {
            if (!cache.events.find(e => e.activityId === evt.activityId)) {
                cache.events.push(evt);
            }
            if (evt.activityId > cache.highestKnownEventId) {
                cache.highestKnownEventId = evt.activityId;
            }
        }
        
        cache.lastFullScan = now;
        saveEventCache(cache);
        
        return cache.events;
    }
    
    // No cache - do full scan (first time only)
    onProgress?.("🔍 First-time scan (cached for future)...");
    const events = await fullEventScan(walletAddress, onProgress);
    
    cache.events = events;
    cache.lastFullScan = now;
    cache.highestKnownEventId = events.reduce((max, e) => Math.max(max, e.activityId), 0);
    saveEventCache(cache);
    
    return events;
}

async function updateEventStatuses(cache: EventCache, eventIds: number[]): Promise<void> {
    const eventManager = getEventManagerContract();
    
    // Batch fetch all at once
    const results = await Promise.allSettled(
        eventIds.map(async (id) => {
            const [info, extInfo] = await Promise.all([
                eventManager.activityInfoArrs(id - 1),
                eventManager.activityInfoExtArrs(id - 1),
            ]);
            return { id, info, extInfo };
        })
    );
    
    for (const result of results) {
        if (result.status === "fulfilled") {
            const { id, extInfo } = result.value;
            const cached = cache.events.find(e => e.activityId === id);
            if (cached) {
                cached.alreadyDropNumber = Number(extInfo.alreadyDropNumber);
                cached.alreadyDropAmts = extInfo.alreadyDropAmts.toString();
                cached.activityStatus = Number(extInfo.activityStatus);
                cached.lastUpdated = nowUnix();
            }
        }
    }
}

async function scanForNewEvents(
    walletAddress: string,
    startFromId: number,
    onProgress?: (msg: string) => void
): Promise<CachedEvent[]> {
    const eventManager = getEventManagerContract();
    const newEvents: CachedEvent[] = [];
    
    // Scan from startFromId + 1 to current latest (up to 100 newer events)
    const maxToCheck = 100;
    
    for (let i = startFromId + 1; i <= startFromId + maxToCheck; i++) {
        try {
            const [info, extInfo] = await Promise.all([
                eventManager.activityInfoArrs(i - 1),
                eventManager.activityInfoExtArrs(i - 1),
            ]);
            
            if (Number(info.activityId) === 0) break; // No more events
            
            // Check if this event belongs to the wallet
            if (info.businessAccount.toLowerCase() === walletAddress.toLowerCase()) {
                const tokenSymbol = getTokenSymbol(info.tokenContractAddr);
                const tokenDecimals = getTokenDecimals(info.tokenContractAddr);
                
                newEvents.push({
                    activityId: Number(info.activityId),
                    businessName: info.businessName,
                    tokenSymbol,
                    tokenDecimals,
                    dropNumber: Number(info.dropNumber),
                    alreadyDropNumber: Number(extInfo.alreadyDropNumber),
                    alreadyDropAmts: extInfo.alreadyDropAmts.toString(),
                    maxDropAmt: info.maxDropAmt.toString(),
                    activityDeadLine: Number(info.activityDeadLine),
                    activityStatus: Number(extInfo.activityStatus),
                    tokenContractAddr: info.tokenContractAddr,
                    lastUpdated: nowUnix(),
                });
            }
        } catch {
            break; // Stop on error (likely reached end)
        }
    }
    
    return newEvents;
}

async function fullEventScan(
    walletAddress: string,
    onProgress?: (msg: string) => void
): Promise<CachedEvent[]> {
    const eventManager = getEventManagerContract();
    const events: CachedEvent[] = [];
    
    // Get the latest event count dynamically
    let startIndex = 3500; // Default fallback
    try {
        // Binary search for the latest event by checking if events exist
        let low = 3400, high = 4500;
        onProgress?.("🔍 Finding latest events...");
        
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
        // Start from the actual latest event (low is the highest existing ID)
        startIndex = low;
    } catch {
        // Use fallback
    }
    
    const batchSize = 20;
    const maxBatches = 50; // Max 1000 events to scan
    
    for (let batch = 0; batch < maxBatches; batch++) {
        const indices: number[] = [];
        const batchStart = startIndex - (batch * batchSize);
        
        for (let j = 0; j < batchSize; j++) {
            const idx = batchStart - j;
            if (idx > 0) indices.push(idx);
        }
        
        if (indices.length === 0) break;
        
        onProgress?.(`🔍 Scanning events ${indices[indices.length-1]}-${indices[0]}...`);
        
        // Batch fetch
        const results = await Promise.allSettled(
            indices.map(async (i) => {
                const [info, extInfo] = await Promise.all([
                    eventManager.activityInfoArrs(i - 1),
                    eventManager.activityInfoExtArrs(i - 1),
                ]);
                return { i, info, extInfo };
            })
        );
        
        let allEmpty = true;
        
        for (const result of results) {
            if (result.status === "fulfilled") {
                const { info, extInfo } = result.value;
                
                if (Number(info.activityId) !== 0) {
                    allEmpty = false;
                    
                    // Check if this event belongs to the wallet
                    if (info.businessAccount.toLowerCase() === walletAddress.toLowerCase()) {
                        const tokenSymbol = getTokenSymbol(info.tokenContractAddr);
                        const tokenDecimals = getTokenDecimals(info.tokenContractAddr);
                        
                        events.push({
                            activityId: Number(info.activityId),
                            businessName: info.businessName,
                            tokenSymbol,
                            tokenDecimals,
                            dropNumber: Number(info.dropNumber),
                            alreadyDropNumber: Number(extInfo.alreadyDropNumber),
                            alreadyDropAmts: extInfo.alreadyDropAmts.toString(),
                            maxDropAmt: info.maxDropAmt.toString(),
                            activityDeadLine: Number(info.activityDeadLine),
                            activityStatus: Number(extInfo.activityStatus),
                            tokenContractAddr: info.tokenContractAddr,
                            lastUpdated: nowUnix(),
                        });
                    }
                }
            }
        }
        
        // If we've gone past event 1 or all events are empty, stop
        if (allEmpty || indices[indices.length - 1] <= 1) break;
    }
    
    // Sort by ID descending
    events.sort((a, b) => b.activityId - a.activityId);
    
    return events;
}

/**
 * Get status text for an event
 */
export function getEventStatusText(event: CachedEvent): {
    text: string;
    color: "green" | "yellow" | "dim";
} {
    const now = nowUnix();
    
    if (event.activityStatus === 2) {
        return { text: "🏁 Done", color: "dim" };
    } else if (event.activityDeadLine < now) {
        return { text: "⏰ Expired", color: "yellow" };
    } else {
        return { text: "✅ Active", color: "green" };
    }
}

/**
 * Get time remaining string for an event (for live countdown)
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
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}
