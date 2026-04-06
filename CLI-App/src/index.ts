#!/usr/bin/env node
/**
 * Fishcake CLI Tool - Entry Point
 * Terminal interface for fishcake.io on Polygon Mainnet
 * 
 * Security Features (matching Fishcake wallet-sdk):
 * - AES-256-GCM encryption with PBKDF2 key derivation
 * - BIP-39 mnemonic support (12-24 words, multi-language)
 * - BIP-44 HD wallet derivation
 * - Secure memory handling
 */

import dotenv from "dotenv";
import chalk from "chalk";
import boxen from "boxen";
import { showWelcome, showError, showSuccess, showInfo, showWarning, createSpinner, showGoodbye } from "./frontend/display.js";
import { promptPrivateKey, promptPassphrase, promptConfirm, promptMnemonic, promptWalletSetupChoice, promptConfirmMnemonic } from "./frontend/prompts.js";
import { runMainMenu } from "./frontend/menu.js";
import {
    encryptPrivateKey,
    encryptMnemonic,
    decryptPrivateKey,
    saveKeystore,
    loadKeystore,
    keystoreExists,
    validatePrivateKey,
    normalizePrivateKey,
    generateMnemonic,
    validateMnemonic,
    mnemonicToPrivateKey,
    getKeystoreInfo,
    migrateKeystore,
} from "./wallet/keystore.js";
import { initializeProvider, initializeWallet, verifyConnection } from "./wallet/connection.js";
import { createProvider, verifyChainId, getExpectedChainId } from "./blockchain/provider.js";
import { loadDynamicAddresses, getContractInfo } from "./api/endpoints.js";
import { setDynamicAddresses, CHAIN_CONFIG } from "./config/addresses.js";
import { isApiAvailable } from "./api/client.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_KEYSTORE_PATH = path.join(__dirname, "..", "keystore", "wallet.enc");

function getKeystorePath(): string {
    return process.env.KEYSTORE_PATH || DEFAULT_KEYSTORE_PATH;
}

function getRpcUrl(): string {
    return process.env.RPC_URL || CHAIN_CONFIG.RPC_URL;
}

async function setupNewWallet(): Promise<string | null> {
    console.log(boxen(
        chalk.cyan.bold("🔐 SECURE WALLET SETUP\n\n") +
        chalk.dim("Your credentials will be encrypted with:\n") +
        chalk.dim("• AES-256-GCM authenticated encryption\n") +
        chalk.dim("• PBKDF2 key derivation (100,000 iterations)\n") +
        chalk.dim("• BIP-44 HD wallet derivation\n\n") +
        chalk.yellow("⚠️  Your keys are NEVER stored in plain text"),
        { padding: 1, borderColor: "cyan", borderStyle: "round" }
    ));
    
    try {
        const setupChoice = await promptWalletSetupChoice();
        
        let privateKey: string;
        let keystoreData: string;
        
        if (setupChoice === "privateKey") {
            // Import from private key
            const inputKey = await promptPrivateKey();
            
            if (!validatePrivateKey(inputKey)) {
                showError("Invalid private key format");
                return null;
            }
            
            privateKey = normalizePrivateKey(inputKey);
            
            console.log(chalk.cyan("\nSet a passphrase to encrypt your wallet:"));
            const passphrase = await promptPassphrase(true);
            
            keystoreData = encryptPrivateKey(privateKey, passphrase);
            
        } else if (setupChoice === "mnemonic") {
            // Import from mnemonic
            const mnemonic = await promptMnemonic();
            
            if (!validateMnemonic(mnemonic)) {
                showError("Invalid mnemonic phrase. Please check your words.");
                return null;
            }
            
            const spinner = createSpinner("Deriving wallet from mnemonic...");
            
            const { privateKey: derivedKey, address } = mnemonicToPrivateKey(mnemonic);
            privateKey = derivedKey;
            
            spinner.succeed(`Wallet derived: ${address}`);
            
            console.log(chalk.cyan("\nSet a passphrase to encrypt your wallet:"));
            const passphrase = await promptPassphrase(true);
            
            // Store mnemonic instead of just private key for potential future recovery
            keystoreData = encryptMnemonic(mnemonic, passphrase);
            
        } else {
            // Generate new wallet
            console.log(chalk.cyan("\n📝 Generating new BIP-39 mnemonic...\n"));
            
            const mnemonic = generateMnemonic(12, "english");
            
            // User must confirm they saved the mnemonic
            const confirmed = await promptConfirmMnemonic(mnemonic);
            
            if (!confirmed) {
                showError("You must save your mnemonic phrase to continue.");
                return null;
            }
            
            const spinner = createSpinner("Deriving wallet from mnemonic...");
            
            const { privateKey: derivedKey, address } = mnemonicToPrivateKey(mnemonic);
            privateKey = derivedKey;
            
            spinner.succeed(`New wallet created: ${address}`);
            
            console.log(chalk.cyan("\nSet a passphrase to encrypt your wallet:"));
            const passphrase = await promptPassphrase(true);
            
            // Store mnemonic for backup/recovery
            keystoreData = encryptMnemonic(mnemonic, passphrase);
        }
        
        const keystorePath = getKeystorePath();
        saveKeystore(keystorePath, keystoreData);
        
        showSuccess("Wallet encrypted and saved!");
        console.log(chalk.dim(`Keystore: ${keystorePath}`));
        console.log(chalk.dim(`Security: AES-256-GCM + PBKDF2 (100K iterations)\n`));
        
        return privateKey;
        
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        }
        return null;
    }
}

async function unlockWallet(): Promise<string | null> {
    const keystorePath = getKeystorePath();
    const keystoreData = loadKeystore(keystorePath);
    
    if (!keystoreData) {
        showError("Keystore file not found");
        return null;
    }
    
    // Show keystore info
    const info = getKeystoreInfo(keystorePath);
    if (info) {
        console.log(chalk.dim(`\n📁 Keystore: v${info.version} | ${info.derivedFrom} | ${info.address.slice(0, 10)}...`));
        
        // Offer migration if version 1
        if (info.version === 1) {
            showWarning("Your keystore uses legacy encryption. Consider migrating for enhanced security.");
        }
    }
    
    try {
        console.log(chalk.cyan("\n🔓 Unlock your wallet\n"));
        const passphrase = await promptPassphrase(false);
        
        const spinner = createSpinner("Decrypting wallet...");
        
        // Decrypt - could be private key or mnemonic
        const decrypted = decryptPrivateKey(keystoreData, passphrase);
        
        // Check if it's a mnemonic (contains spaces) or private key
        let privateKey: string;
        if (decrypted.includes(" ")) {
            // It's a mnemonic - derive private key
            spinner.text = "Deriving wallet from mnemonic...";
            const result = mnemonicToPrivateKey(decrypted);
            privateKey = result.privateKey;
        } else {
            // It's already a private key
            privateKey = normalizePrivateKey(decrypted);
        }
        
        spinner.succeed("Wallet unlocked");
        
        // Offer migration for legacy keystores
        if (info && info.version === 1) {
            const migrate = await promptConfirm("Migrate to enhanced security? (Recommended)");
            if (migrate) {
                const migrated = migrateKeystore(keystorePath, passphrase);
                if (migrated) {
                    showSuccess("Keystore upgraded to v2 (PBKDF2 + AES-256-GCM)");
                }
            }
        }
        
        return privateKey;
    } catch (error) {
        showError("Failed to unlock wallet. Wrong passphrase?");
        return null;
    }
}

async function initializeApp(): Promise<boolean> {
    const spinner = createSpinner("Initializing...");
    
    try {
        const rpcUrl = getRpcUrl();
        spinner.text = "Connecting to Polygon...";
        createProvider(rpcUrl);
        initializeProvider(rpcUrl);
        
        spinner.text = "Verifying chain ID...";
        const isCorrectChain = await verifyChainId();
        if (!isCorrectChain) {
            spinner.fail("Wrong network");
            showError(`Expected Polygon Mainnet (Chain ID: ${getExpectedChainId()})`);
            return false;
        }
        
        spinner.text = "Loading contract addresses...";
        try {
            const dynamicAddresses = await loadDynamicAddresses();
            if (dynamicAddresses) {
                setDynamicAddresses(dynamicAddresses);
                spinner.text = "Contract addresses loaded from API";
            }
        } catch {
            spinner.text = "Using fallback contract addresses";
        }
        
        spinner.succeed("Connected to Polygon Mainnet");
        
        return true;
    } catch (error) {
        spinner.fail("Initialization failed");
        if (error instanceof Error) {
            showError(error.message);
        }
        return false;
    }
}

async function main(): Promise<void> {
    console.clear();
    showWelcome();
    
    const initialized = await initializeApp();
    if (!initialized) {
        process.exit(1);
    }
    
    const keystorePath = getKeystorePath();
    let privateKey: string | null = null;
    
    if (keystoreExists(keystorePath)) {
        privateKey = await unlockWallet();
        
        if (!privateKey) {
            const retry = await promptConfirm("Try again?");
            if (retry) {
                privateKey = await unlockWallet();
            }
        }
        
        if (!privateKey) {
            const setupNew = await promptConfirm("Set up a new wallet instead?");
            if (setupNew) {
                privateKey = await setupNewWallet();
            }
        }
    } else {
        const wantSetup = await promptConfirm("No wallet found. Set up a new wallet?");
        if (wantSetup) {
            privateKey = await setupNewWallet();
        }
    }
    
    if (!privateKey) {
        showError("Cannot continue without a wallet");
        showGoodbye();
        process.exit(1);
    }
    
    try {
        const wallet = initializeWallet(privateKey);
        showSuccess(`Wallet connected: ${wallet.address}`);
        
        const connection = await verifyConnection();
        if (!connection.connected) {
            showError("Failed to verify blockchain connection");
            process.exit(1);
        }
        
        showInfo(`Block: ${connection.blockNumber} | Chain: ${connection.chainId}`);
        
        await runMainMenu();
        
    } catch (error) {
        if (error instanceof Error) {
            showError(`Wallet error: ${error.message}`);
        }
        process.exit(1);
    }
}

process.on("SIGINT", () => {
    showGoodbye();
    process.exit(0);
});

process.on("uncaughtException", (error) => {
    console.error(chalk.red("\n❌ Uncaught error:"), error.message);
    process.exit(1);
});

process.on("unhandledRejection", (error) => {
    console.error(chalk.red("\n❌ Unhandled rejection:"), error);
    process.exit(1);
});

main().catch((error) => {
    console.error(chalk.red("\n❌ Fatal error:"), error);
    process.exit(1);
});
