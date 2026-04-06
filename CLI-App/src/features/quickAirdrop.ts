/**
 * Quick Airdrop Feature - One-click event creation + batch drop
 * The ultimate time-saver: Create event and drop to addresses in one flow
 */

import chalk from "chalk";
import inquirer from "inquirer";
import { ethers } from "ethers";
import {
    showSectionTitle,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    createSpinner,
    showTxLink,
    showProgressBar,
} from "../frontend/display.js";
import { promptConfirm, promptContinue } from "../frontend/prompts.js";
import { validateAddresses } from "../utils/validate.js";
import { buildActivityContent, buildLatitudeLongitude } from "../utils/content.js";
import { toWei, fromWei, shortenAddress, formatNumber } from "../utils/format.js";
import { dateToUnix, nowUnix } from "../utils/time.js";
import { getAddress, TOKEN_DECIMALS } from "../config/addresses.js";
import { getEventManagerContract, getFastGasOverride } from "../blockchain/contracts.js";
import { approveEventManager } from "../blockchain/approval.js";
import { getWalletAddress, getBalances } from "../wallet/connection.js";
import {
    DEFAULT_LOCATION,
    QUICK_AIRDROP_TEMPLATES,
    generateRandomEventName,
    generateRandomEventDescription,
    generateRandomDeadline,
} from "../config/defaults.js";
import { getAddressGroups, addRecentAddresses } from "../storage/addressBook.js";
import type { BatchDropResult } from "../types/index.js";

interface QuickAirdropConfig {
    eventName: string;
    description: string;
    amountPerDrop: number;
    dropNumber: number;
    addresses: string[];
}

export async function quickAirdropFeature(): Promise<void> {
    showSectionTitle("⚡ QUICK AIRDROP");
    console.log(chalk.dim("Create event + batch drop in one flow\n"));

    try {
        // Step 1: Choose template or custom
        const { templateChoice } = await inquirer.prompt([
            {
                type: "list",
                name: "templateChoice",
                message: "Select airdrop type:",
                choices: [
                    {
                        name: `⚡ Standard (${QUICK_AIRDROP_TEMPLATES.standard.amountPerDrop} FCC × ${QUICK_AIRDROP_TEMPLATES.standard.dropNumber} = ${QUICK_AIRDROP_TEMPLATES.standard.totalBudget} FCC)`,
                        value: "standard",
                    },
                    {
                        name: `📦 Small (${QUICK_AIRDROP_TEMPLATES.small.amountPerDrop} FCC × ${QUICK_AIRDROP_TEMPLATES.small.dropNumber} = ${QUICK_AIRDROP_TEMPLATES.small.totalBudget} FCC)`,
                        value: "small",
                    },
                    {
                        name: `💎 Medium (${QUICK_AIRDROP_TEMPLATES.medium.amountPerDrop} FCC × ${QUICK_AIRDROP_TEMPLATES.medium.dropNumber} = ${QUICK_AIRDROP_TEMPLATES.medium.totalBudget} FCC)`,
                        value: "medium",
                    },
                    { name: "✏️  Custom (set your own amount & drops)", value: "custom" },
                ],
            },
        ]);

        let config: QuickAirdropConfig;

        if (templateChoice === "custom") {
            // Custom configuration
            const customConfig = await inquirer.prompt([
                {
                    type: "input",
                    name: "amountPerDrop",
                    message: "FCC amount per drop:",
                    default: "12",
                    validate: (input: string) => {
                        const num = parseFloat(input);
                        return num > 0 || "Must be a positive number";
                    },
                },
                {
                    type: "input",
                    name: "dropNumber",
                    message: "Number of drops per event:",
                    default: "2",
                    validate: (input: string) => {
                        const num = parseInt(input, 10);
                        return (num > 0 && num <= 10000) || "Must be 1-10000";
                    },
                },
            ]);

            config = {
                eventName: generateRandomEventName(),
                description: generateRandomEventDescription(),
                amountPerDrop: parseFloat(customConfig.amountPerDrop),
                dropNumber: parseInt(customConfig.dropNumber, 10),
                addresses: [],
            };
        } else {
            // Use template
            const template = QUICK_AIRDROP_TEMPLATES[templateChoice as keyof typeof QUICK_AIRDROP_TEMPLATES];
            config = {
                eventName: generateRandomEventName(),
                description: generateRandomEventDescription(),
                amountPerDrop: template.amountPerDrop,
                dropNumber: template.dropNumber,
                addresses: [],
            };
        }

        const totalBudget = config.amountPerDrop * config.dropNumber;
        console.log(chalk.cyan(`\n📋 Event: ${config.eventName}`));
        console.log(chalk.dim(`   ${config.amountPerDrop} FCC × ${config.dropNumber} drops = ${totalBudget} FCC total`));

        // Step 2: Select addresses
        const addressGroups = getAddressGroups();
        const addressChoices: { name: string; value: string }[] = [
            { name: "📝 Enter new addresses", value: "new" },
        ];

        if (addressGroups.length > 0) {
            for (const group of addressGroups) {
                addressChoices.unshift({
                    name: `📋 ${group.name} (${group.addresses.length} addresses)`,
                    value: group.id,
                });
            }
        }

        const { addressChoice } = await inquirer.prompt([
            {
                type: "list",
                name: "addressChoice",
                message: "Select addresses to drop:",
                choices: addressChoices,
            },
        ]);

        let addresses: string[] = [];

        if (addressChoice === "new") {
            const { input } = await inquirer.prompt([
                {
                    type: "input",
                    name: "input",
                    message: "Enter addresses (comma-separated or file.txt):",
                },
            ]);

            const trimmed = input.trim();
            if (trimmed.endsWith(".txt")) {
                const fs = await import("fs");
                const content = fs.readFileSync(trimmed, "utf8");
                addresses = content.split("\n").map((a: string) => a.trim()).filter((a: string) => a.length > 0);
            } else {
                addresses = trimmed.split(",").map((a: string) => a.trim()).filter((a: string) => a.length > 0);
            }
        } else {
            const group = addressGroups.find((g) => g.id === addressChoice);
            if (group) {
                addresses = group.addresses;
            }
        }

        // Validate addresses
        const { valid, invalid } = validateAddresses(addresses);

        if (invalid.length > 0) {
            showWarning(`${invalid.length} invalid addresses skipped`);
        }

        if (valid.length === 0) {
            showError("No valid addresses to drop");
            await promptContinue();
            return;
        }

        // Check if we have enough drops
        if (valid.length > config.dropNumber) {
            showWarning(`Event has ${config.dropNumber} drops, but ${valid.length} addresses provided.`);
            showInfo(`Only first ${config.dropNumber} addresses will receive drops.`);
            valid.splice(config.dropNumber);
        }

        config.addresses = valid;

        // Check balance
        const spinner = createSpinner("Checking balance...");
        const balances = await getBalances();
        const requiredBalance = toWei(totalBudget, TOKEN_DECIMALS.FCC);

        if (balances.fcc < requiredBalance) {
            spinner.fail("Insufficient balance");
            showError(`Required: ${totalBudget} FCC, Available: ${fromWei(balances.fcc, TOKEN_DECIMALS.FCC)} FCC`);
            await promptContinue();
            return;
        }

        spinner.succeed(`Balance OK (${formatNumber(parseFloat(fromWei(balances.fcc, TOKEN_DECIMALS.FCC)))} FCC)`);

        // Summary
        console.log(chalk.cyan("\n📋 Quick Airdrop Summary:"));
        console.log(`   Event: ${config.eventName}`);
        console.log(`   Amount: ${config.amountPerDrop} FCC × ${config.dropNumber} drops`);
        console.log(`   Total Budget: ${totalBudget} FCC`);
        console.log(`   Recipients: ${config.addresses.length} addresses`);
        console.log(`   Location: ${DEFAULT_LOCATION.name}`);
        console.log();

        const confirmed = await promptConfirm("🚀 Create event and execute drops?");
        if (!confirmed) {
            showInfo("Cancelled");
            await promptContinue();
            return;
        }

        // Execute Quick Airdrop
        await executeQuickAirdrop(config);

        // Save addresses to recent
        addRecentAddresses(config.addresses);

    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Quick airdrop failed");
        }
    }

    await promptContinue();
}

async function executeQuickAirdrop(config: QuickAirdropConfig): Promise<void> {
    const tokenAddress = getAddress("FCC_TOKEN");
    const amountWei = toWei(config.amountPerDrop, TOKEN_DECIMALS.FCC);
    const totalDropAmts = amountWei * BigInt(config.dropNumber);

    // Step 1: Approve tokens
    const approvalSpinner = createSpinner("Approving tokens...");

    const approvalResult = await approveEventManager(tokenAddress, totalDropAmts);
    if (approvalResult.needed) {
        if (!approvalResult.result?.success) {
            approvalSpinner.fail("Approval failed");
            showError(approvalResult.result?.error || "Approval transaction failed");
            return;
        }
        approvalSpinner.succeed("Tokens approved");
        showTxLink(approvalResult.result.hash!);
    } else {
        approvalSpinner.succeed("Allowance sufficient");
    }

    // Step 2: Create Event
    const createSpinnerObj = createSpinner("Creating event...");

    const activityContent = buildActivityContent({
        description: config.description,
        address: DEFAULT_LOCATION.name,
        link: "",
        startTime: new Date(),
        endTime: generateRandomDeadline(),
    });

    const latitudeLongitude = buildLatitudeLongitude(
        DEFAULT_LOCATION.latitude,
        DEFAULT_LOCATION.longitude
    );

    const deadline = generateRandomDeadline();
    const deadlineUnix = dateToUnix(deadline);

    const eventManager = getEventManagerContract(true);
    
    // Get fast gas for quicker confirmation
    const gasOverride = await getFastGasOverride();

    const tx = await eventManager.activityAdd(
        config.eventName,
        activityContent,
        latitudeLongitude,
        deadlineUnix,
        totalDropAmts,
        1, // EVEN drop type (always)
        config.dropNumber,
        amountWei,
        amountWei, // min = max for EVEN
        tokenAddress,
        gasOverride
    );

    createSpinnerObj.text = "Waiting for confirmation...";
    const receipt = await tx.wait();

    if (receipt.status !== 1) {
        createSpinnerObj.fail("Event creation failed");
        showError("Transaction reverted");
        return;
    }

    // Extract event ID from ActivityAdd event
    // ActivityAdd(address indexed who, uint256 indexed _activityId, ...)
    // topics[0] = event signature, topics[1] = who, topics[2] = _activityId
    let eventId = 0;
    const activityAddSig = eventManager.interface.getEvent("ActivityAdd")?.topicHash;
    
    for (const log of receipt.logs) {
        try {
            // Check if this log is the ActivityAdd event
            if (log.topics[0] === activityAddSig && log.topics.length >= 3) {
                // Extract _activityId from topics[2] (indexed parameter)
                eventId = Number(BigInt(log.topics[2]));
                break;
            }
            
            // Fallback: try parsing
            const parsed = eventManager.interface.parseLog({
                topics: log.topics as string[],
                data: log.data,
            });
            if (parsed && parsed.name === "ActivityAdd") {
                eventId = Number(parsed.args._activityId || parsed.args[1]);
                break;
            }
        } catch {
            continue;
        }
    }

    createSpinnerObj.succeed(`Event #${eventId} created!`);
    showTxLink(receipt.hash);

    if (eventId === 0) {
        showError("Could not extract event ID");
        return;
    }

    // Step 3: Execute Batch Drops
    console.log(chalk.cyan("\n📤 Executing drops...\n"));

    const results: BatchDropResult[] = [];
    const eventManagerRead = getEventManagerContract();

    for (let i = 0; i < config.addresses.length; i++) {
        const address = config.addresses[i];
        const progress = showProgressBar(i + 1, config.addresses.length);
        process.stdout.write(`\r${progress} Dropping to ${shortenAddress(address)}...`);

        try {
            // Check if already dropped
            const alreadyDropped = await eventManagerRead.activityDroppedToAccount(eventId, address);

            if (alreadyDropped) {
                results.push({
                    address,
                    status: "SKIPPED",
                    reason: "Already dropped",
                });
                continue;
            }

            // Use fast gas for quicker confirmations
            const dropGasOverride = await getFastGasOverride();
            const dropTx = await eventManager.drop(eventId, address, amountWei, dropGasOverride);
            const dropReceipt = await dropTx.wait();

            if (dropReceipt.status === 1) {
                results.push({
                    address,
                    status: "SUCCESS",
                    txHash: dropReceipt.hash,
                    amount: config.amountPerDrop.toString(),
                });
            } else {
                results.push({
                    address,
                    status: "FAILED",
                    reason: "TX reverted",
                });
            }
        } catch (error) {
            results.push({
                address,
                status: "FAILED",
                reason: error instanceof Error ? error.message.slice(0, 30) : "Error",
            });
        }
    }

    console.log("\n\n");

    // Summary
    const successful = results.filter((r) => r.status === "SUCCESS").length;
    const skipped = results.filter((r) => r.status === "SKIPPED").length;
    const failed = results.filter((r) => r.status === "FAILED").length;

    showSuccess(`✅ Quick Airdrop Complete!`);
    console.log(chalk.green(`   Event #${eventId} | ${successful} drops sent | ${skipped} skipped | ${failed} failed`));
    console.log(chalk.dim(`   🔗 https://fishcake.io/event?activityId=${eventId}`));
}

/**
 * Power User Mode - Fully automated one-click operation
 * Create event with random human-like data and drop to saved addresses
 */
export async function powerUserAirdrop(
    addressGroupId?: string,
    templateKey: "standard" | "small" | "medium" = "standard"
): Promise<{ success: boolean; eventId?: number; dropped?: number; error?: string }> {
    try {
        const template = QUICK_AIRDROP_TEMPLATES[templateKey];
        const addressGroups = getAddressGroups();

        // Get addresses
        let addresses: string[] = [];
        if (addressGroupId) {
            const group = addressGroups.find((g) => g.id === addressGroupId);
            if (group) {
                addresses = group.addresses;
            }
        } else if (addressGroups.length > 0) {
            // Use first group
            addresses = addressGroups[0].addresses;
        }

        if (addresses.length === 0) {
            return { success: false, error: "No addresses configured" };
        }

        // Validate
        const { valid } = validateAddresses(addresses);
        if (valid.length === 0) {
            return { success: false, error: "No valid addresses" };
        }

        // Limit to drop number
        const dropAddresses = valid.slice(0, template.dropNumber);

        // Execute
        const config: QuickAirdropConfig = {
            eventName: generateRandomEventName(),
            description: generateRandomEventDescription(),
            amountPerDrop: template.amountPerDrop,
            dropNumber: template.dropNumber,
            addresses: dropAddresses,
        };

        await executeQuickAirdrop(config);

        return { success: true, dropped: dropAddresses.length };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
