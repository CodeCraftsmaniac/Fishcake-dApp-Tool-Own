/**
 * Redemption Pool Info Feature
 * Display redemption pool status and countdown
 */

import chalk from "chalk";
import boxen from "boxen";
import { showSectionTitle, showError, showInfo, createSpinner } from "../frontend/display.js";
import { promptContinue } from "../frontend/prompts.js";
import { getRedemptionPoolContract } from "../blockchain/contracts.js";
import { fromWei, formatNumber } from "../utils/format.js";
import { formatDateTime, nowUnix, timeRemainingLong } from "../utils/time.js";
import { TOKEN_DECIMALS } from "../config/addresses.js";

export async function redemptionInfoFeature(): Promise<void> {
    showSectionTitle("REDEMPTION POOL INFO");
    
    const spinner = createSpinner("Loading redemption pool info...");
    
    try {
        const redemptionPool = getRedemptionPoolContract();
        
        let startTime: bigint;
        try {
            startTime = await redemptionPool.redemptionStartTime();
        } catch {
            startTime = 0n;
        }
        
        let poolInfo = {
            totalFccBurned: 0n,
            totalUsdtRedeemed: 0n,
            currentFccBalance: 0n,
            currentUsdtBalance: 0n,
        };
        
        try {
            const info = await redemptionPool.getPoolInfo();
            poolInfo = {
                totalFccBurned: BigInt(info.totalFccBurned || 0),
                totalUsdtRedeemed: BigInt(info.totalUsdtRedeemed || 0),
                currentFccBalance: BigInt(info.currentFccBalance || 0),
                currentUsdtBalance: BigInt(info.currentUsdtBalance || 0),
            };
        } catch {
            spinner.text = "Pool info not available, showing basic info...";
        }
        
        spinner.succeed("Redemption pool info loaded");
        
        const now = nowUnix();
        const startTimeNum = Number(startTime);
        const isOpen = startTimeNum > 0 && startTimeNum <= now;
        const notYetOpen = startTimeNum > now;
        
        console.log(boxen(
            chalk.bold.cyan("🔥 REDEMPTION POOL\n\n") +
            chalk.dim("The Redemption Pool allows FCC holders to burn their tokens\n") +
            chalk.dim("in exchange for USDT at a fixed rate once the pool opens."),
            { padding: 1, borderColor: "cyan" }
        ));
        
        console.log(chalk.bold.cyan("\n📊 POOL STATUS\n"));
        
        if (isOpen) {
            console.log(chalk.green("✓ REDEMPTION IS OPEN"));
            console.log(`  Opened: ${formatDateTime(startTimeNum)}`);
        } else if (notYetOpen) {
            console.log(chalk.yellow("⏳ REDEMPTION NOT YET OPEN"));
            console.log(`  Opens: ${formatDateTime(startTimeNum)}`);
            console.log(`  Time remaining: ${timeRemainingLong(startTimeNum)}`);
        } else {
            console.log(chalk.dim("ℹ️ Redemption timing not set"));
        }
        
        console.log(chalk.bold.cyan("\n📈 POOL STATISTICS\n"));
        
        console.log(`  FCC Burned:      ${formatNumber(parseFloat(fromWei(poolInfo.totalFccBurned, TOKEN_DECIMALS.FCC)), 2)} FCC`);
        console.log(`  USDT Redeemed:   ${formatNumber(parseFloat(fromWei(poolInfo.totalUsdtRedeemed, TOKEN_DECIMALS.USDT)), 2)} USDT`);
        console.log(`  FCC in Pool:     ${formatNumber(parseFloat(fromWei(poolInfo.currentFccBalance, TOKEN_DECIMALS.FCC)), 2)} FCC`);
        console.log(`  USDT in Pool:    ${formatNumber(parseFloat(fromWei(poolInfo.currentUsdtBalance, TOKEN_DECIMALS.USDT)), 2)} USDT`);
        
        console.log(chalk.bold.cyan("\n📖 HOW IT WORKS\n"));
        console.log("1. Wait for the redemption pool to open");
        console.log("2. Approve your FCC tokens for the Redemption Pool contract");
        console.log("3. Call redeem() with the amount of FCC to burn");
        console.log("4. Receive USDT in exchange (rate is fixed by the pool)");
        console.log("\n" + chalk.yellow("⚠️  Burned FCC tokens are permanently destroyed!"));
        
    } catch (error) {
        spinner.fail("Failed to load redemption info");
        if (error instanceof Error) {
            showError(error.message);
        }
    }
    
    await promptContinue();
}
