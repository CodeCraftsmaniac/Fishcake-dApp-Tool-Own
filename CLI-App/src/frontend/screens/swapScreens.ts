/**
 * Swap Screens - UI layer for FCC buy/sell
 * ONLY UI CODE - Calls SwapService for business logic
 */

import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import {
    getBuyQuote,
    getSellQuote,
    checkSwapBalance,
    buyFCC,
    sellFCC,
    FCC_PRICE_USDT,
    type SwapQuote,
} from "../../services/index.js";
import {
    showSectionTitle,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    createSpinner,
    showTxLink,
} from "../display.js";
import { promptConfirm, promptContinue } from "../prompts.js";

/**
 * Display swap quote
 */
function displayQuote(quote: SwapQuote): void {
    const inputEmoji = quote.inputToken === "FCC" ? "🍥" : "💲";
    const outputEmoji = quote.outputToken === "FCC" ? "🍥" : "💲";
    
    console.log();
    console.log(chalk.cyan("╭────────────────────────────────────────────────╮"));
    console.log(chalk.cyan("│") + chalk.white.bold("  📊 Swap Quote"));
    console.log(chalk.cyan("├────────────────────────────────────────────────┤"));
    console.log(chalk.cyan("│") + chalk.white(`  ${inputEmoji} Input:  ${quote.inputAmount.toFixed(2)} ${quote.inputToken}`));
    console.log(chalk.cyan("│") + chalk.white(`  ${outputEmoji} Output: ${quote.outputAmount.toFixed(2)} ${quote.outputToken}`));
    console.log(chalk.cyan("│") + chalk.white(`  💱 Rate: 1 FCC = $${quote.pricePerFCC.toFixed(4)}`));
    console.log(chalk.cyan("│") + chalk.white(`  🏊 Pool: ${quote.pool === "investor" ? "Investor" : quote.pool === "direct" ? "Direct" : "Redemption"}`));
    console.log(chalk.cyan("╰────────────────────────────────────────────────╯"));
    console.log();
}

/**
 * Screen: Buy FCC with USDT
 */
export async function buyFCCScreen(): Promise<void> {
    showSectionTitle("💰 Buy FCC");

    console.log(chalk.cyan("\n📈 Current FCC Price: $") + chalk.green(FCC_PRICE_USDT.toFixed(4)));
    console.log(chalk.gray("(Rate: 1 USDT = ~16.67 FCC)\n"));

    const { inputType } = await inquirer.prompt([
        {
            type: "list",
            name: "inputType",
            message: "Specify amount in:",
            choices: [
                { name: "💲 USDT (how much to spend)", value: "usdt" },
                { name: "🍥 FCC (how much to receive)", value: "fcc" },
            ],
        },
    ]);

    let usdtAmount: number;
    let fccAmount: number;

    if (inputType === "usdt") {
        const { amount } = await inquirer.prompt([
            {
                type: "number",
                name: "amount",
                message: "USDT amount to spend:",
                validate: (v) => v > 0 || "Amount must be positive",
            },
        ]);
        usdtAmount = amount;
        fccAmount = usdtAmount / FCC_PRICE_USDT;
    } else {
        const { amount } = await inquirer.prompt([
            {
                type: "number",
                name: "amount",
                message: "FCC amount to receive:",
                validate: (v) => v > 0 || "Amount must be positive",
            },
        ]);
        fccAmount = amount;
        usdtAmount = fccAmount * FCC_PRICE_USDT;
    }

    // Get quote
    const quote = getBuyQuote(usdtAmount);
    displayQuote(quote);

    // Check balance
    const balanceCheck = await checkSwapBalance("USDT", usdtAmount);
    if (!balanceCheck.sufficient) {
        showError(`Insufficient USDT balance. Have: ${balanceCheck.balance}, Need: ${balanceCheck.required}`);
        await promptContinue();
        return;
    }

    showInfo(`Available USDT: ${balanceCheck.balance}`);

    const confirmed = await promptConfirm("Execute swap?");
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    // Execute swap
    const spinner = ora();

    const result = await buyFCC(
        usdtAmount,
        () => {
            spinner.text = "Approving USDT...";
            spinner.start();
        },
        (txHash) => {
            spinner.text = `Approved! TX: ${txHash.slice(0, 10)}...`;
        },
        () => {
            spinner.text = "Executing swap...";
        },
        (txHash) => {
            spinner.succeed("Swap complete!");
        }
    );

    if (result.success) {
        showSuccess(`✅ Bought ${fccAmount.toFixed(2)} FCC for ${usdtAmount.toFixed(2)} USDT`);
        showTxLink(result.hash || "");
    } else {
        spinner.fail("Swap failed");
        showError(result.error || "Unknown error");
    }

    await promptContinue();
}

/**
 * Screen: Sell FCC for USDT
 */
export async function sellFCCScreen(): Promise<void> {
    showSectionTitle("💸 Sell FCC");

    console.log(chalk.cyan("\n📈 Current FCC Price: $") + chalk.green(FCC_PRICE_USDT.toFixed(4)));
    console.log(chalk.gray("(Rate: 1 FCC = $0.06)\n"));

    const { inputType } = await inquirer.prompt([
        {
            type: "list",
            name: "inputType",
            message: "Specify amount in:",
            choices: [
                { name: "🍥 FCC (how much to sell)", value: "fcc" },
                { name: "💲 USDT (how much to receive)", value: "usdt" },
            ],
        },
    ]);

    let fccAmount: number;
    let usdtAmount: number;

    if (inputType === "fcc") {
        const { amount } = await inquirer.prompt([
            {
                type: "number",
                name: "amount",
                message: "FCC amount to sell:",
                validate: (v) => v > 0 || "Amount must be positive",
            },
        ]);
        fccAmount = amount;
        usdtAmount = fccAmount * FCC_PRICE_USDT;
    } else {
        const { amount } = await inquirer.prompt([
            {
                type: "number",
                name: "amount",
                message: "USDT amount to receive:",
                validate: (v) => v > 0 || "Amount must be positive",
            },
        ]);
        usdtAmount = amount;
        fccAmount = usdtAmount / FCC_PRICE_USDT;
    }

    // Get quote
    const quote = getSellQuote(fccAmount);
    displayQuote(quote);

    // Check balance
    const balanceCheck = await checkSwapBalance("FCC", fccAmount);
    if (!balanceCheck.sufficient) {
        showError(`Insufficient FCC balance. Have: ${balanceCheck.balance}, Need: ${balanceCheck.required}`);
        await promptContinue();
        return;
    }

    showInfo(`Available FCC: ${balanceCheck.balance}`);

    const confirmed = await promptConfirm("Execute swap?");
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    // Execute swap
    const spinner = ora();

    const result = await sellFCC(
        fccAmount,
        () => {
            spinner.text = "Approving FCC...";
            spinner.start();
        },
        (txHash) => {
            spinner.text = `Approved! TX: ${txHash.slice(0, 10)}...`;
        },
        () => {
            spinner.text = "Executing swap...";
        },
        (txHash) => {
            spinner.succeed("Swap complete!");
        }
    );

    if (result.success) {
        showSuccess(`✅ Sold ${fccAmount.toFixed(2)} FCC for ${usdtAmount.toFixed(2)} USDT`);
        showTxLink(result.hash || "");
    } else {
        spinner.fail("Swap failed");
        showError(result.error || "Unknown error");
    }

    await promptContinue();
}

/**
 * Export screen functions
 */
export const swapScreens = {
    buy: buyFCCScreen,
    sell: sellFCCScreen,
};
