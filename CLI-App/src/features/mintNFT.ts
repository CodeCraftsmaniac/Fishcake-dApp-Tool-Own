/**
 * Mint NFT Feature
 * Mint Basic (8 USDT) or Pro (80 USDT) NFTs with template support
 */

import chalk from "chalk";
import inquirer from "inquirer";
import { showSectionTitle, showSuccess, showError, showInfo, createSpinner, showTxLink } from "../frontend/display.js";
import { promptMintNFT, promptConfirm, promptContinue } from "../frontend/prompts.js";
import { validateNFTFields } from "../utils/validate.js";
import { fromWei } from "../utils/format.js";
import { getAddress, NFT_COST, TOKEN_DECIMALS } from "../config/addresses.js";
import { getNFTManagerContract } from "../blockchain/contracts.js";
import { approveNFTManager } from "../blockchain/approval.js";
import { getUSDTBalance } from "../wallet/connection.js";
import { NFT_TEMPLATES } from "../config/defaults.js";

export async function mintBasicNFTFeature(): Promise<void> {
    showSectionTitle("MINT BASIC NFT");
    
    console.log(chalk.cyan(`
┌────────────────────────────────────────┐
│           BASIC NFT (User)             │
├────────────────────────────────────────┤
│  Cost: ${NFT_COST.BASIC.amount} USDT                          │
│  Duration: 1 year                      │
│  Mining Rate: 25% (half of Pro)        │
│  Fields: Name, Description, Social     │
└────────────────────────────────────────┘
`));
    
    try {
        const usdtBalance = await getUSDTBalance();
        if (usdtBalance < NFT_COST.BASIC.amountWei) {
            showError(`Insufficient USDT. You need ${NFT_COST.BASIC.amount} USDT but have ${fromWei(usdtBalance, TOKEN_DECIMALS.USDT)}`);
            await promptContinue();
            return;
        }
        
        // Template selection
        const templateChoices: { name: string; value: string }[] = NFT_TEMPLATES.basic.map((t) => ({
            name: `${t.name} - ${t.businessName}`,
            value: t.id,
        }));
        templateChoices.push({ name: "✏️  Custom (enter your own)", value: "custom" });
        
        const { templateId } = await inquirer.prompt([
            {
                type: "list",
                name: "templateId",
                message: "Select template or enter custom:",
                choices: templateChoices,
            },
        ]);
        
        let params: {
            businessName: string;
            description: string;
            social: string;
        };
        
        if (templateId === "custom") {
            params = await promptMintNFT("basic");
        } else {
            const template = NFT_TEMPLATES.basic.find((t) => t.id === templateId)!;
            params = {
                businessName: template.businessName,
                description: template.description,
                social: template.social,
            };
            
            // Ask if user wants to customize
            const { customize } = await inquirer.prompt([
                {
                    type: "confirm",
                    name: "customize",
                    message: "Customize the template details?",
                    default: false,
                },
            ]);
            
            if (customize) {
                const customized = await inquirer.prompt([
                    {
                        type: "input",
                        name: "businessName",
                        message: "Business Name:",
                        default: params.businessName,
                    },
                    {
                        type: "input",
                        name: "description",
                        message: "Description:",
                        default: params.description,
                    },
                    {
                        type: "input",
                        name: "social",
                        message: "Social Link:",
                        default: params.social,
                    },
                ]);
                params = customized;
            }
        }
        
        const validation = validateNFTFields({
            ...params,
            type: 2,
        });
        
        if (!validation.valid) {
            for (const error of validation.errors) {
                showError(error);
            }
            await promptContinue();
            return;
        }
        
        console.log("\n📋 NFT Details:");
        console.log(`   Name: ${params.businessName}`);
        console.log(`   Description: ${params.description.slice(0, 50)}${params.description.length > 50 ? "..." : ""}`);
        console.log(`   Social: ${params.social}`);
        console.log(`   Cost: ${NFT_COST.BASIC.amount} USDT`);
        
        const confirmed = await promptConfirm("\nMint this Basic NFT?");
        if (!confirmed) {
            showInfo("Mint cancelled");
            await promptContinue();
            return;
        }
        
        const approvalSpinner = createSpinner("Checking USDT allowance...");
        
        const approvalResult = await approveNFTManager(getAddress("USDT_TOKEN"), NFT_COST.BASIC.amountWei);
        
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
        
        const mintSpinner = createSpinner("Minting Basic NFT...");
        
        const nftManager = getNFTManagerContract(true);
        const tx = await nftManager.createNFT(
            params.businessName,
            params.description,
            "",
            "",
            "",
            params.social,
            NFT_COST.BASIC.type
        );
        
        mintSpinner.text = "Waiting for confirmation...";
        const receipt = await tx.wait();
        
        if (receipt.status !== 1) {
            mintSpinner.fail("Mint failed");
            showError("Transaction reverted");
            await promptContinue();
            return;
        }
        
        mintSpinner.succeed("Basic NFT minted successfully!");
        console.log(chalk.green("\n🎉 Welcome to Fishcake! You can now earn mining rewards at 25% rate."));
        showTxLink(receipt.hash);
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Failed to mint NFT");
        }
    }
    
    await promptContinue();
}

export async function mintProNFTFeature(): Promise<void> {
    showSectionTitle("MINT PRO NFT");
    
    console.log(chalk.cyan(`
┌────────────────────────────────────────┐
│           PRO NFT (Merchant)           │
├────────────────────────────────────────┤
│  Cost: ${NFT_COST.PRO.amount} USDT                         │
│  Duration: 1 year                      │
│  Mining Rate: 50% (full rate)          │
│  Fields: Name, Desc, Address,          │
│          Website, Social               │
│                                        │
│  ⚠️  Address and Website are REQUIRED  │
└────────────────────────────────────────┘
`));
    
    try {
        const usdtBalance = await getUSDTBalance();
        if (usdtBalance < NFT_COST.PRO.amountWei) {
            showError(`Insufficient USDT. You need ${NFT_COST.PRO.amount} USDT but have ${fromWei(usdtBalance, TOKEN_DECIMALS.USDT)}`);
            await promptContinue();
            return;
        }
        
        // Template selection
        const templateChoices: { name: string; value: string }[] = NFT_TEMPLATES.pro.map((t) => ({
            name: `${t.name} - ${t.businessName}`,
            value: t.id,
        }));
        templateChoices.push({ name: "✏️  Custom (enter your own)", value: "custom" });
        
        const { templateId } = await inquirer.prompt([
            {
                type: "list",
                name: "templateId",
                message: "Select template or enter custom:",
                choices: templateChoices,
            },
        ]);
        
        let params: {
            businessName: string;
            description: string;
            businessAddress?: string;
            webSite?: string;
            social: string;
        };
        
        if (templateId === "custom") {
            params = await promptMintNFT("pro");
        } else {
            const template = NFT_TEMPLATES.pro.find((t) => t.id === templateId)!;
            params = {
                businessName: template.businessName,
                description: template.description,
                businessAddress: template.businessAddress,
                webSite: template.webSite,
                social: template.social,
            };
            
            // Ask if user wants to customize
            const { customize } = await inquirer.prompt([
                {
                    type: "confirm",
                    name: "customize",
                    message: "Customize the template details?",
                    default: false,
                },
            ]);
            
            if (customize) {
                const customized = await inquirer.prompt([
                    {
                        type: "input",
                        name: "businessName",
                        message: "Business Name:",
                        default: params.businessName,
                    },
                    {
                        type: "input",
                        name: "description",
                        message: "Description:",
                        default: params.description,
                    },
                    {
                        type: "input",
                        name: "businessAddress",
                        message: "Business Address:",
                        default: params.businessAddress,
                    },
                    {
                        type: "input",
                        name: "webSite",
                        message: "Website:",
                        default: params.webSite,
                    },
                    {
                        type: "input",
                        name: "social",
                        message: "Social Link:",
                        default: params.social,
                    },
                ]);
                params = customized;
            }
        }
        
        const validation = validateNFTFields({
            ...params,
            type: 1,
        });
        
        if (!validation.valid) {
            for (const error of validation.errors) {
                showError(error);
            }
            await promptContinue();
            return;
        }
        
        console.log("\n📋 NFT Details:");
        console.log(`   Name: ${params.businessName}`);
        console.log(`   Description: ${params.description.slice(0, 50)}${params.description.length > 50 ? "..." : ""}`);
        console.log(`   Address: ${params.businessAddress}`);
        console.log(`   Website: ${params.webSite}`);
        console.log(`   Social: ${params.social}`);
        console.log(`   Cost: ${NFT_COST.PRO.amount} USDT`);
        
        const confirmed = await promptConfirm("\nMint this Pro NFT?");
        if (!confirmed) {
            showInfo("Mint cancelled");
            await promptContinue();
            return;
        }
        
        const approvalSpinner = createSpinner("Checking USDT allowance...");
        
        const approvalResult = await approveNFTManager(getAddress("USDT_TOKEN"), NFT_COST.PRO.amountWei);
        
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
        
        const mintSpinner = createSpinner("Minting Pro NFT...");
        
        const nftManager = getNFTManagerContract(true);
        const tx = await nftManager.createNFT(
            params.businessName,
            params.description,
            "",
            params.businessAddress || "",
            params.webSite || "",
            params.social,
            NFT_COST.PRO.type
        );
        
        mintSpinner.text = "Waiting for confirmation...";
        const receipt = await tx.wait();
        
        if (receipt.status !== 1) {
            mintSpinner.fail("Mint failed");
            showError("Transaction reverted");
            await promptContinue();
            return;
        }
        
        mintSpinner.succeed("Pro NFT minted successfully!");
        console.log(chalk.green("\n🎉 You're now a verified Merchant! Earn mining rewards at 50% rate."));
        showTxLink(receipt.hash);
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError("Failed to mint NFT");
        }
    }
    
    await promptContinue();
}
