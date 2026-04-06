/**
 * Event Detail Feature
 * Shows comprehensive information about ANY event on the blockchain
 * Works for active, expired, or finished events
 */

import chalk from "chalk";
import boxen from "boxen";
import { showSectionTitle, showError, createSpinner } from "../frontend/display.js";
import { promptEventId, promptContinue } from "../frontend/prompts.js";
import { getEventManagerContract } from "../blockchain/contracts.js";
import { getWalletAddress } from "../wallet/connection.js";
import { getTokenSymbol, getTokenDecimals, CONTRACTS } from "../config/addresses.js";
import { fromWei, shortenAddress } from "../utils/format.js";
import { formatDateTime, timeRemaining, nowUnix, timeSince } from "../utils/time.js";
import { parseActivityContent } from "../utils/content.js";

// Token emojis
const TOKEN_EMOJI = {
    FCC: "🍥",
    USDT: "💲",
    UNKNOWN: "❓",
} as const;

function getTokenEmoji(symbol: string): string {
    return TOKEN_EMOJI[symbol as keyof typeof TOKEN_EMOJI] || TOKEN_EMOJI.UNKNOWN;
}

export async function eventDetailFeature(): Promise<void> {
    showSectionTitle("EVENT DETAIL");
    
    try {
        const eventId = await promptEventId();
        
        const spinner = createSpinner(`🔍 Loading event #${eventId}...`);
        
        const eventManager = getEventManagerContract();
        const arrayIndex = eventId - 1;
        
        const [baseInfo, extInfo] = await Promise.all([
            eventManager.activityInfoArrs(arrayIndex),
            eventManager.activityInfoExtArrs(arrayIndex),
        ]);
        
        if (!baseInfo || Number(baseInfo.activityId) === 0) {
            spinner.fail("Event not found");
            showError(`❌ Event #${eventId} does not exist on the blockchain`);
            await promptContinue();
            return;
        }
        
        spinner.succeed("Event loaded");
        
        // Parse all data
        const content = parseActivityContent(baseInfo.activityContent);
        const tokenSymbol = getTokenSymbol(baseInfo.tokenContractAddr);
        const tokenEmoji = getTokenEmoji(tokenSymbol);
        const tokenDecimals = getTokenDecimals(baseInfo.tokenContractAddr);
        const now = nowUnix();
        
        const createTime = Number(baseInfo.activityCreateTime);
        const deadline = Number(baseInfo.activityDeadLine);
        const status = Number(extInfo.activityStatus);
        
        // Determine status
        let statusText: string;
        let statusEmoji: string;
        let statusColor: (s: string) => string;
        if (status === 2) {
            statusText = "FINISHED";
            statusEmoji = "🏁";
            statusColor = chalk.dim;
        } else if (deadline < now) {
            statusText = "EXPIRED";
            statusEmoji = "⏰";
            statusColor = chalk.yellow;
        } else {
            statusText = "ACTIVE";
            statusEmoji = "✅";
            statusColor = chalk.green;
        }
        
        const walletAddress = getWalletAddress();
        const isOwner = baseInfo.businessAccount.toLowerCase() === walletAddress.toLowerCase();
        
        // Calculate amounts
        const totalBudget = BigInt(baseInfo.maxDropAmt) * BigInt(baseInfo.dropNumber);
        const alreadyDropped = BigInt(extInfo.alreadyDropAmts);
        const dropsRemaining = Number(baseInfo.dropNumber) - Number(extInfo.alreadyDropNumber);
        const minedAmount = BigInt(extInfo.businessMinedAmt);
        
        const dropType = Number(baseInfo.dropType);
        let dropTypeText: string;
        let dropRangeText: string;
        if (dropType === 1) {
            dropTypeText = "📊 Even (Fixed Amount)";
            dropRangeText = `${fromWei(BigInt(baseInfo.maxDropAmt), tokenDecimals)} ${tokenSymbol} per drop`;
        } else {
            dropTypeText = "🎲 Random";
            dropRangeText = `${fromWei(BigInt(baseInfo.minDropAmt), tokenDecimals)} - ${fromWei(BigInt(baseInfo.maxDropAmt), tokenDecimals)} ${tokenSymbol}`;
        }
        
        // Build the display
        console.log();
        console.log(chalk.cyan.bold(`╔${"═".repeat(58)}╗`));
        console.log(chalk.cyan.bold(`║`) + chalk.bold.white(` 📋 EVENT #${eventId}`.padEnd(58)) + chalk.cyan.bold(`║`));
        console.log(chalk.cyan.bold(`╠${"═".repeat(58)}╣`));
        
        // Event name
        const eventName = baseInfo.businessName || "Unnamed Event";
        console.log(chalk.cyan.bold(`║`) + chalk.bold(` ${eventName}`.padEnd(58)) + chalk.cyan.bold(`║`));
        console.log(chalk.cyan.bold(`╟${"─".repeat(58)}╢`));
        
        // Description
        const desc = content.activityContentDescription || baseInfo.activityContent || "No description";
        const descLines = wrapText(desc, 54);
        for (const line of descLines) {
            console.log(chalk.cyan.bold(`║`) + `  📝 ${line}`.padEnd(58) + chalk.cyan.bold(`║`));
        }
        
        // Optional fields
        if (content.activityContentAddress) {
            console.log(chalk.cyan.bold(`║`) + `  📍 ${content.activityContentAddress.slice(0, 52)}`.padEnd(58) + chalk.cyan.bold(`║`));
        }
        if (content.activityContentLink) {
            console.log(chalk.cyan.bold(`║`) + `  🔗 ${content.activityContentLink.slice(0, 52)}`.padEnd(58) + chalk.cyan.bold(`║`));
        }
        if (baseInfo.latitudeLongitude) {
            console.log(chalk.cyan.bold(`║`) + `  🗺️  ${baseInfo.latitudeLongitude}`.padEnd(58) + chalk.cyan.bold(`║`));
        }
        
        console.log(chalk.cyan.bold(`╟${"─".repeat(58)}╢`));
        
        // Token & Budget Info
        console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Token:        `) + `${tokenEmoji} ${chalk.bold(tokenSymbol)}`.padEnd(42) + chalk.cyan.bold(`║`));
        console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Total Budget: `) + `${fromWei(totalBudget, tokenDecimals)} ${tokenSymbol}`.padEnd(42) + chalk.cyan.bold(`║`));
        console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Drop Type:    `) + dropTypeText.padEnd(42) + chalk.cyan.bold(`║`));
        console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Drop Amount:  `) + dropRangeText.padEnd(42) + chalk.cyan.bold(`║`));
        
        console.log(chalk.cyan.bold(`╟${"─".repeat(58)}╢`));
        
        // Progress
        const progressBar = createProgressBar(Number(extInfo.alreadyDropNumber), Number(baseInfo.dropNumber), 20);
        console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Progress:     `) + `${progressBar} ${extInfo.alreadyDropNumber}/${baseInfo.dropNumber}`.padEnd(42) + chalk.cyan.bold(`║`));
        console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Dropped:      `) + `${fromWei(alreadyDropped, tokenDecimals)} ${tokenSymbol}`.padEnd(42) + chalk.cyan.bold(`║`));
        console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Remaining:    `) + chalk.yellow(`${dropsRemaining} drops left`.padEnd(42)) + chalk.cyan.bold(`║`));
        
        console.log(chalk.cyan.bold(`╟${"─".repeat(58)}╢`));
        
        // Timestamps
        console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Created:      `) + `📅 ${formatDateTime(createTime)} (${timeSince(createTime)})`.slice(0, 42).padEnd(42) + chalk.cyan.bold(`║`));
        console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Deadline:     `) + `📅 ${formatDateTime(deadline)}`.padEnd(42) + chalk.cyan.bold(`║`));
        
        if (status !== 2 && deadline > now) {
            console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Time Left:    `) + chalk.green(`⏳ ${timeRemaining(deadline)}`.padEnd(42)) + chalk.cyan.bold(`║`));
        }
        
        console.log(chalk.cyan.bold(`╟${"─".repeat(58)}╢`));
        
        // Status & Owner
        console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Status:       `) + statusColor(`${statusEmoji} ${statusText}`.padEnd(42)) + chalk.cyan.bold(`║`));
        const ownerText = isOwner ? `${shortenAddress(baseInfo.businessAccount)} (YOU)` : shortenAddress(baseInfo.businessAccount);
        console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Owner:        `) + `👤 ${ownerText}`.padEnd(42) + chalk.cyan.bold(`║`));
        
        // If finished, show refund and mining info
        if (status === 2) {
            console.log(chalk.cyan.bold(`╟${"─".repeat(58)}╢`));
            console.log(chalk.cyan.bold(`║`) + chalk.green.bold(`  💰 COMPLETION SUMMARY`.padEnd(58)) + chalk.cyan.bold(`║`));
            const refundAmount = totalBudget - alreadyDropped;
            console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Refunded:     `) + chalk.green(`+${fromWei(refundAmount, tokenDecimals)} ${tokenSymbol}`.padEnd(42)) + chalk.cyan.bold(`║`));
            console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Mined:        `) + chalk.green(`+${fromWei(minedAmount, 6)} FCC 🍥`.padEnd(42)) + chalk.cyan.bold(`║`));
        }
        
        // Contract info
        console.log(chalk.cyan.bold(`╟${"─".repeat(58)}╢`));
        console.log(chalk.cyan.bold(`║`) + chalk.dim(`  Token Addr:   `) + `${shortenAddress(baseInfo.tokenContractAddr)}`.padEnd(42) + chalk.cyan.bold(`║`));
        
        console.log(chalk.cyan.bold(`╟${"─".repeat(58)}╢`));
        
        // Links
        console.log(chalk.cyan.bold(`║`) + chalk.bold(`  🌐 VIEW ON WEB:`).padEnd(58) + chalk.cyan.bold(`║`));
        console.log(chalk.cyan.bold(`║`) + `     ${chalk.blue.underline(`https://fishcake.io/event?activityId=${eventId}`)}`.padEnd(67) + chalk.cyan.bold(`║`));
        console.log(chalk.cyan.bold(`║`) + chalk.bold(`  🔍 VIEW ON EXPLORER:`).padEnd(58) + chalk.cyan.bold(`║`));
        console.log(chalk.cyan.bold(`║`) + `     ${chalk.blue.underline(`https://polygonscan.com/address/${CONTRACTS.EVENT_MANAGER}`)}`.slice(0, 67).padEnd(67) + chalk.cyan.bold(`║`));
        
        console.log(chalk.cyan.bold(`╚${"═".repeat(58)}╝`));
        
        // Owner-specific actions hint
        if (isOwner && status !== 2) {
            console.log();
            console.log(chalk.yellow("💡 You own this event! Available actions:"));
            if (dropsRemaining > 0) {
                console.log(chalk.dim("   • Option 5: Drop rewards to users"));
                console.log(chalk.dim("   • Option 6: Batch drop to multiple addresses"));
            }
            console.log(chalk.dim("   • Option 4: Finish event (get refund + mining reward)"));
        }
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Failed to load event details");
        }
    }
    
    await promptContinue();
}

function wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    
    for (const word of words) {
        if (currentLine.length + word.length + 1 <= maxWidth) {
            currentLine += (currentLine ? " " : "") + word;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word.slice(0, maxWidth);
        }
    }
    if (currentLine) lines.push(currentLine);
    
    return lines.slice(0, 3); // Max 3 lines
}

function createProgressBar(current: number, total: number, width: number): string {
    const progress = total > 0 ? current / total : 0;
    const filled = Math.round(progress * width);
    const empty = width - filled;
    
    return chalk.green("█".repeat(filled)) + chalk.dim("░".repeat(empty));
}
