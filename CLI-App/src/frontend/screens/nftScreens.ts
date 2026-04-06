/**
 * NFT Screens - UI layer for NFT minting
 * ONLY UI CODE - Calls NFTService for business logic
 */

import chalk from "chalk";
import Table from "cli-table3";
import inquirer from "inquirer";
import ora from "ora";
import dayjs from "dayjs";
import {
    getNFTStatus,
    checkMintBalance,
    getMintCost,
    mintNFT,
    mintFromTemplate,
    getTemplates,
    getTemplatesByType,
    NFTType,
    NFT_COSTS,
    type NFTTemplate,
    type NFTMintInput,
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
 * Display NFT status
 */
function displayNFTStatus(status: Awaited<ReturnType<typeof getNFTStatus>>): void {
    console.log();
    console.log(chalk.cyan("╭────────────────────────────────────────────────╮"));
    console.log(chalk.cyan("│") + chalk.white.bold("  🎫 NFT Pass Status"));
    console.log(chalk.cyan("├────────────────────────────────────────────────┤"));
    
    if (!status.hasPass) {
        console.log(chalk.cyan("│") + chalk.yellow("  You don't have an NFT pass"));
        console.log(chalk.cyan("│") + chalk.white("  Basic: 500 FCC | Pro: 2000 FCC"));
    } else if (status.isExpired) {
        console.log(chalk.cyan("│") + chalk.red(`  ❌ ${status.passType?.toUpperCase()} Pass (Expired)`));
        console.log(chalk.cyan("│") + chalk.white("  Your pass needs renewal"));
    } else {
        const typeEmoji = status.passType === "pro" ? "⭐" : "🎫";
        console.log(chalk.cyan("│") + chalk.green(`  ${typeEmoji} ${status.passType?.toUpperCase()} Pass (Active)`));
        console.log(chalk.cyan("│") + chalk.white(`  Token ID: #${status.tokenId}`));
        console.log(chalk.cyan("│") + chalk.white(`  Days remaining: ${status.daysRemaining}`));
        
        if (status.expiryTime) {
            const expiryDate = dayjs.unix(status.expiryTime);
            console.log(chalk.cyan("│") + chalk.white(`  Expires: ${expiryDate.format("YYYY-MM-DD HH:mm")}`));
        }
    }
    
    console.log(chalk.cyan("╰────────────────────────────────────────────────╯"));
    console.log();
}

/**
 * Display template info
 */
function displayTemplate(template: NFTTemplate): void {
    const typeStr = template.type === 1 ? "Pro" : "Basic";
    const typeEmoji = template.type === 1 ? "⭐" : "🎫";
    
    console.log(chalk.cyan(`  ${typeEmoji} ${template.name} (${typeStr})`));
    console.log(chalk.gray(`     ${template.description}`));
    if (template.type === 1) {
        console.log(chalk.gray(`     📍 ${template.address}`));
        console.log(chalk.gray(`     🌐 ${template.website}`));
    }
    console.log(chalk.gray(`     🔗 ${template.social}`));
    console.log();
}

/**
 * Screen: View NFT status
 */
export async function nftStatusScreen(): Promise<void> {
    showSectionTitle("🎫 NFT Pass Status");

    const spinner = createSpinner("Checking NFT status...");
    spinner.start();

    const status = await getNFTStatus();
    spinner.stop();

    displayNFTStatus(status);

    await promptContinue();
}

/**
 * Screen: Mint NFT
 */
export async function mintNFTScreen(): Promise<void> {
    showSectionTitle("🎨 Mint NFT Pass");

    // Check current status
    const currentStatus = await getNFTStatus();
    if (currentStatus.hasPass && !currentStatus.isExpired) {
        showWarning("You already have an active NFT pass.");
        displayNFTStatus(currentStatus);
        await promptContinue();
        return;
    }

    // Select mint method
    const { mintMethod } = await inquirer.prompt([
        {
            type: "list",
            name: "mintMethod",
            message: "Select minting method:",
            choices: [
                { name: "📦 Use template (quick)", value: "template" },
                { name: "✏️  Custom details", value: "custom" },
            ],
        },
    ]);

    if (mintMethod === "template") {
        await mintFromTemplateScreen();
    } else {
        await mintCustomScreen();
    }
}

/**
 * Screen: Mint from template
 */
async function mintFromTemplateScreen(): Promise<void> {
    // Select NFT type first
    const { nftType } = await inquirer.prompt([
        {
            type: "list",
            name: "nftType",
            message: "Select NFT type:",
            choices: [
                { name: `🎫 Basic Pass (${NFT_COSTS.BASIC} FCC)`, value: 2 },
                { name: `⭐ Pro Pass (${NFT_COSTS.PRO} FCC)`, value: 1 },
            ],
        },
    ]);

    // Get templates for selected type
    const templates = getTemplatesByType(nftType);

    if (templates.length === 0) {
        showError("No templates available for this type");
        return;
    }

    // Display templates
    console.log(chalk.cyan("\n📦 Available Templates:\n"));
    templates.forEach((t, i) => {
        console.log(chalk.white(`${i + 1}. ${t.name}`));
        console.log(chalk.gray(`   ${t.description}`));
    });
    console.log();

    // Select template
    const { templateIndex } = await inquirer.prompt([
        {
            type: "number",
            name: "templateIndex",
            message: "Select template number:",
            validate: (v) => v >= 1 && v <= templates.length || `Enter 1-${templates.length}`,
        },
    ]);

    const selectedTemplate = templates[templateIndex - 1];
    const cost = getMintCost(selectedTemplate.type);

    // Check balance
    const balanceCheck = await checkMintBalance(selectedTemplate.type);
    if (!balanceCheck.sufficient) {
        showError(`Insufficient FCC balance. Have: ${balanceCheck.balance}, Need: ${balanceCheck.required}`);
        return;
    }

    // Confirmation
    console.log();
    console.log(chalk.yellow("📋 Mint Summary:"));
    displayTemplate(selectedTemplate);
    console.log(chalk.white(`  Cost: ${cost} FCC`));
    console.log();

    const confirmed = await promptConfirm("Mint this NFT?");
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    // Execute mint
    const spinner = ora();

    const result = await mintFromTemplate(
        selectedTemplate.id,
        () => {
            spinner.text = "Approving FCC...";
            spinner.start();
        },
        (txHash) => {
            spinner.text = `Approved! TX: ${txHash.slice(0, 10)}...`;
        },
        () => {
            spinner.text = "Minting NFT...";
        },
        (tokenId, txHash) => {
            spinner.succeed(`NFT #${tokenId} minted!`);
        }
    );

    if (result.success) {
        showSuccess(`🎉 NFT #${result.tokenId} minted successfully!`);
        showTxLink(result.hash || "");
    } else {
        spinner.fail("Minting failed");
        showError(result.error || "Unknown error");
    }

    await promptContinue();
}

/**
 * Screen: Mint with custom details
 */
async function mintCustomScreen(): Promise<void> {
    // Select NFT type
    const { nftType } = await inquirer.prompt([
        {
            type: "list",
            name: "nftType",
            message: "Select NFT type:",
            choices: [
                { name: `🎫 Basic Pass (${NFT_COSTS.BASIC} FCC) - 3 fields`, value: 2 },
                { name: `⭐ Pro Pass (${NFT_COSTS.PRO} FCC) - 5 fields`, value: 1 },
            ],
        },
    ]);

    // Common fields
    const commonAnswers = await inquirer.prompt([
        {
            type: "input",
            name: "name",
            message: "Business/Project name:",
            validate: (v) => v.length >= 2 || "Name must be at least 2 characters",
        },
        {
            type: "input",
            name: "description",
            message: "Description:",
            validate: (v) => v.length >= 5 || "Description must be at least 5 characters",
        },
        {
            type: "input",
            name: "social",
            message: "Social link (Twitter/Discord/etc):",
            validate: (v) => v.length > 0 || "Social link is required",
        },
    ]);

    let mintInput: NFTMintInput = {
        type: nftType,
        name: commonAnswers.name,
        description: commonAnswers.description,
        social: commonAnswers.social,
    };

    // Pro-only fields
    if (nftType === 1) {
        const proAnswers = await inquirer.prompt([
            {
                type: "input",
                name: "address",
                message: "Physical address:",
                validate: (v) => v.length >= 5 || "Address is required for Pro NFT",
            },
            {
                type: "input",
                name: "website",
                message: "Website URL:",
                validate: (v) => {
                    try {
                        new URL(v);
                        return true;
                    } catch {
                        return "Enter a valid URL";
                    }
                },
            },
        ]);
        mintInput.address = proAnswers.address;
        mintInput.website = proAnswers.website;
    }

    const cost = getMintCost(mintInput.type);

    // Check balance
    const balanceCheck = await checkMintBalance(mintInput.type);
    if (!balanceCheck.sufficient) {
        showError(`Insufficient FCC balance. Have: ${balanceCheck.balance}, Need: ${balanceCheck.required}`);
        return;
    }

    // Confirmation
    console.log();
    console.log(chalk.yellow("📋 Mint Summary:"));
    console.log(chalk.white(`  Type: ${mintInput.type === 1 ? "⭐ Pro" : "🎫 Basic"}`));
    console.log(chalk.white(`  Name: ${mintInput.name}`));
    console.log(chalk.white(`  Description: ${mintInput.description}`));
    console.log(chalk.white(`  Social: ${mintInput.social}`));
    if (mintInput.type === 1) {
        console.log(chalk.white(`  Address: ${mintInput.address}`));
        console.log(chalk.white(`  Website: ${mintInput.website}`));
    }
    console.log(chalk.white(`  Cost: ${cost} FCC`));
    console.log();

    const confirmed = await promptConfirm("Mint this NFT?");
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    // Execute mint
    const spinner = ora();

    const result = await mintNFT(
        mintInput,
        () => {
            spinner.text = "Approving FCC...";
            spinner.start();
        },
        (txHash) => {
            spinner.text = `Approved! TX: ${txHash.slice(0, 10)}...`;
        },
        () => {
            spinner.text = "Minting NFT...";
        },
        (tokenId, txHash) => {
            spinner.succeed(`NFT #${tokenId} minted!`);
        }
    );

    if (result.success) {
        showSuccess(`🎉 NFT #${result.tokenId} minted successfully!`);
        showTxLink(result.hash || "");
    } else {
        spinner.fail("Minting failed");
        showError(result.error || "Unknown error");
    }

    await promptContinue();
}

/**
 * Export screen functions
 */
export const nftScreens = {
    status: nftStatusScreen,
    mint: mintNFTScreen,
};
