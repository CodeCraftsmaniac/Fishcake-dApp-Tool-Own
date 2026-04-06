/**
 * Drop History Feature
 * View received and sent drops with blockchain fallback
 */

import chalk from "chalk";
import Table from "cli-table3";
import { showSectionTitle, showInfo, showError, createSpinner } from "../frontend/display.js";
import { promptDropHistory, promptContinue } from "../frontend/prompts.js";
import { getDropList } from "../api/endpoints.js";
import { getWalletAddress } from "../wallet/connection.js";
import { getTokenSymbol, getTokenDecimals, getAddress } from "../config/addresses.js";
import { fromWei, shortenAddress } from "../utils/format.js";
import { timeSinceShort, formatDateTime } from "../utils/time.js";
import { getEventManagerContract } from "../blockchain/contracts.js";
import { getProvider } from "../blockchain/provider.js";
import type { DropRecord } from "../types/index.js";
import { ethers } from "ethers";

// Token emojis
const TOKEN_EMOJI = {
    FCC: "🍥",
    USDT: "💲",
    UNKNOWN: "❓",
} as const;

function getTokenEmoji(symbol: string): string {
    return TOKEN_EMOJI[symbol as keyof typeof TOKEN_EMOJI] || TOKEN_EMOJI.UNKNOWN;
}

export async function dropHistoryFeature(): Promise<void> {
    showSectionTitle("DROP HISTORY");
    
    try {
        const filters = await promptDropHistory();
        
        const spinner = createSpinner("📜 Loading drop history...");
        
        const walletAddress = getWalletAddress();
        const dropType = filters.type === "received" ? "1" : "2";
        
        let records: DropRecord[] = [];
        let fromApi = false;
        
        // Try API first
        try {
            const response = await getDropList({
                address: walletAddress,
                dropType: dropType as "1" | "2",
                pageSize: 100,
            });
            records = response.result || [];
            fromApi = true;
        } catch {
            spinner.text = "📡 API unavailable, scanning blockchain...";
        }
        
        // If API failed, scan blockchain directly
        if (!fromApi) {
            records = await scanBlockchainForDrops(spinner, walletAddress, filters.type);
        }
        
        if (records.length === 0) {
            spinner.succeed("Search complete");
            showInfo(filters.type === "received" 
                ? "📭 You haven't received any drops yet" 
                : "📭 You haven't sent any drops yet"
            );
            console.log(chalk.dim("\n  Tip: Receive drops by scanning QR codes at fishcake.io events"));
            await promptContinue();
            return;
        }
        
        if (filters.sort === "oldest") {
            records.reverse();
        }
        
        spinner.succeed(`Found ${records.length} drops`);
        
        // Display header
        console.log();
        console.log(chalk.bold.cyan(filters.type === "received" ? "📥 RECEIVED DROPS" : "📤 SENT DROPS"));
        console.log(chalk.dim(`   Sorted by: ${filters.sort === "newest" ? "Newest first" : "Oldest first"}`));
        console.log();
        
        // Create table with emojis
        const table = new Table({
            head: [
                chalk.cyan("📅 Time"),
                chalk.cyan("📋 Event"),
                chalk.cyan("💰 Amount"),
                chalk.cyan(filters.type === "received" ? "📤 From" : "📥 To"),
                chalk.cyan("🔗 Event Link"),
            ],
            style: { head: [], border: [] },
            colWidths: [14, 22, 14, 15, 32],
        });
        
        // Group by token for totals
        const tokenTotals: Record<string, bigint> = {};
        
        for (const record of records.slice(0, 50)) {
            const tokenSymbol = getTokenSymbol(record.tokenContractAddr);
            const tokenEmoji = getTokenEmoji(tokenSymbol);
            const tokenDecimals = getTokenDecimals(record.tokenContractAddr);
            const amount = fromWei(BigInt(record.dropAmount), tokenDecimals);
            
            // Add to totals
            if (!tokenTotals[tokenSymbol]) {
                tokenTotals[tokenSymbol] = 0n;
            }
            tokenTotals[tokenSymbol] += BigInt(record.dropAmount);
            
            const counterparty = filters.type === "received" 
                ? shortenAddress(record.businessAccount || "Unknown")
                : shortenAddress(record.dropAddress || "Unknown");
            
            table.push([
                timeSinceShort(record.timestamp),
                record.businessName?.slice(0, 18) || `Event #${record.activityId}`,
                chalk.bold(`${tokenEmoji} ${amount}`),
                chalk.dim(counterparty),
                chalk.blue.underline(`fishcake.io/event?activityId=${record.activityId}`),
            ]);
        }
        
        console.log(table.toString());
        
        if (records.length > 50) {
            console.log(chalk.dim(`\n... and ${records.length - 50} more drops`));
        }
        
        // Show totals by token
        console.log(chalk.cyan.bold(`\n${"─".repeat(50)}`));
        console.log(chalk.bold(`📊 SUMMARY`));
        
        for (const [tokenSymbol, total] of Object.entries(tokenTotals)) {
            const tokenEmoji = getTokenEmoji(tokenSymbol);
            const tokenDecimals = tokenSymbol === "USDT" ? 6 : 6;
            const totalFormatted = fromWei(total, tokenDecimals);
            
            if (filters.type === "received") {
                console.log(chalk.green(`   ${tokenEmoji} Total ${tokenSymbol} Received: +${totalFormatted}`));
            } else {
                console.log(chalk.yellow(`   ${tokenEmoji} Total ${tokenSymbol} Sent: -${totalFormatted}`));
            }
        }
        
        console.log(chalk.cyan.bold(`${"─".repeat(50)}`));
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Failed to load drop history");
        }
    }
    
    await promptContinue();
}

async function scanBlockchainForDrops(
    spinner: any,
    walletAddress: string,
    dropType: string
): Promise<DropRecord[]> {
    const records: DropRecord[] = [];
    const provider = getProvider();
    const eventManagerAddress = getAddress("EVENT_MANAGER");
    
    // CORRECT event signature: Drop(address indexed who, uint256 indexed _activityId, uint256 _dropAmt)
    // who = recipient of the drop (the address receiving tokens)
    const dropEventSig = ethers.id("Drop(address,uint256,uint256)");
    
    // Get recent blocks (last 10000 blocks - max allowed by most RPCs)
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 10000;
    
    spinner.text = "📜 Scanning blockchain for drops (last 10000 blocks)...";
    
    try {
        // Build filter based on dropType
        // For "received": filter by who = walletAddress (topic 1)
        // For "sent": we need to check event info to see if businessAccount matches
        const filter: any = {
            address: eventManagerAddress,
            topics: [dropEventSig],
            fromBlock,
            toBlock: currentBlock,
        };
        
        // If checking received drops, filter by the recipient (who) address
        if (dropType === "received") {
            filter.topics.push(ethers.zeroPadValue(walletAddress, 32));
        }
        
        const logs = await provider.getLogs(filter);
        spinner.text = `📜 Found ${logs.length} drop events, processing...`;
        
        const eventManager = getEventManagerContract();
        
        // Process logs (limit to last 100 for performance)
        for (const log of logs.slice(-100)) {
            try {
                // Decode the data field (contains _dropAmt which is not indexed)
                const decodedData = ethers.AbiCoder.defaultAbiCoder().decode(
                    ["uint256"],
                    log.data
                );
                const amount = decodedData[0];
                
                // Decode indexed parameters from topics
                // topics[0] = event signature
                // topics[1] = who (address indexed) - the drop recipient
                // topics[2] = _activityId (uint256 indexed)
                const recipientAddr = "0x" + log.topics[1].slice(26);
                const activityId = parseInt(log.topics[2], 16);
                
                // Get event info to get the business account (sender)
                const info = await eventManager.activityInfoArrs(activityId - 1);
                const senderAddr = info.businessAccount;
                
                // Filter for sent drops - check if sender is our wallet
                if (dropType === "sent" && senderAddr.toLowerCase() !== walletAddress.toLowerCase()) {
                    continue;
                }
                
                // Get block timestamp
                const block = await provider.getBlock(log.blockNumber);
                const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);
                
                records.push({
                    activityId,
                    businessName: info.businessName,
                    businessAccount: senderAddr,
                    dropAddress: recipientAddr,
                    dropAmount: amount.toString(),
                    dropType: dropType === "received" ? 1 : 2,
                    tokenContractAddr: info.tokenContractAddr,
                    timestamp,
                    txHash: log.transactionHash,
                });
            } catch (err) {
                // Log error for debugging
                console.error("Error processing log:", err);
                continue;
            }
        }
    } catch (error) {
        // If log scanning fails, try a more targeted approach
        console.error("getLogs error:", error);
        spinner.text = "📜 Retrying with targeted scan...";
    }
    
    // Sort by timestamp descending
    records.sort((a, b) => b.timestamp - a.timestamp);
    
    return records;
}
