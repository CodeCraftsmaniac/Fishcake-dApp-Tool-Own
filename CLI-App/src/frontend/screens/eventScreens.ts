/**
 * Event Screens - UI layer for event management
 * ONLY UI CODE - Calls EventService for business logic
 */

import chalk from "chalk";
import Table from "cli-table3";
import inquirer from "inquirer";
import ora from "ora";
import dayjs from "dayjs";
import {
    getEventInfo,
    getUserEvents,
    createEvent,
    finishEvent,
    calculateEventRefund,
    type EventFullInfo,
    type CreateEventInput,
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
import { fromWei } from "../../utils/format.js";
import { TOKEN_DECIMALS, getAddress, isFCCToken } from "../../config/addresses.js";
import { DEFAULT_LOCATION, generateRandomEventName, generateRandomEventDescription, generateRandomDeadline } from "../../config/defaults.js";

/**
 * Display event info in a formatted way
 */
function displayEventInfo(event: EventFullInfo): void {
    const decimals = event.tokenSymbol === "USDT" ? TOKEN_DECIMALS.USDT : TOKEN_DECIMALS.FCC;
    const tokenEmoji = event.tokenSymbol === "FCC" ? "🍥" : "💲";
    
    const deadline = dayjs.unix(event.base.activityDeadLine);
    const createTime = dayjs.unix(event.base.activityCreateTime);
    
    let statusStr: string;
    switch (event.status) {
        case "active":
            statusStr = chalk.green("🟢 Active");
            break;
        case "expired":
            statusStr = chalk.yellow("🟡 Expired");
            break;
        case "finished":
            statusStr = chalk.red("🔴 Finished");
            break;
    }

    console.log();
    console.log(chalk.cyan(`╭────────────────────────────────────────────────────────────╮`));
    console.log(chalk.cyan(`│`) + chalk.white.bold(`  📋 Event #${event.base.activityId}`) + chalk.cyan(` │ ${statusStr}`));
    console.log(chalk.cyan(`├────────────────────────────────────────────────────────────┤`));
    console.log(chalk.cyan(`│`) + chalk.white(`  🏪 Business: ${chalk.yellow(event.base.businessName)}`));
    console.log(chalk.cyan(`│`) + chalk.white(`  👤 Owner: ${chalk.gray(event.base.businessAccount)}`));
    console.log(chalk.cyan(`│`) + chalk.white(`  ${tokenEmoji} Token: ${chalk.cyan(event.tokenSymbol)}`));
    console.log(chalk.cyan(`├────────────────────────────────────────────────────────────┤`));
    
    const dropType = event.base.dropType === 1 ? "EVEN" : "RANDOM";
    const dropsUsed = event.ext.alreadyDropNumber;
    const dropsTotal = event.base.dropNumber;
    const amountUsed = fromWei(event.ext.alreadyDropAmts, decimals);
    const amountTotal = fromWei(event.base.minDropAmt * BigInt(event.base.dropNumber), decimals);
    const minDrop = fromWei(event.base.minDropAmt, decimals);
    const maxDrop = fromWei(event.base.maxDropAmt, decimals);
    
    console.log(chalk.cyan(`│`) + chalk.white(`  📊 Drop Type: ${chalk.magenta(dropType)}`));
    console.log(chalk.cyan(`│`) + chalk.white(`  🎯 Drops: ${chalk.green(dropsUsed)}/${chalk.yellow(dropsTotal)} used`));
    console.log(chalk.cyan(`│`) + chalk.white(`  💰 Amount: ${chalk.green(amountUsed)}/${chalk.yellow(amountTotal)} ${event.tokenSymbol}`));
    
    if (event.base.dropType === 2) {
        console.log(chalk.cyan(`│`) + chalk.white(`  📏 Range: ${minDrop} - ${maxDrop} ${event.tokenSymbol}`));
    } else {
        console.log(chalk.cyan(`│`) + chalk.white(`  📏 Per Drop: ${minDrop} ${event.tokenSymbol}`));
    }
    
    console.log(chalk.cyan(`├────────────────────────────────────────────────────────────┤`));
    console.log(chalk.cyan(`│`) + chalk.white(`  📅 Created: ${chalk.gray(createTime.format("YYYY-MM-DD HH:mm"))}`));
    console.log(chalk.cyan(`│`) + chalk.white(`  ⏰ Deadline: ${chalk.gray(deadline.format("YYYY-MM-DD HH:mm"))}`));
    console.log(chalk.cyan(`│`) + chalk.white(`  📍 Location: ${chalk.gray(event.base.latitudeLongitude)}`));
    console.log(chalk.cyan(`├────────────────────────────────────────────────────────────┤`));
    
    // Description - use the already-parsed content from EventFullInfo
    console.log(chalk.cyan(`│`) + chalk.white(`  📝 Description:`));
    const descLines = event.parsedContent.description.split("\n");
    for (const line of descLines.slice(0, 3)) {
        console.log(chalk.cyan(`│`) + chalk.gray(`     ${line.slice(0, 50)}`));
    }
    
    console.log(chalk.cyan(`├────────────────────────────────────────────────────────────┤`));
    console.log(chalk.cyan(`│`) + chalk.white(`  🔗 Link: `) + chalk.blue.underline(`https://fishcake.io/event?activityId=${event.base.activityId}`));
    console.log(chalk.cyan(`╰────────────────────────────────────────────────────────────╯`));
    console.log();
}

/**
 * Screen: View event detail by ID
 */
export async function eventDetailScreen(): Promise<void> {
    showSectionTitle("📋 Event Details");

    const { eventId } = await inquirer.prompt([
        {
            type: "number",
            name: "eventId",
            message: "Enter Event ID:",
            validate: (value) => {
                if (!value || value < 1) {
                    return "Please enter a valid event ID";
                }
                return true;
            },
        },
    ]);

    const spinner = createSpinner("Fetching event details...");
    spinner.start();

    const event = await getEventInfo(eventId);
    spinner.stop();

    if (!event) {
        showError(`Event #${eventId} not found`);
        await promptContinue();
        return;
    }

    displayEventInfo(event);
    await promptContinue();
}

/**
 * Screen: My events list
 */
export async function myEventsScreen(): Promise<void> {
    showSectionTitle("📋 My Events");

    const spinner = createSpinner("Loading your events...");
    spinner.start();

    const events = await getUserEvents();
    spinner.stop();

    if (events.length === 0) {
        showInfo("You haven't created any events yet.");
        await promptContinue();
        return;
    }

    // Display events table
    const table = new Table({
        head: [
            chalk.cyan("ID"),
            chalk.cyan("Token"),
            chalk.cyan("Drops"),
            chalk.cyan("Status"),
            chalk.cyan("Deadline"),
        ],
        colWidths: [8, 8, 12, 12, 22],
    });

    for (const event of events.slice(0, 20)) {
        const dropsStr = `${event.ext.alreadyDropNumber}/${event.base.dropNumber}`;
        const tokenEmoji = event.tokenSymbol === "FCC" ? "🍥" : "💲";
        
        let statusStr: string;
        switch (event.status) {
            case "active":
                statusStr = chalk.green("Active");
                break;
            case "expired":
                statusStr = chalk.yellow("Expired");
                break;
            case "finished":
                statusStr = chalk.red("Finished");
                break;
        }
        
        const deadline = dayjs.unix(event.base.activityDeadLine).format("MM-DD HH:mm");
        
        table.push([
            chalk.white(`#${event.base.activityId}`),
            `${tokenEmoji} ${event.tokenSymbol}`,
            dropsStr,
            statusStr,
            deadline,
        ]);
    }

    console.log(table.toString());
    console.log(chalk.gray(`\nShowing ${Math.min(events.length, 20)} of ${events.length} events`));

    // Ask if user wants to view details
    const { viewDetails } = await inquirer.prompt([
        {
            type: "confirm",
            name: "viewDetails",
            message: "View event details?",
            default: false,
        },
    ]);

    if (viewDetails) {
        const { selectedId } = await inquirer.prompt([
            {
                type: "number",
                name: "selectedId",
                message: "Enter Event ID:",
            },
        ]);

        if (selectedId) {
            const event = events.find(e => e.base.activityId === selectedId);
            if (event) {
                displayEventInfo(event);
            } else {
                showError("Event not found in your list");
            }
        }
    }

    await promptContinue();
}

/**
 * Screen: Create new event
 */
export async function createEventScreen(): Promise<void> {
    showSectionTitle("🎉 Create Event");

    // Token selection
    const { tokenChoice } = await inquirer.prompt([
        {
            type: "list",
            name: "tokenChoice",
            message: "Select token for event:",
            choices: [
                { name: "🍥 FCC Token", value: "FCC" },
                { name: "💲 USDT Token", value: "USDT" },
            ],
        },
    ]);

    const tokenAddress = tokenChoice === "FCC" ? getAddress("FCC_TOKEN") : getAddress("USDT_TOKEN");

    // Event details
    const { useRandom } = await inquirer.prompt([
        {
            type: "confirm",
            name: "useRandom",
            message: "Use random event name and description?",
            default: true,
        },
    ]);

    let eventName: string;
    let description: string;

    if (useRandom) {
        eventName = generateRandomEventName();
        description = generateRandomEventDescription();
        showInfo(`Event: ${eventName}`);
    } else {
        const answers = await inquirer.prompt([
            {
                type: "input",
                name: "eventName",
                message: "Event name:",
                validate: (v) => v.length >= 2 || "Name must be at least 2 characters",
            },
            {
                type: "input",
                name: "description",
                message: "Event description:",
                validate: (v) => v.length >= 5 || "Description must be at least 5 characters",
            },
        ]);
        eventName = answers.eventName;
        description = answers.description;
    }

    // Drop configuration
    const { amountPerDrop, dropNumber } = await inquirer.prompt([
        {
            type: "number",
            name: "amountPerDrop",
            message: `Amount per drop (${tokenChoice}):`,
            default: 12,
            validate: (v) => v > 0 || "Amount must be positive",
        },
        {
            type: "number",
            name: "dropNumber",
            message: "Number of drops:",
            default: 2,
            validate: (v) => v >= 1 || "Must have at least 1 drop",
        },
    ]);

    const totalAmount = amountPerDrop * dropNumber;
    const deadline = generateRandomDeadline();

    // Confirmation
    console.log();
    console.log(chalk.yellow("📋 Event Summary:"));
    console.log(chalk.white(`  Name: ${eventName}`));
    console.log(chalk.white(`  Token: ${tokenChoice}`));
    console.log(chalk.white(`  Amount per drop: ${amountPerDrop} ${tokenChoice}`));
    console.log(chalk.white(`  Number of drops: ${dropNumber}`));
    console.log(chalk.white(`  Total: ${totalAmount} ${tokenChoice}`));
    console.log(chalk.white(`  Deadline: ${dayjs(deadline).format("YYYY-MM-DD HH:mm")}`));
    console.log();

    const confirmed = await promptConfirm("Create this event?");
    if (!confirmed) {
        showWarning("Event creation cancelled");
        return;
    }

    // Execute creation
    const spinner = ora();

    const result = await createEvent(
        {
            businessName: eventName,
            description,
            tokenAddress,
            totalAmount,
            dropType: 1, // EVEN
            dropNumber,
            minDropAmt: amountPerDrop,
            maxDropAmt: amountPerDrop,
            deadline,
        },
        () => {
            spinner.text = "Approving tokens...";
            spinner.start();
        },
        (txHash) => {
            spinner.text = `Approved! TX: ${txHash.slice(0, 10)}...`;
        },
        () => {
            spinner.text = "Creating event...";
        },
        (eventId, txHash) => {
            spinner.succeed(`Event #${eventId} created!`);
        }
    );

    if (!result.success) {
        spinner.fail("Event creation failed");
        showError(result.error || "Unknown error");
    } else {
        showSuccess(`🎉 Event #${result.eventId} created successfully!`);
        showTxLink(result.txHash || "");
        showInfo(`View at: https://fishcake.io/event?activityId=${result.eventId}`);
    }

    await promptContinue();
}

/**
 * Screen: Finish event
 */
export async function finishEventScreen(): Promise<void> {
    showSectionTitle("🏁 Finish Event");

    const { eventId } = await inquirer.prompt([
        {
            type: "number",
            name: "eventId",
            message: "Enter Event ID to finish:",
            validate: (v) => v >= 1 || "Invalid event ID",
        },
    ]);

    // Get event info and refund calculation
    const spinner = createSpinner("Loading event info...");
    spinner.start();

    const event = await getEventInfo(eventId);
    const refund = await calculateEventRefund(eventId);
    spinner.stop();

    if (!event) {
        showError(`Event #${eventId} not found`);
        await promptContinue();
        return;
    }

    if (event.status === "finished") {
        showWarning("This event is already finished");
        await promptContinue();
        return;
    }

    // Display refund info
    const decimals = event.tokenSymbol === "USDT" ? TOKEN_DECIMALS.USDT : TOKEN_DECIMALS.FCC;
    const refundAmount = fromWei(refund.remainingAmount, decimals);

    console.log();
    console.log(chalk.yellow("📊 Event Status:"));
    console.log(chalk.white(`  Remaining drops: ${refund.remainingDrops}`));
    console.log(chalk.white(`  Refund amount: ${refundAmount} ${refund.tokenSymbol}`));
    console.log();

    const confirmed = await promptConfirm("Finish this event and claim refund?");
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    const finishSpinner = ora();

    const result = await finishEvent(
        eventId,
        () => {
            finishSpinner.text = "Finishing event...";
            finishSpinner.start();
        },
        (returnAmount, minedAmount, txHash) => {
            finishSpinner.succeed("Event finished!");
        }
    );

    if (!result.success) {
        finishSpinner.fail("Failed to finish event");
        showError(result.error || "Unknown error");
    } else {
        showSuccess(`✅ Event #${eventId} finished successfully!`);
        showTxLink(result.hash || "");
    }

    await promptContinue();
}

/**
 * Export screen functions
 */
export const eventScreens = {
    detail: eventDetailScreen,
    myEvents: myEventsScreen,
    create: createEventScreen,
    finish: finishEventScreen,
};
