/**
 * Browse Events Feature
 * Search and filter all events on the blockchain
 * Falls back to blockchain scanning if API unavailable
 */

import chalk from "chalk";
import Table from "cli-table3";
import { showSectionTitle, showError, showInfo, createSpinner } from "../frontend/display.js";
import { promptBrowseFilters, promptContinue, promptEventId } from "../frontend/prompts.js";
import inquirer from "inquirer";
import { getActivityList } from "../api/endpoints.js";
import { getEventManagerContract } from "../blockchain/contracts.js";
import { getAddress, getTokenSymbol, getTokenDecimals } from "../config/addresses.js";
import { fromWei, shortenAddress, parseEventId } from "../utils/format.js";
import { timeRemaining, nowUnix, formatDateTime } from "../utils/time.js";
import { getActivityDescription, parseActivityContent } from "../utils/content.js";
import type { Activity } from "../types/index.js";

// Token emojis
const TOKEN_EMOJI = {
    FCC: "🍥",
    USDT: "💲",
    UNKNOWN: "❓",
} as const;

function getTokenEmoji(symbol: string): string {
    return TOKEN_EMOJI[symbol as keyof typeof TOKEN_EMOJI] || TOKEN_EMOJI.UNKNOWN;
}

export async function browseEventsFeature(): Promise<void> {
    showSectionTitle("BROWSE EVENTS");
    
    try {
        const filters = await promptBrowseFilters();
        
        const spinner = createSpinner("🔍 Loading events...");
        
        let activityStatus: string | undefined;
        if (filters.status === "ongoing") {
            activityStatus = "1";
        } else if (filters.status === "ended") {
            activityStatus = "2";
        }
        
        let tokenContractAddr: string | undefined;
        if (filters.token === "FCC") {
            tokenContractAddr = getAddress("FCC_TOKEN");
        } else if (filters.token === "USDT") {
            tokenContractAddr = getAddress("USDT_TOKEN");
        }
        
        let activityId: number | undefined;
        let businessName: string | undefined;
        
        if (filters.search) {
            const parsedId = parseEventId(filters.search);
            if (parsedId !== null) {
                activityId = parsedId;
            } else {
                businessName = filters.search;
            }
        }
        
        let activities: Activity[] = [];
        let fromApi = false;
        
        // Try API first
        try {
            const response = await getActivityList({
                pageSize: 50,
                activityStatus,
                tokenContractAddr,
                activityId,
                businessName,
            });
            activities = response.result || [];
            fromApi = true;
        } catch {
            spinner.text = "📡 API unavailable, scanning blockchain...";
        }
        
        // If API failed, scan blockchain directly
        if (!fromApi) {
            activities = await scanBlockchainForEvents(
                spinner,
                filters.status,
                filters.token,
                filters.search
            );
        }
        
        if (activities.length === 0) {
            spinner.succeed("Search complete");
            showInfo("😔 No events found matching your criteria");
            console.log(chalk.dim("\n  Try different filters or use option 3 to view a specific event by ID"));
            await promptContinue();
            return;
        }
        
        const eventManager = getEventManagerContract();
        const now = nowUnix();
        
        // Enrich events with on-chain status
        spinner.text = "🔄 Loading event details...";
        
        const enrichedEvents = await Promise.all(
            activities.slice(0, 25).map(async (activity) => {
                try {
                    const arrayIndex = activity.activityId - 1;
                    const extInfo = await eventManager.activityInfoExtArrs(arrayIndex);
                    
                    const status = Number(extInfo.activityStatus);
                    const deadline = activity.activityDeadLine;
                    
                    let statusText: string;
                    let statusEmoji: string;
                    if (status === 2) {
                        statusText = "Done";
                        statusEmoji = "🏁";
                    } else if (deadline < now) {
                        statusText = "Expired";
                        statusEmoji = "⏰";
                    } else {
                        statusText = "Active";
                        statusEmoji = "✅";
                    }
                    
                    const tokenSymbol = getTokenSymbol(activity.tokenContractAddr);
                    const tokenEmoji = getTokenEmoji(tokenSymbol);
                    const tokenDecimals = getTokenDecimals(activity.tokenContractAddr);
                    const totalBudget = BigInt(activity.maxDropAmt || 0) * BigInt(activity.dropNumber);
                    
                    return {
                        id: activity.activityId,
                        name: activity.businessName || getActivityDescription(activity.activityContent).slice(0, 22),
                        token: tokenSymbol,
                        tokenEmoji,
                        drops: `${extInfo.alreadyDropNumber}/${activity.dropNumber}`,
                        budget: fromWei(totalBudget, tokenDecimals),
                        status: statusText,
                        statusEmoji,
                        timeLeft: statusText === "Active" ? timeRemaining(deadline) : "—",
                        owner: shortenAddress(activity.businessAccount),
                        link: `https://fishcake.io/event?activityId=${activity.activityId}`,
                    };
                } catch {
                    return null;
                }
            })
        );
        
        const validEvents = enrichedEvents.filter(e => e !== null);
        
        spinner.succeed(`Found ${activities.length} events (showing ${validEvents.length})`);
        
        // Display header
        console.log();
        console.log(chalk.bold.cyan(`📋 EVENTS `));
        console.log(chalk.dim(`   Filters: ${filters.status} | ${filters.token} | ${filters.search || "all"}`));
        console.log();
        
        // Create table with emojis
        const table = new Table({
            head: [
                chalk.cyan("🆔"),
                chalk.cyan("📛 Name"),
                chalk.cyan("💰 Token"),
                chalk.cyan("📊 Drops"),
                chalk.cyan("📈 Status"),
                chalk.cyan("🔗 Link"),
            ],
            style: { head: [], border: [] },
            colWidths: [7, 24, 10, 10, 12, 32],
        });
        
        for (const event of validEvents) {
            if (!event) continue;
            
            const statusColor = event.status === "Active" ? chalk.green : 
                               event.status === "Expired" ? chalk.yellow : 
                               event.status === "Done" ? chalk.red : chalk.dim;
            
            table.push([
                chalk.white(`#${event.id}`),
                event.name.slice(0, 20),
                `${event.tokenEmoji} ${event.token}`,
                chalk.cyan(event.drops),
                statusColor(`${event.statusEmoji} ${event.status}`),
                chalk.blue.underline(event.link.replace("https://", "")),
            ]);
        }
        
        console.log(table.toString());
        
        if (activities.length > 25) {
            console.log(chalk.dim(`\n... and ${activities.length - 25} more events`));
        }
        
        // Offer to view details
        console.log();
        const { viewDetails } = await inquirer.prompt<{ viewDetails: boolean }>([{
            type: "confirm",
            name: "viewDetails",
            message: "🔎 View full details of an event?",
            default: false,
        }]);
        
        if (viewDetails) {
            const eventId = await promptEventId();
            await showEventQuickView(eventManager, eventId);
        }
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Failed to browse events");
        }
    }
    
    await promptContinue();
}

async function scanBlockchainForEvents(
    spinner: any,
    statusFilter: string,
    tokenFilter: string,
    search?: string
): Promise<Activity[]> {
    const activities: Activity[] = [];
    const eventManager = getEventManagerContract();
    const now = nowUnix();
    
    // Find the token address filter
    let tokenAddrFilter: string | undefined;
    if (tokenFilter === "FCC") {
        tokenAddrFilter = getAddress("FCC_TOKEN").toLowerCase();
    } else if (tokenFilter === "USDT") {
        tokenAddrFilter = getAddress("USDT_TOKEN").toLowerCase();
    }
    
    // Scan recent events (last 100 event IDs for speed)
    // Event IDs are 1-indexed, array access is (eventId - 1)
    const startEventId = 3360; // Start from recent event IDs
    const maxToScan = 100;
    const batchSize = 10; // Process 10 at a time
    
    for (let batch = 0; batch < maxToScan / batchSize; batch++) {
        const batchStartEventId = startEventId - (batch * batchSize);
        const eventIds: number[] = [];
        
        for (let j = 0; j < batchSize; j++) {
            const eventId = batchStartEventId - j;
            if (eventId > 0) eventIds.push(eventId);
        }
        
        if (eventIds.length === 0) break;
        
        spinner.text = `🔍 Scanning events ${eventIds[eventIds.length-1]}-${eventIds[0]}...`;
        
        // Fetch batch in parallel (convert eventId to array index)
        const results = await Promise.allSettled(
            eventIds.map(async (eventId) => {
                const arrayIndex = eventId - 1; // Critical: array index = eventId - 1
                const [info, extInfo] = await Promise.all([
                    eventManager.activityInfoArrs(arrayIndex),
                    eventManager.activityInfoExtArrs(arrayIndex),
                ]);
                return { eventId, info, extInfo };
            })
        );
        
        for (const result of results) {
            if (result.status !== "fulfilled") continue;
            const { eventId, info, extInfo } = result.value;
            
            if (Number(info.activityId) === 0) continue;
            
            // Apply filters
            const deadline = Number(info.activityDeadLine);
            const status = Number(extInfo.activityStatus);
            
            // Status filter
            if (statusFilter === "ongoing") {
                if (status === 2 || deadline < now) continue;
            } else if (statusFilter === "ended") {
                if (status !== 2 && deadline >= now) continue;
            }
            
            // Token filter
            if (tokenAddrFilter && info.tokenContractAddr.toLowerCase() !== tokenAddrFilter) {
                continue;
            }
            
            // Search filter
            if (search) {
                const searchLower = search.toLowerCase();
                const nameMatch = info.businessName.toLowerCase().includes(searchLower);
                const idMatch = eventId.toString() === search;
                if (!nameMatch && !idMatch) continue;
            }
            
            activities.push({
                activityId: eventId,
                businessAccount: info.businessAccount,
                businessName: info.businessName,
                activityContent: info.activityContent,
                latitudeLongitude: info.latitudeLongitude,
                activityCreateTime: Number(info.activityCreateTime),
                activityDeadLine: deadline,
                dropType: Number(info.dropType),
                dropNumber: Number(info.dropNumber),
                minDropAmt: BigInt(info.minDropAmt),
                maxDropAmt: BigInt(info.maxDropAmt),
                tokenContractAddr: info.tokenContractAddr,
            });
            
            if (activities.length >= 25) break;
        }
        
        if (activities.length >= 25) break;
    }
    
    // Sort by ID descending (newest first)
    activities.sort((a, b) => b.activityId - a.activityId);
    
    return activities;
}

async function showEventQuickView(eventManager: any, eventId: number): Promise<void> {
    const spinner = createSpinner(`Loading event #${eventId}...`);
    
    try {
        const arrayIndex = eventId - 1;
        const [baseInfo, extInfo] = await Promise.all([
            eventManager.activityInfoArrs(arrayIndex),
            eventManager.activityInfoExtArrs(arrayIndex),
        ]);
        
        if (!baseInfo || Number(baseInfo.activityId) === 0) {
            spinner.fail("Event not found");
            return;
        }
        
        spinner.succeed("Loaded");
        
        const content = parseActivityContent(baseInfo.activityContent);
        const tokenSymbol = getTokenSymbol(baseInfo.tokenContractAddr);
        const tokenEmoji = getTokenEmoji(tokenSymbol);
        const tokenDecimals = getTokenDecimals(baseInfo.tokenContractAddr);
        const deadline = Number(baseInfo.activityDeadLine);
        const now = nowUnix();
        const status = Number(extInfo.activityStatus);
        
        let statusText: string;
        if (status === 2) statusText = "🏁 Finished";
        else if (deadline < now) statusText = "⏰ Expired";
        else statusText = "✅ Active";
        
        const totalBudget = BigInt(baseInfo.maxDropAmt) * BigInt(baseInfo.dropNumber);
        const alreadyDropped = BigInt(extInfo.alreadyDropAmts);
        
        console.log(chalk.cyan.bold(`\n${"─".repeat(50)}`));
        console.log(chalk.bold(`📋 Event #${eventId}: ${baseInfo.businessName}`));
        console.log(chalk.cyan.bold(`${"─".repeat(50)}`));
        console.log(`  📝 ${content.activityContentDescription || baseInfo.activityContent}`);
        console.log(`  ${tokenEmoji} Token:    ${chalk.bold(tokenSymbol)}`);
        console.log(`  💰 Budget:   ${fromWei(totalBudget, tokenDecimals)} ${tokenSymbol}`);
        console.log(`  📊 Drops:    ${extInfo.alreadyDropNumber}/${baseInfo.dropNumber}`);
        console.log(`  📅 Deadline: ${formatDateTime(deadline)}`);
        console.log(`  ${statusText}`);
        console.log(`  🔗 ${chalk.blue.underline(`https://fishcake.io/event?activityId=${eventId}`)}`);
        console.log(chalk.cyan.bold(`${"─".repeat(50)}\n`));
        
    } catch (error) {
        spinner.fail("Failed to load event");
    }
}
