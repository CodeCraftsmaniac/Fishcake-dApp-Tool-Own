/**
 * Wallet Screens - UI layer for wallet management
 * ONLY UI CODE - Calls WalletService for business logic
 */

import chalk from "chalk";
import Table from "cli-table3";
import inquirer from "inquirer";
import ora from "ora";
import {
    listWallets,
    importWallet,
    importWalletsBatch,
    unlockWallet,
    logout,
    deleteWallet,
    validatePrivateKey,
    validatePassword,
    formatAddress,
    type WalletInfo,
} from "../../services/index.js";
import {
    showSectionTitle,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    createSpinner,
} from "../display.js";
import { promptConfirm, promptContinue, promptPassphrase } from "../prompts.js";

/**
 * Display wallet list
 */
function displayWallets(wallets: WalletInfo[]): void {
    if (wallets.length === 0) {
        console.log(chalk.yellow("\n  No wallets found.\n"));
        return;
    }

    const table = new Table({
        head: [chalk.cyan("#"), chalk.cyan("Address"), chalk.cyan("Status")],
        colWidths: [5, 48, 12],
    });

    wallets.forEach((wallet, i) => {
        const status = wallet.isActive 
            ? chalk.green("● Active") 
            : chalk.gray("○ Inactive");
        
        table.push([
            (i + 1).toString(),
            wallet.address,
            status,
        ]);
    });

    console.log();
    console.log(table.toString());
    console.log();
}

/**
 * Screen: List wallets
 */
export async function listWalletsScreen(): Promise<void> {
    showSectionTitle("👛 My Wallets");

    const wallets = listWallets();
    displayWallets(wallets);

    await promptContinue();
}

/**
 * Screen: Import single wallet
 */
export async function importWalletScreen(): Promise<void> {
    showSectionTitle("📥 Import Wallet");

    console.log(chalk.yellow("\n⚠️  Security Notice:"));
    console.log(chalk.white("  Your private key will be encrypted with AES-256-GCM"));
    console.log(chalk.white("  and stored securely in the keystore.\n"));

    // Get private key
    const { privateKey } = await inquirer.prompt([
        {
            type: "password",
            name: "privateKey",
            message: "Enter private key:",
            mask: "*",
        },
    ]);

    // Validate
    const keyValidation = validatePrivateKey(privateKey);
    if (!keyValidation.valid) {
        showError(keyValidation.error || "Invalid private key");
        await promptContinue();
        return;
    }

    // Get password
    const { password, confirmPassword } = await inquirer.prompt([
        {
            type: "password",
            name: "password",
            message: "Create encryption password (min 8 chars):",
            mask: "*",
        },
        {
            type: "password",
            name: "confirmPassword",
            message: "Confirm password:",
            mask: "*",
        },
    ]);

    if (password !== confirmPassword) {
        showError("Passwords do not match");
        await promptContinue();
        return;
    }

    const pwdValidation = validatePassword(password);
    if (!pwdValidation.valid) {
        showError(pwdValidation.error || "Invalid password");
        await promptContinue();
        return;
    }

    // Import
    const spinner = createSpinner("Importing wallet...");
    spinner.start();

    const result = await importWallet(privateKey, password);
    spinner.stop();

    if (result.success) {
        showSuccess(`✅ Wallet imported: ${formatAddress(result.address!)}`);
    } else {
        showError(result.error || "Import failed");
    }

    await promptContinue();
}

/**
 * Screen: Import multiple wallets
 */
export async function batchImportScreen(): Promise<void> {
    showSectionTitle("📦 Batch Import Wallets");

    console.log(chalk.yellow("\n📝 Enter multiple private keys"));
    console.log(chalk.white("  Separate each key with a newline or comma.\n"));

    const { privateKeys } = await inquirer.prompt([
        {
            type: "editor",
            name: "privateKeys",
            message: "Enter private keys (one per line):",
        },
    ]);

    const keys = privateKeys
        .split(/[\n,]/)
        .map((k: string) => k.trim())
        .filter((k: string) => k && k.length > 0);

    if (keys.length === 0) {
        showWarning("No valid keys provided");
        await promptContinue();
        return;
    }

    showInfo(`Found ${keys.length} keys to import`);

    // Get password
    const { password, confirmPassword } = await inquirer.prompt([
        {
            type: "password",
            name: "password",
            message: "Create encryption password for all wallets:",
            mask: "*",
        },
        {
            type: "password",
            name: "confirmPassword",
            message: "Confirm password:",
            mask: "*",
        },
    ]);

    if (password !== confirmPassword) {
        showError("Passwords do not match");
        await promptContinue();
        return;
    }

    const confirmed = await promptConfirm(`Import ${keys.length} wallets?`);
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    // Import all
    const spinner = createSpinner("Importing wallets...");
    spinner.start();

    const result = await importWalletsBatch(keys, password);
    spinner.stop();

    console.log();
    if (result.successful.length > 0) {
        showSuccess(`✅ Successfully imported: ${result.successful.length} wallets`);
        result.successful.forEach(r => {
            console.log(chalk.green(`  ✓ ${formatAddress(r.address!)}`));
        });
    }

    if (result.failed.length > 0) {
        showWarning(`Failed to import: ${result.failed.length} wallets`);
        result.failed.forEach(r => {
            console.log(chalk.red(`  ✗ ${r.error}`));
        });
    }

    await promptContinue();
}

/**
 * Screen: Switch wallet
 */
export async function switchWalletScreen(): Promise<void> {
    showSectionTitle("🔄 Switch Wallet");

    const wallets = listWallets();
    
    if (wallets.length === 0) {
        showWarning("No wallets found. Please import a wallet first.");
        await promptContinue();
        return;
    }

    if (wallets.length === 1) {
        showInfo("Only one wallet available.");
        await promptContinue();
        return;
    }

    displayWallets(wallets);

    const { selectedIndex } = await inquirer.prompt([
        {
            type: "number",
            name: "selectedIndex",
            message: "Select wallet number:",
            validate: (v) => v >= 1 && v <= wallets.length || `Enter 1-${wallets.length}`,
        },
    ]);

    const selectedWallet = wallets[selectedIndex - 1];

    if (selectedWallet.isActive) {
        showInfo("This wallet is already active.");
        await promptContinue();
        return;
    }

    // Get password
    const password = await promptPassphrase();

    const spinner = createSpinner("Unlocking wallet...");
    spinner.start();

    const result = await unlockWallet(selectedWallet.address, password);
    spinner.stop();

    if (result.success) {
        showSuccess(`✅ Switched to wallet: ${formatAddress(result.address!)}`);
    } else {
        showError(result.error || "Failed to unlock wallet");
    }

    await promptContinue();
}

/**
 * Screen: Delete wallet
 */
export async function deleteWalletScreen(): Promise<void> {
    showSectionTitle("🗑️ Delete Wallet");

    const wallets = listWallets();
    
    if (wallets.length === 0) {
        showWarning("No wallets found.");
        await promptContinue();
        return;
    }

    displayWallets(wallets);

    const { selectedIndex } = await inquirer.prompt([
        {
            type: "number",
            name: "selectedIndex",
            message: "Select wallet to delete:",
            validate: (v) => v >= 1 && v <= wallets.length || `Enter 1-${wallets.length}`,
        },
    ]);

    const selectedWallet = wallets[selectedIndex - 1];

    console.log();
    console.log(chalk.red("⚠️  WARNING: This action cannot be undone!"));
    console.log(chalk.white(`   Wallet: ${selectedWallet.address}`));
    console.log();

    const confirmed = await promptConfirm("Are you sure you want to delete this wallet?");
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    const doubleConfirm = await promptConfirm("This is irreversible. Really delete?");
    if (!doubleConfirm) {
        showWarning("Cancelled");
        return;
    }

    const result = deleteWallet(selectedWallet.address);

    if (result.success) {
        showSuccess("✅ Wallet deleted");
    } else {
        showError(result.error || "Failed to delete wallet");
    }

    await promptContinue();
}

/**
 * Screen: Logout
 */
export async function logoutScreen(): Promise<void> {
    showSectionTitle("🚪 Logout");

    const confirmed = await promptConfirm("Logout and lock wallet?");
    if (!confirmed) {
        showWarning("Cancelled");
        return;
    }

    logout();
    showSuccess("✅ Logged out successfully");

    await promptContinue();
}

/**
 * Export screen functions
 */
export const walletScreens = {
    list: listWalletsScreen,
    import: importWalletScreen,
    batchImport: batchImportScreen,
    switch: switchWalletScreen,
    delete: deleteWalletScreen,
    logout: logoutScreen,
};
