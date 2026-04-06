/**
 * Wallet Management Feature
 * Multi-wallet support with batch import and logout
 */

import chalk from "chalk";
import inquirer from "inquirer";
import Table from "cli-table3";
import {
    showSectionTitle,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    createSpinner,
} from "../frontend/display.js";
import { promptConfirm, promptContinue, promptPassphrase } from "../frontend/prompts.js";
import { shortenAddress } from "../utils/format.js";
import { validatePrivateKey } from "../wallet/keystore.js";
import {
    getWallets,
    addWallet,
    batchImportWallets,
    deleteWallet,
    clearAllWallets,
    setActiveWallet,
    updateWalletLabel,
    StoredWallet,
} from "../storage/walletManager.js";

export async function walletManagementFeature(): Promise<void> {
    showSectionTitle("👛 WALLET MANAGEMENT");

    let running = true;

    while (running) {
        const wallets = getWallets();

        // Display current wallets
        if (wallets.length > 0) {
            console.log(chalk.cyan("\n💼 Stored Wallets:\n"));
            const table = new Table({
                head: [
                    chalk.cyan("#"),
                    chalk.cyan("Label"),
                    chalk.cyan("Address"),
                    chalk.cyan("Status"),
                ],
                colWidths: [5, 20, 48, 10],
            });

            wallets.forEach((wallet, i) => {
                table.push([
                    (i + 1).toString(),
                    wallet.label,
                    wallet.address,
                    wallet.isActive ? chalk.green("✓ Active") : "",
                ]);
            });

            console.log(table.toString());
        } else {
            console.log(chalk.dim("\nNo wallets stored.\n"));
        }

        console.log();

        // Menu
        const { action } = await inquirer.prompt([
            {
                type: "list",
                name: "action",
                message: "What would you like to do?",
                choices: [
                    { name: "➕ Add single wallet", value: "add" },
                    { name: "📦 Batch import wallets", value: "batch" },
                    { name: "🔄 Switch active wallet", value: "switch" },
                    { name: "✏️  Rename wallet", value: "rename" },
                    { name: "🗑️  Delete wallet", value: "delete" },
                    { name: "🚪 Logout all wallets", value: "logout" },
                    { name: "🔙 Back to menu", value: "back" },
                ],
            },
        ]);

        switch (action) {
            case "add":
                await addSingleWallet();
                break;
            case "batch":
                await batchImportWalletsFeature();
                break;
            case "switch":
                await switchActiveWallet(wallets);
                break;
            case "rename":
                await renameWallet(wallets);
                break;
            case "delete":
                await deleteWalletFeature(wallets);
                break;
            case "logout":
                await logoutAllWallets();
                break;
            case "back":
                running = false;
                break;
        }
    }
}

async function addSingleWallet(): Promise<void> {
    const { privateKey } = await inquirer.prompt([
        {
            type: "password",
            name: "privateKey",
            message: "Enter private key:",
            mask: "*",
            validate: (input: string) => {
                if (!validatePrivateKey(input)) {
                    return "Invalid private key format";
                }
                return true;
            },
        },
    ]);

    const { label } = await inquirer.prompt([
        {
            type: "input",
            name: "label",
            message: "Wallet label (optional):",
            default: "",
        },
    ]);

    console.log(chalk.cyan("\nSet a passphrase to encrypt this wallet:"));
    const passphrase = await promptPassphrase(true);

    const spinner = createSpinner("Encrypting and saving wallet...");

    const result = addWallet(privateKey, passphrase, label || undefined);

    if (result.success && result.wallet) {
        spinner.succeed(`Wallet added: ${shortenAddress(result.wallet.address)}`);
    } else {
        spinner.fail("Failed to add wallet");
        showError(result.error || "Unknown error");
    }
}

async function batchImportWalletsFeature(): Promise<void> {
    console.log(chalk.cyan("\n📦 Batch Import Wallets\n"));
    console.log(chalk.dim("Enter multiple private keys, one per line."));
    console.log(chalk.dim("Or provide a file path ending in .txt\n"));

    const { input } = await inquirer.prompt([
        {
            type: "input",
            name: "input",
            message: "Enter private keys (comma-separated or file.txt):",
        },
    ]);

    let privateKeys: string[] = [];
    const trimmed = input.trim();

    if (trimmed.endsWith(".txt")) {
        try {
            const fs = await import("fs");
            const content = fs.readFileSync(trimmed, "utf8");
            privateKeys = content
                .split("\n")
                .map((k: string) => k.trim())
                .filter((k: string) => k.length > 0);
        } catch {
            showError("Could not read file");
            return;
        }
    } else {
        privateKeys = trimmed
            .split(",")
            .map((k: string) => k.trim())
            .filter((k: string) => k.length > 0);
    }

    if (privateKeys.length === 0) {
        showError("No private keys provided");
        return;
    }

    console.log(chalk.cyan(`\nFound ${privateKeys.length} private key(s)`));
    console.log(chalk.cyan("\nSet a passphrase for ALL wallets:"));
    const passphrase = await promptPassphrase(true);

    const spinner = createSpinner("Importing wallets...");

    const result = batchImportWallets(privateKeys, passphrase);

    spinner.stop();

    if (result.imported.length > 0) {
        showSuccess(`Imported ${result.imported.length} wallet(s):`);
        result.imported.forEach((w) => {
            console.log(chalk.green(`   ✓ ${w.label}: ${shortenAddress(w.address)}`));
        });
    }

    if (result.failed.length > 0) {
        showWarning(`Failed to import ${result.failed.length} wallet(s):`);
        result.failed.forEach((f) => {
            console.log(chalk.red(`   ✗ ${f.key}: ${f.error}`));
        });
    }

    await promptContinue();
}

async function switchActiveWallet(wallets: StoredWallet[]): Promise<void> {
    if (wallets.length === 0) {
        showInfo("No wallets to switch");
        return;
    }

    const { walletId } = await inquirer.prompt([
        {
            type: "list",
            name: "walletId",
            message: "Select wallet to activate:",
            choices: wallets.map((w) => ({
                name: `${w.label} (${shortenAddress(w.address)})${w.isActive ? " ✓" : ""}`,
                value: w.id,
            })),
        },
    ]);

    setActiveWallet(walletId);
    showSuccess("Active wallet switched");
}

async function renameWallet(wallets: StoredWallet[]): Promise<void> {
    if (wallets.length === 0) {
        showInfo("No wallets to rename");
        return;
    }

    const { walletId } = await inquirer.prompt([
        {
            type: "list",
            name: "walletId",
            message: "Select wallet to rename:",
            choices: wallets.map((w) => ({
                name: `${w.label} (${shortenAddress(w.address)})`,
                value: w.id,
            })),
        },
    ]);

    const { newLabel } = await inquirer.prompt([
        {
            type: "input",
            name: "newLabel",
            message: "New label:",
            validate: (input: string) => input.trim().length > 0 || "Label is required",
        },
    ]);

    updateWalletLabel(walletId, newLabel.trim());
    showSuccess("Wallet renamed");
}

async function deleteWalletFeature(wallets: StoredWallet[]): Promise<void> {
    if (wallets.length === 0) {
        showInfo("No wallets to delete");
        return;
    }

    const { walletId } = await inquirer.prompt([
        {
            type: "list",
            name: "walletId",
            message: "Select wallet to delete:",
            choices: wallets.map((w) => ({
                name: `${w.label} (${shortenAddress(w.address)})`,
                value: w.id,
            })),
        },
    ]);

    const wallet = wallets.find((w) => w.id === walletId);
    if (!wallet) return;

    const confirmed = await promptConfirm(
        `Delete "${wallet.label}" (${shortenAddress(wallet.address)})?`
    );
    if (!confirmed) return;

    deleteWallet(walletId);
    showSuccess("Wallet deleted");
}

async function logoutAllWallets(): Promise<void> {
    const wallets = getWallets();
    
    if (wallets.length === 0) {
        showInfo("No wallets to logout");
        return;
    }

    showWarning(`This will delete ${wallets.length} wallet(s) from storage!`);
    showWarning("Make sure you have your private keys backed up.");

    const confirmed = await promptConfirm("Are you sure you want to logout ALL wallets?");
    if (!confirmed) return;

    const doubleConfirm = await promptConfirm("This action cannot be undone. Proceed?");
    if (!doubleConfirm) return;

    clearAllWallets();
    showSuccess("All wallets removed. Please restart the CLI.");
}
