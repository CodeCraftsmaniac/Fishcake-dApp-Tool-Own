/**
 * Drop Screens - UI layer for drop operations
 * ONLY UI CODE - Calls DropService for business logic
 */

import chalk from "chalk";
import Table from "cli-table3";
import inquirer from "inquirer";
import ora from "ora";
import dayjs from "dayjs";
import {
    executeDrop,
    executeBatchDrop,
    getDropHistory,
    calculateRemainingCapacity,
    validateDrop,
    type DropHistoryEntry,
} from "../../services/index.js";
import {
    executeQuickAirdrop,
    executeCustomAirdrop,
    executePowerUserAirdrop,
    getSavedAddresses,
    calculateAirdropCost,
    QUICK_AIRDROP_TEMPLATES,
    type AirdropProgress,
} from "../../services/index.js";
import {
    showSectionTitle,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    createSpinner,
    showTxLink,
    showProgressBar,
} from "../display.js";
import { promptConfirm, promptContinue } from "../prompts.js";
import {
    getEntries as loadAddressBook,
    type AddressEntry,
} from "../../storage/addressBook.js";
import { getAddress, TOKEN_DECIMALS } from "../../config/addresses.js";
import { fromWei } from "../../utils/format.js";
import { getEventInfo } from "../../services/EventService.js";

/**
 * Display airdrop progress
 */
function displayProgress(progress: AirdropProgress): void {
    switch (progress.phase) {
        case "approval":
            console.log(chalk.yellow("📝 Approving tokens..."));
            break;
        case "creating":
            console.log(chalk.yellow("🎉 Creating event..."));
            break;
        case "dropping":
            const pct = progress.dropsTotal 
                ? Math.round((progress.dropsCompleted! / progress.dropsTotal) * 100)
                : 0;
            const bar = showProgressBar(progress.dropsCompleted || 0, progress.dropsTotal || 1);
            process.stdout.write(`\r${chalk.cyan("💧 Dropping:")} ${bar} ${pct}% (${progress.dropsCompleted}/${progress.dropsTotal})`);
            break;
        case "complete":
            console.log();
            console.log(chalk.green(`✅ Complete! ${progress.dropsCompleted}/${progress.dropsTotal} drops successful`));
            break;
        case "error":
            console.log(chalk.red(`❌ Error: ${progress.error}`));
            break;
    }
}

/**
 * Screen: Quick Airdrop (standard template)
 */
export async function quickAirdropScreen(): Promise<void> {
    showSectionTitle("⚡ Quick Airdrop");

    // Get saved addresses
    const savedAddresses = getSavedAddresses();
    
    if (savedAddresses.length === 0) {
        showWarning("No addresses in address book. Please add addresses first.");
        await promptContinue();
        return;
    }

    // Display saved addresses
    console.log(chalk.cyan("\n📒 Saved Addresses:"));
    savedAddresses.forEach((addr, i) => {
        console.log(chalk.white(`  ${i + 1}. ${addr.label || "Unnamed"}: ${addr.address}`));
    });
    console.log();

    // Select airdrop type
    const { airdropType } = await inquirer.prompt([
        {
            type: "list",
            name: "airdropType",
            message: "Select airdrop type:",
            choices: [
                { name: `📦 Standard (${QUICK_AIRDROP_TEMPLATES.standard.totalFCC} FCC - ${QUICK_AIRDROP_TEMPLATES.standard.amountPerDrop} × ${QUICK_AIRDROP_TEMPLATES.standard.dropNumber})`, value: "standard" },
                { name: `📦 Small (${QUICK_AIRDROP_TEMPLATES.small.totalFCC} FCC - ${QUICK_AIRDROP_TEMPLATES.small.amountPerDrop} × ${QUICK_AIRDROP_TEMPLATES.small.dropNumber})`, value: "small" },
                { name: `📦 Medium (${QUICK_AIRDROP_TEMPLATES.medium.totalFCC} FCC - ${QUICK_AIRDROP_TEMPLATES.medium.amountPerDrop} × ${QUICK_AIRDROP_TEMPLATES.medium.dropNumber})`, value: "medium" },
                { name: "✏️  Custom (enter values)", value: "custom" },
            ],
        },
    ]);

    let amountPerDrop: number;
    let dropNumber: number;

    if (airdropType === "custom") {
        const customAnswers = await inquirer.prompt([
            {
                type: "number",
                name: "amountPerDrop",
                message: "Amount per drop (FCC):",
                default: 12,
                validate: (v) => v > 0 || "Must be positive",
            },
            {
                type: "number",
                name: "dropNumber",
                message: "Number of drops:",
                default: 2,
                validate: (v) => v >= 1 || "Must be at least 1",
            },
        ]);
        amountPerDrop = customAnswers.amountPerDrop;
        dropNumber = customAnswers.dropNumber;
    } else {
        const template = QUICK_AIRDROP_TEMPLATES[airdropType as keyof typeof QUICK_AIRDROP_TEMPLATES];
        amountPerDrop = template.amountPerDrop;
        dropNumber = template.dropNumber;
    }

    // Select addresses
    const { selectMode } = await inquirer.prompt([
        {
            type: "list",
            name: "selectMode",
            message: "Select addresses:",
            choices: [
                { name: "📋 All saved addresses", value: "all" },
                { name: "✅ Select specific addresses", value: "select" },
                { name: "📝 Enter new addresses", value: "new" },
            ],
        },
    ]);

    let selectedAddresses: string[];

    if (selectMode === "all") {
        selectedAddresses = savedAddresses.map(a => a.address);
    } else if (selectMode === "select") {
        const { selected } = await inquirer.prompt([
            {
                type: "checkbox",
                name: "selected",
                message: "Select addresses:",
                choices: savedAddresses.map(a => ({
                    name: `${a.label || "Unnamed"} (${a.address.slice(0, 10)}...)`,
                    value: a.address,
                })),
            },
        ]);
        selectedAddresses = selected;
    } else {
        const { newAddresses } = await inquirer.prompt([
            {
                type: "input",
                name: "newAddresses",
                message: "Enter addresses (comma-separated):",
            },
        ]);
        selectedAddresses = newAddresses.split(",").map((a: string) => a.trim()).filter((a: string) => a);
    }

    if (selectedAddresses.length === 0) {
        showWarning("No addresses selected");
        await promptContinue();
        return;
    }

    // Ensure drop number is at least the number of addresses
    if (dropNumber < selectedAddresses.length) {
        dropNumber = selectedAddresses.length;
        showInfo(`Adjusted drop count to ${dropNumber} to match address count`);
    }

    const totalAmount = amountPerDrop * dropNumber;

    // Confirmation
    console.log();
    console.log(chalk.yellow("📋 Airdrop Summary:"));
    console.log(chalk.white(`  Token: 🍥 FCC`));
    console.log(chalk.white(`  Amount per drop: ${amountPerDrop} FCC`));
    console.log(chalk.white(`  Drop count: ${dropNumber}`));
    console.log(chalk.white(`  Total cost: ${totalAmount} FCC`));
    console.log(chalk.white(`  Recipients: ${selectedAddresses.length} addresses`));
    console.log();

    const confirmed = await promptConfirm("Execute quick airdrop?");
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    // Execute
    console.log();
    const result = await executeQuickAirdrop(
        {
            tokenSymbol: "FCC",
            amountPerDrop,
            dropNumber,
            addresses: selectedAddresses,
        },
        displayProgress
    );

    console.log();
    if (result.success) {
        showSuccess(`🎉 Quick Airdrop Complete!`);
        showInfo(`Event #${result.eventId} created`);
        if (result.dropResults) {
            showInfo(`Drops: ${result.dropResults.successful}/${result.dropResults.totalAttempted} successful`);
        }
    } else {
        showError(result.error || "Airdrop failed");
    }

    await promptContinue();
}

/**
 * Screen: Batch drop to event
 */
export async function batchDropScreen(): Promise<void> {
    showSectionTitle("📦 Batch Drop");

    const { eventId } = await inquirer.prompt([
        {
            type: "number",
            name: "eventId",
            message: "Enter Event ID:",
            validate: (v) => v >= 1 || "Invalid event ID",
        },
    ]);

    // Get event info
    const spinner = createSpinner("Loading event...");
    spinner.start();
    
    const capacity = await calculateRemainingCapacity(eventId);
    spinner.stop();

    if (capacity.remainingDrops === 0) {
        showError("No drops remaining in this event");
        await promptContinue();
        return;
    }

    const decimals = capacity.tokenSymbol === "USDT" ? TOKEN_DECIMALS.USDT : TOKEN_DECIMALS.FCC;
    const amountPerDrop = fromWei(capacity.amountPerDrop, decimals);
    const tokenEmoji = capacity.tokenSymbol === "FCC" ? "🍥" : "💲";

    console.log();
    console.log(chalk.cyan(`📊 Event #${eventId} Status:`));
    console.log(chalk.white(`  ${tokenEmoji} Token: ${capacity.tokenSymbol}`));
    console.log(chalk.white(`  📦 Remaining drops: ${capacity.remainingDrops}`));
    console.log(chalk.white(`  💰 Amount per drop: ${amountPerDrop} ${capacity.tokenSymbol}`));
    console.log();

    // Get saved addresses
    const savedAddresses = loadAddressBook();

    const { selectMode } = await inquirer.prompt([
        {
            type: "list",
            name: "selectMode",
            message: "Select addresses to drop to:",
            choices: [
                ...(savedAddresses.length > 0 ? [{ name: `📋 Saved addresses (${savedAddresses.length})`, value: "saved" }] : []),
                { name: "📝 Enter addresses manually", value: "manual" },
            ],
        },
    ]);

    let addresses: string[];

    if (selectMode === "saved") {
        const { selected } = await inquirer.prompt([
            {
                type: "checkbox",
                name: "selected",
                message: "Select addresses:",
                choices: savedAddresses.map(a => ({
                    name: `${a.label || "Unnamed"} (${a.address.slice(0, 10)}...)`,
                    value: a.address,
                    checked: true,
                })),
            },
        ]);
        addresses = selected;
    } else {
        const { manualAddresses } = await inquirer.prompt([
            {
                type: "input",
                name: "manualAddresses",
                message: "Enter addresses (comma or newline separated):",
            },
        ]);
        addresses = manualAddresses
            .split(/[,\n]/)
            .map((a: string) => a.trim())
            .filter((a: string) => a);
    }

    if (addresses.length === 0) {
        showWarning("No addresses provided");
        await promptContinue();
        return;
    }

    if (addresses.length > capacity.remainingDrops) {
        showWarning(`Only ${capacity.remainingDrops} drops remaining. Truncating to ${capacity.remainingDrops} addresses.`);
        addresses = addresses.slice(0, capacity.remainingDrops);
    }

    // Confirmation
    const confirmed = await promptConfirm(`Drop to ${addresses.length} addresses?`);
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    // Execute batch drop
    console.log();
    console.log(chalk.cyan("🚀 Starting batch drop..."));
    console.log();

    const result = await executeBatchDrop(
        eventId,
        addresses,
        (current, total, address, success) => {
            const status = success ? chalk.green("✅") : chalk.red("❌");
            console.log(`${status} [${current}/${total}] ${address.slice(0, 10)}...${address.slice(-6)}`);
        }
    );

    console.log();
    console.log(chalk.cyan("─".repeat(50)));
    console.log(chalk.white(`📊 Results:`));
    console.log(chalk.green(`  ✅ Successful: ${result.successful}`));
    console.log(chalk.red(`  ❌ Failed: ${result.failed}`));
    console.log(chalk.cyan("─".repeat(50)));

    await promptContinue();
}

/**
 * Screen: Single drop
 */
export async function singleDropScreen(): Promise<void> {
    showSectionTitle("💧 Drop to Address");

    const { eventId, recipientAddress } = await inquirer.prompt([
        {
            type: "number",
            name: "eventId",
            message: "Enter Event ID:",
            validate: (v) => v >= 1 || "Invalid event ID",
        },
        {
            type: "input",
            name: "recipientAddress",
            message: "Recipient address:",
            validate: (v) => v.length === 42 && v.startsWith("0x") || "Invalid address",
        },
    ]);

    // Validate
    const spinner = createSpinner("Validating...");
    spinner.start();

    const validation = await validateDrop(eventId, recipientAddress);
    spinner.stop();

    if (!validation.valid) {
        showError(validation.error || "Validation failed");
        await promptContinue();
        return;
    }

    const eventInfo = validation.eventInfo!;
    const decimals = eventInfo.tokenSymbol === "USDT" ? TOKEN_DECIMALS.USDT : TOKEN_DECIMALS.FCC;
    const dropAmount = fromWei(eventInfo.base.minDropAmt, decimals);

    console.log();
    console.log(chalk.cyan(`📋 Drop Details:`));
    console.log(chalk.white(`  Event: #${eventId}`));
    console.log(chalk.white(`  Amount: ${dropAmount} ${eventInfo.tokenSymbol}`));
    console.log(chalk.white(`  Recipient: ${recipientAddress}`));
    console.log();

    const confirmed = await promptConfirm("Execute drop?");
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    const dropSpinner = ora();
    dropSpinner.text = "Executing drop...";
    dropSpinner.start();

    const result = await executeDrop(eventId, recipientAddress, eventInfo.base.minDropAmt);

    if (result.success) {
        dropSpinner.succeed("Drop successful!");
        showTxLink(result.hash || "");
    } else {
        dropSpinner.fail("Drop failed");
        showError(result.error || "Unknown error");
    }

    await promptContinue();
}

/**
 * Screen: Drop history
 */
export async function dropHistoryScreen(): Promise<void> {
    showSectionTitle("📜 Drop History");

    const { filterType } = await inquirer.prompt([
        {
            type: "list",
            name: "filterType",
            message: "Filter by:",
            choices: [
                { name: "📋 All my drops", value: "all" },
                { name: "🎫 Specific event", value: "event" },
            ],
        },
    ]);

    let eventId: number | undefined;
    if (filterType === "event") {
        const answer = await inquirer.prompt([
            {
                type: "number",
                name: "eventId",
                message: "Enter Event ID:",
            },
        ]);
        eventId = answer.eventId;
    }

    const spinner = createSpinner("Loading drop history...");
    spinner.start();

    const history = await getDropHistory(eventId);
    spinner.stop();

    if (history.length === 0) {
        showInfo("No drop history found");
        await promptContinue();
        return;
    }

    // Display table
    const table = new Table({
        head: [
            chalk.cyan("Event"),
            chalk.cyan("Amount"),
            chalk.cyan("Recipient"),
            chalk.cyan("Block"),
        ],
        colWidths: [10, 15, 22, 12],
    });

    for (const entry of history.slice(0, 50)) {
        const tokenEmoji = entry.tokenSymbol === "FCC" ? "🍥" : "💲";
        table.push([
            `#${entry.eventId}`,
            `${tokenEmoji} ${entry.amountFormatted}`,
            `${entry.recipient.slice(0, 8)}...${entry.recipient.slice(-4)}`,
            entry.blockNumber.toString(),
        ]);
    }

    console.log(table.toString());
    console.log(chalk.gray(`\nShowing ${Math.min(history.length, 50)} of ${history.length} entries`));

    await promptContinue();
}

/**
 * Screen: Power user mode
 */
export async function powerUserScreen(): Promise<void> {
    showSectionTitle("🔥 Power User Mode");

    const savedAddresses = getSavedAddresses();

    if (savedAddresses.length === 0) {
        showWarning("No addresses in address book. Please add addresses first.");
        await promptContinue();
        return;
    }

    console.log(chalk.yellow("\n⚡ Power User Mode"));
    console.log(chalk.white("  One-click airdrop to all saved addresses"));
    console.log(chalk.white(`  Recipients: ${savedAddresses.length} addresses`));
    console.log();

    const { template } = await inquirer.prompt([
        {
            type: "list",
            name: "template",
            message: "Select template:",
            choices: [
                { name: `Standard (24 FCC total)`, value: "standard" },
                { name: `Small (5 FCC total)`, value: "small" },
                { name: `Medium (50 FCC total)`, value: "medium" },
                { name: `Large (250 FCC total)`, value: "large" },
            ],
        },
    ]);

    const confirmed = await promptConfirm("Execute power user airdrop?");
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    console.log();
    const result = await executePowerUserAirdrop(
        template,
        "FCC",
        displayProgress
    );

    console.log();
    if (result.success) {
        showSuccess(`🔥 Power User Airdrop Complete!`);
        showInfo(`Event #${result.eventId} created`);
        if (result.dropResults) {
            showInfo(`Drops: ${result.dropResults.successful}/${result.dropResults.totalAttempted} successful`);
        }
    } else {
        showError(result.error || "Airdrop failed");
    }

    await promptContinue();
}

/**
 * Export screen functions
 */
export const dropScreens = {
    quickAirdrop: quickAirdropScreen,
    batchDrop: batchDropScreen,
    singleDrop: singleDropScreen,
    history: dropHistoryScreen,
    powerUser: powerUserScreen,
};
