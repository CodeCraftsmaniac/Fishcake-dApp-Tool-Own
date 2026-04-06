/**
 * Dashboard Feature
 * Shows balances, NFTs, and mining status
 */

import chalk from "chalk";
import boxen from "boxen";
import Table from "cli-table3";
import { showSectionTitle, showBalances, showError, createSpinner, showInfo } from "../frontend/display.js";
import { promptContinue } from "../frontend/prompts.js";
import { getBalances, getWalletAddress, formatFCC, formatUSDT, formatPOL, shortenAddress } from "../wallet/connection.js";
import { getNFTManagerContract } from "../blockchain/contracts.js";
import { getNFTList, getUserMiningInfo, getChainBalance } from "../api/endpoints.js";
import { fromWei, formatNumber } from "../utils/format.js";
import { formatDateTime, nowUnix, timeRemaining, daysUntil } from "../utils/time.js";
import { TOKEN_DECIMALS, MINING_TIERS } from "../config/addresses.js";

export async function dashboardFeature(): Promise<void> {
    showSectionTitle("DASHBOARD");
    
    const spinner = createSpinner("Loading dashboard...");
    
    try {
        const walletAddress = getWalletAddress();
        const balances = await getBalances();
        
        spinner.text = "Loading NFT status...";
        
        const nftManager = getNFTManagerContract();
        const [proDeadline, basicDeadline] = await Promise.all([
            nftManager.getMerchantNTFDeadline(walletAddress).catch(() => 0n),
            nftManager.getUserNTFDeadline(walletAddress).catch(() => 0n),
        ]);
        
        const now = nowUnix();
        const proActive = Number(proDeadline) > now;
        const basicActive = Number(basicDeadline) > now;
        
        spinner.succeed("Dashboard loaded");
        
        console.log(boxen(
            `${chalk.bold("Wallet:")} ${walletAddress}\n` +
            `${chalk.bold("Network:")} Polygon Mainnet (137)`,
            { padding: { top: 0, bottom: 0, left: 1, right: 1 }, borderColor: "cyan" }
        ));
        
        console.log("\n💰 " + chalk.bold.cyan("BALANCES"));
        const balanceTable = new Table({
            head: [chalk.cyan("Token"), chalk.cyan("Balance"), chalk.cyan("Decimals")],
            style: { head: [], border: [] },
        });
        
        balanceTable.push(
            ["FCC", chalk.yellow(formatFCC(balances.fcc)), "6"],
            ["USDT", chalk.green(formatUSDT(balances.usdt)), "6"],
            ["POL", chalk.white(formatPOL(balances.pol)), "18"],
        );
        console.log(balanceTable.toString());
        
        console.log("\n🎫 " + chalk.bold.cyan("NFT STATUS"));
        const nftTable = new Table({
            head: [chalk.cyan("Type"), chalk.cyan("Status"), chalk.cyan("Expires"), chalk.cyan("Mining Rate")],
            style: { head: [], border: [] },
        });
        
        nftTable.push([
            "Pro NFT",
            proActive ? chalk.green("Active ✓") : chalk.dim("Inactive"),
            proActive ? timeRemaining(Number(proDeadline)) : "—",
            proActive ? chalk.green("50%") : chalk.dim("0%"),
        ]);
        
        nftTable.push([
            "Basic NFT",
            basicActive ? chalk.green("Active ✓") : chalk.dim("Inactive"),
            basicActive ? timeRemaining(Number(basicDeadline)) : "—",
            basicActive ? chalk.yellow("25%") : chalk.dim("0%"),
        ]);
        
        console.log(nftTable.toString());
        
        let miningRate = 0;
        if (proActive) {
            miningRate = 50;
        } else if (basicActive) {
            miningRate = 25;
        }
        
        console.log("\n⛏️ " + chalk.bold.cyan("MINING STATUS"));
        if (miningRate === 0) {
            console.log(chalk.yellow("  ⚠️  No active NFT - Mining disabled"));
            console.log(chalk.dim("  Mint a Basic (8 USDT) or Pro (80 USDT) NFT to enable mining"));
        } else {
            console.log(chalk.green(`  ✓ Mining enabled at ${miningRate}% rate`));
            console.log(chalk.dim(`  Your mining rewards are calculated when you finish events`));
        }
        
    } catch (error) {
        spinner.fail("Failed to load dashboard");
        if (error instanceof Error) {
            showError(error.message);
        }
    }
    
    await promptContinue();
}

export async function miningStatusFeature(): Promise<void> {
    showSectionTitle("MINING STATUS");
    
    const spinner = createSpinner("Loading mining info...");
    
    try {
        const walletAddress = getWalletAddress();
        
        const nftManager = getNFTManagerContract();
        const [proDeadline, basicDeadline] = await Promise.all([
            nftManager.getMerchantNTFDeadline(walletAddress).catch(() => 0n),
            nftManager.getUserNTFDeadline(walletAddress).catch(() => 0n),
        ]);
        
        const now = nowUnix();
        const proActive = Number(proDeadline) > now;
        const basicActive = Number(basicDeadline) > now;
        
        spinner.succeed("Mining info loaded");
        
        console.log(chalk.bold.cyan("\n⛏️ MINING REWARD SYSTEM\n"));
        
        console.log("Mining rewards are earned when you finish events as a merchant.");
        console.log("The reward depends on your NFT type and the current mining tier.\n");
        
        const tierTable = new Table({
            head: [
                chalk.cyan("Tier"),
                chalk.cyan("Total Mined"),
                chalk.cyan("Pro Rate"),
                chalk.cyan("Basic Rate"),
                chalk.cyan("Max/Event"),
            ],
            style: { head: [], border: [] },
        });
        
        for (let i = 0; i < MINING_TIERS.length; i++) {
            const tier = MINING_TIERS[i];
            const prevMax = i > 0 ? MINING_TIERS[i - 1].maxMined : 0;
            tierTable.push([
                `Tier ${i + 1}`,
                `${formatNumber(prevMax / 1_000_000)}M - ${formatNumber(tier.maxMined / 1_000_000)}M`,
                `${tier.proPercent}%`,
                `${tier.basicPercent}%`,
                `${tier.maxPerEvent} FCC`,
            ]);
        }
        
        tierTable.push([
            "Tier 5",
            "> 300M",
            chalk.dim("0%"),
            chalk.dim("0%"),
            chalk.dim("Mining stops"),
        ]);
        
        console.log(tierTable.toString());
        
        console.log(chalk.bold.cyan("\n📊 YOUR STATUS\n"));
        
        if (proActive) {
            console.log(chalk.green("✓ Pro NFT Active"));
            console.log(`  Expires: ${formatDateTime(Number(proDeadline))} (${daysUntil(Number(proDeadline))} days)`);
            console.log(chalk.green(`  Mining Rate: 50% (full rate)`));
        } else if (basicActive) {
            console.log(chalk.yellow("✓ Basic NFT Active"));
            console.log(`  Expires: ${formatDateTime(Number(basicDeadline))} (${daysUntil(Number(basicDeadline))} days)`);
            console.log(chalk.yellow(`  Mining Rate: 25% (half rate)`));
            console.log(chalk.dim("  Upgrade to Pro NFT for 50% mining rate!"));
        } else {
            console.log(chalk.red("✗ No Active NFT"));
            console.log(chalk.dim("  Mining is disabled. Get an NFT to start earning!"));
            console.log(chalk.dim("  • Basic NFT: 8 USDT (25% mining rate)"));
            console.log(chalk.dim("  • Pro NFT: 80 USDT (50% mining rate)"));
        }
        
        console.log(chalk.bold.cyan("\n📖 HOW MINING WORKS\n"));
        console.log("1. Create an event with FCC or USDT tokens");
        console.log("2. Drop rewards to users");
        console.log("3. When you finish the event:");
        console.log("   • Unused tokens are refunded to your wallet");
        console.log("   • Mining reward is calculated: droppedAmount × miningRate%");
        console.log("   • Mining reward (in FCC) is sent to your wallet");
        console.log("\n" + chalk.dim("Note: Maximum mining reward per event depends on current tier"));
        
    } catch (error) {
        spinner.fail("Failed to load mining info");
        if (error instanceof Error) {
            showError(error.message);
        }
    }
    
    await promptContinue();
}
