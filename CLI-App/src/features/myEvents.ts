/**
 * My Events Feature
 * Lists user's events with embedded fishcake.io links
 * Uses cache for INSTANT loading
 */

import chalk from "chalk";
import Table from "cli-table3";
import { showSectionTitle, showError, showInfo, createSpinner } from "../frontend/display.js";
import { promptContinue, promptEventId } from "../frontend/prompts.js";
import inquirer from "inquirer";
import { getEventManagerContract } from "../blockchain/contracts.js";
import { getWalletAddress } from "../wallet/connection.js";
import { getTokenSymbol, getTokenDecimals } from "../config/addresses.js";
import { fromWei, shortenAddress } from "../utils/format.js";
import { nowUnix, formatDateTime } from "../utils/time.js";
import { parseActivityContent } from "../utils/content.js";
import { getUserEventsInstant, getEventTimeRemaining, type CachedEvent } from "../cache/eventCache.js";

// Token emojis
const TOKEN_EMOJI = {
    FCC: "🍥",
    USDT: "💲",
    UNKNOWN: "❓",
} as const;

function getTokenEmoji(symbol: string): string {
    return TOKEN_EMOJI[symbol as keyof typeof TOKEN_EMOJI] || TOKEN_EMOJI.UNKNOWN;
}

export async function myEventsFeature(): Promise<void> {
    showSectionTitle("MY EVENTS");
    
    const spinner = createSpinner("⚡ Loading events...");
    
    try {
        const walletAddress = getWalletAddress();
        
        // Use cached events for INSTANT loading
        const events = await getUserEventsInstant(walletAddress, (msg) => {
            spinner.text = msg;
        });
        
        if (events.length === 0) {
            spinner.succeed("No events found");
            console.log(chalk.dim("\n  ℹ️  You haven't created any events yet"));
            console.log(chalk.dim("     Use option 1 to create your first event!\n"));
            await promptContinue();
            return;
        }
        
        // Group events by status
        const now = nowUnix();
        const grouped = {
            active: events.filter(e => e.activityStatus !== 2 && e.activityDeadLine > now),
            expired: events.filter(e => e.activityStatus !== 2 && e.activityDeadLine <= now),
            finished: events.filter(e => e.activityStatus === 2),
        };
        
        spinner.succeed(`Found ${events.length} event(s) ⚡`);
        
        // Display events in sections
        if (grouped.active.length > 0) {
            console.log(chalk.green.bold("\n✅ ACTIVE EVENTS (Live Countdown)"));
            displayEventsCompact(grouped.active, "active");
        }
        
        if (grouped.expired.length > 0) {
            console.log(chalk.yellow.bold("\n⏰ EXPIRED (finish for refund)"));
            displayEventsCompact(grouped.expired, "expired");
        }
        
        if (grouped.finished.length > 0) {
            console.log(chalk.dim.bold("\n🏁 FINISHED"));
            displayEventsCompact(grouped.finished, "finished");
        }
        
        // Offer to view full details
        console.log();
        const { viewDetails } = await inquirer.prompt<{ viewDetails: boolean }>([{
            type: "confirm",
            name: "viewDetails",
            message: "🔎 Want to see full details of an event?",
            default: false,
        }]);
        
        if (viewDetails) {
            const eventId = await promptEventId();
            const eventManager = getEventManagerContract();
            await showFullEventDetails(eventManager, eventId);
        }
        
    } catch (error) {
        spinner.fail("Failed to load events");
        if (error instanceof Error) {
            showError(error.message);
        }
    }
    
    await promptContinue();
}

function displayEventsCompact(events: CachedEvent[], status: string): void {
    const table = new Table({
        head: [
            chalk.cyan("ID"),
            chalk.cyan("Token"),
            chalk.cyan("Drops"),
            chalk.cyan("Status"),
            chalk.cyan("🔗 Link"),
        ],
        colWidths: [8, 8, 10, 16, 42],
        style: { head: [], border: [] },
    });
    
    for (const e of events) {
        const tokenEmoji = getTokenEmoji(e.tokenSymbol);
        const drops = `${e.alreadyDropNumber}/${e.dropNumber}`;
        const link = `fishcake.io/event?activityId=${e.activityId}`;
        
        let statusDisplay: string;
        if (status === "active") {
            const countdown = getEventTimeRemaining(e.activityDeadLine);
            statusDisplay = chalk.green(`⏳ ${countdown}`);
        } else if (status === "expired") {
            statusDisplay = chalk.yellow("⏰ Expired");
        } else {
            statusDisplay = chalk.red("🏁 FINISHED");
        }
        
        table.push([
            chalk.bold(`#${e.activityId}`),
            `${tokenEmoji} ${e.tokenSymbol}`,
            chalk.cyan(drops),
            statusDisplay,
            chalk.blue.underline(link),
        ]);
    }
    
    console.log(table.toString());
}

async function showFullEventDetails(eventManager: any, eventId: number): Promise<void> {
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
        
        spinner.succeed("Event loaded");
        
        const content = parseActivityContent(baseInfo.activityContent);
        const tokenSymbol = getTokenSymbol(baseInfo.tokenContractAddr);
        const tokenEmoji = getTokenEmoji(tokenSymbol);
        const tokenDecimals = getTokenDecimals(baseInfo.tokenContractAddr);
        const deadline = Number(baseInfo.activityDeadLine);
        const now = nowUnix();
        const status = Number(extInfo.activityStatus);
        
        let statusText: string;
        let statusEmoji: string;
        if (status === 2) {
            statusText = "Finished";
            statusEmoji = "🏁";
        } else if (deadline < now) {
            statusText = "Expired";
            statusEmoji = "⏰";
        } else {
            statusText = "Active";
            statusEmoji = "✅";
        }
        
        const totalBudget = BigInt(baseInfo.maxDropAmt) * BigInt(baseInfo.dropNumber);
        const alreadyDropped = BigInt(extInfo.alreadyDropAmts);
        const dropType = Number(baseInfo.dropType);
        
        console.log(chalk.cyan.bold(`\n${"═".repeat(50)}`));
        console.log(chalk.bold(`  📋 EVENT #${eventId}: ${baseInfo.businessName}`));
        console.log(chalk.cyan.bold(`${"═".repeat(50)}`));
        
        console.log(`\n  ${chalk.dim("Description:")} ${content.activityContentDescription || baseInfo.activityContent}`);
        if (content.activityContentAddress) {
            console.log(`  ${chalk.dim("Address:")} 📍 ${content.activityContentAddress}`);
        }
        if (content.activityContentLink) {
            console.log(`  ${chalk.dim("Link:")} 🔗 ${content.activityContentLink}`);
        }
        if (baseInfo.latitudeLongitude) {
            console.log(`  ${chalk.dim("Location:")} 🗺️  ${baseInfo.latitudeLongitude}`);
        }
        
        console.log(chalk.dim(`\n  ${"─".repeat(46)}`));
        console.log(`  ${chalk.dim("Token:")}       ${tokenEmoji} ${chalk.bold(tokenSymbol)}`);
        console.log(`  ${chalk.dim("Drop Type:")}   ${dropType === 1 ? "📊 Even (Fixed)" : "🎲 Random"}`);
        console.log(`  ${chalk.dim("Budget:")}      ${fromWei(totalBudget, tokenDecimals)} ${tokenSymbol}`);
        console.log(`  ${chalk.dim("Dropped:")}     ${fromWei(alreadyDropped, tokenDecimals)} ${tokenSymbol}`);
        console.log(`  ${chalk.dim("Drops:")}       ${extInfo.alreadyDropNumber} / ${baseInfo.dropNumber}`);
        console.log(`  ${chalk.dim("Deadline:")}    📅 ${formatDateTime(deadline)}`);
        console.log(`  ${chalk.dim("Countdown:")}   ⏳ ${getEventTimeRemaining(deadline)}`);
        console.log(`  ${chalk.dim("Status:")}      ${statusEmoji} ${statusText}`);
        console.log(`  ${chalk.dim("Owner:")}       ${shortenAddress(baseInfo.businessAccount)}`);
        
        if (status === 2) {
            const refund = totalBudget - alreadyDropped;
            const mined = BigInt(extInfo.businessMinedAmt);
            console.log(chalk.dim(`\n  ${"─".repeat(46)}`));
            console.log(chalk.green(`  💰 Refunded:  +${fromWei(refund, tokenDecimals)} ${tokenSymbol}`));
            console.log(chalk.green(`  ⛏️  Mined:     +${fromWei(mined, 6)} FCC`));
        }
        
        console.log(`\n  🔗 ${chalk.blue.underline(`https://fishcake.io/event?activityId=${eventId}`)}`);
        console.log(chalk.cyan.bold(`${"═".repeat(50)}\n`));
        
    } catch (error) {
        spinner.fail("Failed to load event");
        if (error instanceof Error) {
            showError(error.message);
        }
    }
}
