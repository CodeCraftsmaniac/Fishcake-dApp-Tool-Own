/**
 * CLI Display Utilities - Formatting and output
 */

import chalk from "chalk";
import boxen from "boxen";
import Table from "cli-table3";
import ora, { Ora } from "ora";
import { shortenAddress, formatNumber } from "../utils/format.js";
import { timeRemaining } from "../utils/time.js";

export function showHeader(address: string, fccBalance: string): void {
    const shortAddr = shortenAddress(address);
    
    const header = `  🐟 Fishcake CLI Tool v1.0
  ✅ ${chalk.green(shortAddr)} │ 🔗 ${chalk.cyan("Polygon")} │ 💰 ${chalk.yellow(fccBalance)} FCC`;
    
    console.log(boxen(header, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderColor: "cyan",
        borderStyle: "round",
    }));
}

export function showMainMenu(): void {
    const menu = `
${chalk.bold.magenta("⚡ QUICK ACTIONS ─────────────────────────────")}
  ${chalk.white("Q.")}  ${chalk.bold.yellow("⚡ Quick Airdrop")} ${chalk.dim("(create + drop in one)")}
  ${chalk.white("A.")}  ${chalk.yellow("📖 Address Book")}
  ${chalk.white("W.")}  ${chalk.yellow("👛 Wallet Management")}

${chalk.bold.cyan("─ EVENT MANAGEMENT ─────────────────────────")}
  ${chalk.white("1.")}  Create Event
  ${chalk.white("2.")}  My Events
  ${chalk.white("3.")}  Event Detail (by ID)
  ${chalk.white("4.")}  Finish Event

${chalk.bold.cyan("─ DROP & REWARD ────────────────────────────")}
  ${chalk.white("5.")}  Drop Reward (single address)
  ${chalk.white("6.")}  Batch Drop (CSV / multi)
  ${chalk.white("7.")}  Generate Claim QR Code
  ${chalk.white("8.")}  Drop History

${chalk.bold.cyan("─ TOKEN & NFT ──────────────────────────────")}
  ${chalk.white("9.")}  Buy FCC (USDT → FCC)
  ${chalk.white("10.")} Sell FCC (FCC → USDT)
  ${chalk.white("11.")} Mint Basic NFT (8 USDT)
  ${chalk.white("12.")} Mint Pro NFT (80 USDT)

${chalk.bold.cyan("─ ACCOUNT ──────────────────────────────────")}
  ${chalk.white("13.")} Dashboard (Balance + NFTs)
  ${chalk.white("14.")} Mining Status
  ${chalk.white("15.")} Browse Events

  ${chalk.dim("0.")}  ${chalk.dim("Exit")}
`;
    console.log(menu);
}

export function showSuccess(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
}

export function showError(message: string): void {
    console.log(chalk.red(`❌ ${message}`));
}

export function showWarning(message: string): void {
    console.log(chalk.yellow(`⚠️  ${message}`));
}

export function showInfo(message: string): void {
    console.log(chalk.cyan(`ℹ️  ${message}`));
}

export function showTxLink(hash: string): void {
    const link = `https://polygonscan.com/tx/${hash}`;
    console.log(chalk.cyan(`📜 View on Polygonscan: ${chalk.underline(link)}`));
}

export function showAddressLink(address: string): void {
    const link = `https://polygonscan.com/address/${address}`;
    console.log(chalk.cyan(`🔗 ${chalk.underline(link)}`));
}

export function createSpinner(text: string): Ora {
    return ora({
        text,
        color: "cyan",
    }).start();
}

export function showSectionTitle(title: string): void {
    console.log("\n" + chalk.bold.cyan(`═══ ${title} ═══`) + "\n");
}

export function showDivider(): void {
    console.log(chalk.dim("─".repeat(50)));
}

export function showKeyValue(key: string, value: string, indent: number = 0): void {
    const padding = " ".repeat(indent);
    console.log(`${padding}${chalk.dim(key + ":")} ${value}`);
}

export function showBalances(fcc: string, usdt: string, pol: string): void {
    console.log(boxen(
        `${chalk.cyan("FCC:")}  ${chalk.yellow(fcc)}
${chalk.cyan("USDT:")} ${chalk.green(usdt)}
${chalk.cyan("POL:")}  ${chalk.white(pol)}`,
        {
            title: "💰 Balances",
            padding: { top: 0, bottom: 0, left: 1, right: 1 },
            borderColor: "cyan",
        }
    ));
}

export function createTable(headers: string[]): Table.Table {
    return new Table({
        head: headers.map(h => chalk.cyan(h)),
        style: {
            head: [],
            border: [],
        },
    });
}

export function showEventsTable(events: Array<{
    id: number;
    name: string;
    token: string;
    drops: string;
    status: string;
    timeLeft: string;
}>): void {
    const table = createTable(["ID", "Name", "Token", "Drops", "Status", "Time Left"]);
    
    for (const event of events) {
        const statusColor = event.status === "Active" ? chalk.green : 
                           event.status === "Expired" ? chalk.yellow : chalk.dim;
        
        table.push([
            chalk.white(`#${event.id}`),
            event.name.slice(0, 20),
            event.token,
            event.drops,
            statusColor(event.status),
            event.timeLeft,
        ]);
    }
    
    console.log(table.toString());
}

export function showDropHistoryTable(records: Array<{
    date: string;
    event: string;
    amount: string;
    token: string;
    type: "received" | "sent";
}>): void {
    const table = createTable(["Date", "Event", "Amount", "Token"]);
    
    for (const record of records) {
        const amountColor = record.type === "received" ? chalk.green : chalk.red;
        const prefix = record.type === "received" ? "+" : "-";
        
        table.push([
            record.date,
            record.event.slice(0, 20),
            amountColor(`${prefix}${record.amount}`),
            record.token,
        ]);
    }
    
    console.log(table.toString());
}

export function showBatchDropResults(results: Array<{
    address: string;
    status: "SUCCESS" | "SKIPPED" | "FAILED";
    amount?: string;
    reason?: string;
}>): void {
    const table = createTable(["Address", "Status", "Amount", "Reason"]);
    
    for (const result of results) {
        const statusColor = result.status === "SUCCESS" ? chalk.green :
                           result.status === "SKIPPED" ? chalk.yellow : chalk.red;
        
        table.push([
            shortenAddress(result.address),
            statusColor(result.status),
            result.amount || "-",
            result.reason || "-",
        ]);
    }
    
    console.log(table.toString());
}

export function showEventDetail(event: {
    id: number;
    name: string;
    description: string;
    address?: string;
    link?: string;
    location?: string;
    token: string;
    dropType: string;
    dropRange: string;
    totalBudget: string;
    dropsExecuted: string;
    amountDropped: string;
    deadline: string;
    status: string;
    owner: string;
    isOwner: boolean;
    refunded?: string;
    mined?: string;
}): void {
    console.log(boxen(
        `${chalk.bold.white(event.name)} ${chalk.dim(`#${event.id}`)}
${chalk.dim("─".repeat(40))}
${chalk.dim("Description:")} ${event.description.slice(0, 60)}${event.description.length > 60 ? "..." : ""}
${event.address ? `${chalk.dim("Address:")} ${event.address}\n` : ""}${event.link ? `${chalk.dim("Link:")} ${event.link}\n` : ""}${event.location ? `${chalk.dim("Location:")} ${event.location}` : ""}
${chalk.dim("─".repeat(40))}
${chalk.dim("Token:")}        ${chalk.yellow(event.token)}
${chalk.dim("Drop Type:")}    ${event.dropType}
${chalk.dim("Drop Range:")}   ${event.dropRange}
${chalk.dim("Total Budget:")} ${event.totalBudget}
${chalk.dim("Drops:")}        ${event.dropsExecuted}
${chalk.dim("Dropped:")}      ${event.amountDropped}
${chalk.dim("Deadline:")}     ${event.deadline}
${chalk.dim("Status:")}       ${event.status === "Active" ? chalk.green(event.status) : 
                              event.status === "Expired" ? chalk.yellow(event.status) : 
                              chalk.dim(event.status)}
${chalk.dim("Owner:")}        ${shortenAddress(event.owner)}
${event.isOwner ? `${chalk.dim("─".repeat(40))}
${chalk.cyan("Merchant Tracker")}
${event.refunded ? `${chalk.dim("Refunded:")}     ${chalk.green("+" + event.refunded)}` : ""}
${event.mined ? `${chalk.dim("Mined:")}        ${chalk.green("+" + event.mined)}` : ""}` : ""}`,
        {
            padding: { top: 0, bottom: 0, left: 1, right: 1 },
            borderColor: "cyan",
        }
    ));
}

export function clearScreen(): void {
    console.clear();
}

export function newLine(count: number = 1): void {
    for (let i = 0; i < count; i++) {
        console.log();
    }
}

export function showWelcome(): void {
    console.log(boxen(
        chalk.cyan.bold("🐟 Welcome to Fishcake CLI Tool") + "\n" +
        chalk.dim("Terminal interface for fishcake.io on Polygon"),
        {
            padding: 1,
            borderColor: "cyan",
            borderStyle: "round",
        }
    ));
}

export function showGoodbye(): void {
    console.log(chalk.cyan("\n👋 Goodbye! Stay fishy! 🐟\n"));
}

export function showProgressBar(current: number, total: number, width: number = 30): string {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    
    const bar = chalk.green("█".repeat(filled)) + chalk.dim("░".repeat(empty));
    return `[${bar}] ${percentage}% (${current}/${total})`;
}
