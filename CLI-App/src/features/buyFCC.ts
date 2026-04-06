/**
 * Buy/Sell FCC Feature
 * Token swap through DirectSalePool or InvestorSalePool
 */

import chalk from "chalk";
import { showSectionTitle, showSuccess, showError, showInfo, createSpinner, showTxLink } from "../frontend/display.js";
import { promptBuyFCC, promptConfirm, promptContinue } from "../frontend/prompts.js";
import { toWei, fromWei, formatNumber } from "../utils/format.js";
import { getAddress, SALE_POOL_THRESHOLDS, TOKEN_DECIMALS } from "../config/addresses.js";
import { getDirectSalePoolContract, getInvestorSalePoolContract, getTokenContract } from "../blockchain/contracts.js";
import { approveSalePool, approveIfNeeded } from "../blockchain/approval.js";
import { getWalletAddress, getUSDTBalance, getFCCBalance } from "../wallet/connection.js";

const TIER_INFO = `
┌─────────────────────────────────────────────────┐
│              FCC PRICING TIERS                  │
├─────────────────────────────────────────────────┤
│  DirectSalePool (< 1000 USDT / < 16,666 FCC)    │
│    • Standard rate: 1 FCC = 0.06 USDT           │
├─────────────────────────────────────────────────┤
│  InvestorSalePool (≥ 1000 USDT / ≥ 16,666 FCC)  │
│    • Tier 1: 0 - 30M FCC mined      → 0.055     │
│    • Tier 2: 30M - 100M FCC mined   → 0.050     │
│    • Tier 3: 100M - 200M FCC mined  → 0.045     │
│    • Tier 4: 200M - 300M FCC mined  → 0.040     │
│    • Tier 5: 300M+ FCC mined        → 0.035     │
└─────────────────────────────────────────────────┘
`;

export async function buyFCCFeature(): Promise<void> {
    showSectionTitle("BUY FCC (USDT → FCC)");
    
    console.log(chalk.cyan(TIER_INFO));
    
    try {
        const { direction, amount } = await promptBuyFCC();
        
        if (direction !== "usdt-to-fcc") {
            showInfo("For selling FCC, please use option 10 (Sell FCC)");
            await promptContinue();
            return;
        }
        
        const spinner = createSpinner("Calculating...");
        
        const useInvestorPool = amount >= SALE_POOL_THRESHOLDS.USDT_THRESHOLD;
        const poolName = useInvestorPool ? "InvestorSalePool" : "DirectSalePool";
        const pool = useInvestorPool ? getInvestorSalePoolContract() : getDirectSalePoolContract();
        const poolAddress = useInvestorPool ? getAddress("INVESTOR_SALE_POOL") : getAddress("DIRECT_SALE_POOL");
        
        const usdtAmount = toWei(amount, TOKEN_DECIMALS.USDT);
        
        let estimatedFCC: bigint;
        try {
            estimatedFCC = await pool.calculateFccByUsdtExternal(usdtAmount);
        } catch {
            estimatedFCC = BigInt(Math.floor(amount / 0.06 * 1_000_000));
        }
        
        const usdtBalance = await getUSDTBalance();
        if (usdtBalance < usdtAmount) {
            spinner.fail("Insufficient balance");
            showError(`You need ${amount} USDT but only have ${fromWei(usdtBalance, TOKEN_DECIMALS.USDT)} USDT`);
            await promptContinue();
            return;
        }
        
        spinner.succeed("Quote ready");
        
        console.log("\n📊 Swap Details:");
        console.log(`   Pool: ${poolName}`);
        console.log(`   You Pay: ${formatNumber(amount, 2)} USDT`);
        console.log(`   You Receive: ~${fromWei(estimatedFCC, TOKEN_DECIMALS.FCC)} FCC`);
        console.log(`   Rate: ~${formatNumber(amount / parseFloat(fromWei(estimatedFCC, TOKEN_DECIMALS.FCC)), 4)} USDT/FCC`);
        
        const confirmed = await promptConfirm("\nProceed with swap?");
        if (!confirmed) {
            showInfo("Swap cancelled");
            await promptContinue();
            return;
        }
        
        const approvalSpinner = createSpinner("Checking USDT allowance...");
        
        const usdtAddress = getAddress("USDT_TOKEN");
        const approvalResult = await approveIfNeeded(usdtAddress, poolAddress, usdtAmount);
        
        if (approvalResult.needed) {
            approvalSpinner.text = "Approving USDT...";
            if (!approvalResult.result?.success) {
                approvalSpinner.fail("Approval failed");
                showError(approvalResult.result?.error || "USDT approval failed");
                await promptContinue();
                return;
            }
            approvalSpinner.succeed("USDT approved");
            showTxLink(approvalResult.result.hash!);
        } else {
            approvalSpinner.succeed("USDT allowance sufficient");
        }
        
        const swapSpinner = createSpinner("Executing swap...");
        
        const poolSigned = useInvestorPool 
            ? getInvestorSalePoolContract(true) 
            : getDirectSalePoolContract(true);
        
        const tx = await poolSigned.buyFccByUsdtAmount(usdtAmount);
        
        swapSpinner.text = "Waiting for confirmation...";
        const receipt = await tx.wait();
        
        if (receipt.status !== 1) {
            swapSpinner.fail("Swap failed");
            showError("Transaction reverted");
            await promptContinue();
            return;
        }
        
        swapSpinner.succeed("Swap successful!");
        
        console.log(chalk.green(`\n✅ Swapped ${formatNumber(amount, 2)} USDT → ~${fromWei(estimatedFCC, TOKEN_DECIMALS.FCC)} FCC`));
        showTxLink(receipt.hash);
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Failed to execute swap");
        }
    }
    
    await promptContinue();
}

export async function sellFCCFeature(): Promise<void> {
    showSectionTitle("SELL FCC (FCC → USDT)");
    
    console.log(chalk.cyan(TIER_INFO));
    
    try {
        const spinner = createSpinner("Enter amount...");
        spinner.stop();
        
        const { direction, amount } = await promptBuyFCC();
        
        if (direction !== "fcc-to-usdt") {
            showInfo("For buying FCC, please use option 9 (Buy FCC)");
            await promptContinue();
            return;
        }
        
        const calcSpinner = createSpinner("Calculating...");
        
        const useInvestorPool = amount >= SALE_POOL_THRESHOLDS.FCC_THRESHOLD;
        const poolName = useInvestorPool ? "InvestorSalePool" : "DirectSalePool";
        const pool = useInvestorPool ? getInvestorSalePoolContract() : getDirectSalePoolContract();
        const poolAddress = useInvestorPool ? getAddress("INVESTOR_SALE_POOL") : getAddress("DIRECT_SALE_POOL");
        
        const fccAmount = toWei(amount, TOKEN_DECIMALS.FCC);
        
        let estimatedUSDT: bigint;
        try {
            estimatedUSDT = await pool.calculateUsdtByFccExternal(fccAmount);
        } catch {
            estimatedUSDT = BigInt(Math.floor(amount * 0.06 * 1_000_000));
        }
        
        const fccBalance = await getFCCBalance();
        if (fccBalance < fccAmount) {
            calcSpinner.fail("Insufficient balance");
            showError(`You need ${amount} FCC but only have ${fromWei(fccBalance, TOKEN_DECIMALS.FCC)} FCC`);
            await promptContinue();
            return;
        }
        
        calcSpinner.succeed("Quote ready");
        
        console.log("\n📊 Swap Details:");
        console.log(`   Pool: ${poolName}`);
        console.log(`   You Pay: ${formatNumber(amount, 2)} FCC`);
        console.log(`   You Receive: ~${fromWei(estimatedUSDT, TOKEN_DECIMALS.USDT)} USDT`);
        console.log(`   Rate: ~${formatNumber(parseFloat(fromWei(estimatedUSDT, TOKEN_DECIMALS.USDT)) / amount, 4)} USDT/FCC`);
        
        const confirmed = await promptConfirm("\nProceed with swap?");
        if (!confirmed) {
            showInfo("Swap cancelled");
            await promptContinue();
            return;
        }
        
        const approvalSpinner = createSpinner("Checking FCC allowance...");
        
        const fccAddress = getAddress("FCC_TOKEN");
        const approvalResult = await approveIfNeeded(fccAddress, poolAddress, fccAmount);
        
        if (approvalResult.needed) {
            approvalSpinner.text = "Approving FCC...";
            if (!approvalResult.result?.success) {
                approvalSpinner.fail("Approval failed");
                showError(approvalResult.result?.error || "FCC approval failed");
                await promptContinue();
                return;
            }
            approvalSpinner.succeed("FCC approved");
            showTxLink(approvalResult.result.hash!);
        } else {
            approvalSpinner.succeed("FCC allowance sufficient");
        }
        
        const swapSpinner = createSpinner("Executing swap...");
        
        const poolSigned = useInvestorPool 
            ? getInvestorSalePoolContract(true) 
            : getDirectSalePoolContract(true);
        
        const tx = await poolSigned.buyFccAmount(fccAmount);
        
        swapSpinner.text = "Waiting for confirmation...";
        const receipt = await tx.wait();
        
        if (receipt.status !== 1) {
            swapSpinner.fail("Swap failed");
            showError("Transaction reverted");
            await promptContinue();
            return;
        }
        
        swapSpinner.succeed("Swap successful!");
        
        console.log(chalk.green(`\n✅ Swapped ${formatNumber(amount, 2)} FCC → ~${fromWei(estimatedUSDT, TOKEN_DECIMALS.USDT)} USDT`));
        showTxLink(receipt.hash);
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Failed to execute swap");
        }
    }
    
    await promptContinue();
}
