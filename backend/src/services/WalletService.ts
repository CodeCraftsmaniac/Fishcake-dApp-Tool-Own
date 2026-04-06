/**
 * Wallet Service - Business logic for wallet management
 * NO UI CODE - Pure wallet operations
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import os from "os";
import { 
    initializeWallet, 
    isWalletInitialized, 
    getWalletAddress, 
    disconnectWallet,
    getWallet,
} from "../wallet/connection.js";
import {
    encryptPrivateKey,
    decryptPrivateKey,
    saveKeystore,
    loadKeystore,
    keystoreExists,
    deleteKeystore,
    validatePrivateKey as keystoreValidatePrivateKey,
    normalizePrivateKey,
} from "../wallet/keystore.js";
import { verifyChainId } from "../blockchain/provider.js";

// Keystore directory
const KEYSTORE_DIR = path.join(os.homedir(), ".fishcake-cli", "keystore");
const ACTIVE_WALLET_FILE = path.join(os.homedir(), ".fishcake-cli", "active-wallet.json");

export interface WalletInfo {
    address: string;
    addressShort: string;
    isActive: boolean;
    filePath: string;
}

export interface ImportResult {
    success: boolean;
    address?: string;
    error?: string;
}

export interface UnlockResult {
    success: boolean;
    address?: string;
    error?: string;
}

/**
 * Ensure keystore directory exists
 */
function ensureKeystoreDir(): void {
    if (!fs.existsSync(KEYSTORE_DIR)) {
        fs.mkdirSync(KEYSTORE_DIR, { recursive: true, mode: 0o700 });
    }
}

/**
 * Get keystore path for address
 */
function getKeystorePath(address: string): string {
    return path.join(KEYSTORE_DIR, `${address.toLowerCase()}.json`);
}

/**
 * Check if any wallet is available
 */
export function hasWallet(): boolean {
    return listWallets().length > 0;
}

/**
 * Check if wallet is currently unlocked
 */
export function isWalletUnlocked(): boolean {
    return isWalletInitialized();
}

/**
 * Get current wallet address
 */
export function getCurrentWalletAddress(): string | null {
    if (!isWalletInitialized()) {
        return null;
    }
    return getWalletAddress();
}

/**
 * List all saved wallets
 */
export function listWallets(): WalletInfo[] {
    ensureKeystoreDir();
    
    const wallets: WalletInfo[] = [];
    const currentAddress = getCurrentWalletAddress();
    
    try {
        const files = fs.readdirSync(KEYSTORE_DIR);
        
        for (const file of files) {
            if (file.endsWith(".json")) {
                const filePath = path.join(KEYSTORE_DIR, file);
                const address = file.replace(".json", "");
                
                // Try to parse to verify it's a valid keystore
                try {
                    const content = fs.readFileSync(filePath, "utf-8");
                    JSON.parse(content); // Just validate JSON
                    
                    wallets.push({
                        address,
                        addressShort: `${address.slice(0, 6)}...${address.slice(-4)}`,
                        isActive: currentAddress?.toLowerCase() === address.toLowerCase(),
                        filePath,
                    });
                } catch {
                    // Skip invalid files
                }
            }
        }
    } catch {
        // Directory doesn't exist or can't be read
    }
    
    return wallets;
}

/**
 * Validate a private key format
 */
export function validatePrivateKey(privateKey: string): { valid: boolean; error?: string } {
    // Remove 0x prefix if present
    const cleanKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    
    if (cleanKey.length !== 64) {
        return { valid: false, error: "Private key must be 64 hex characters" };
    }
    
    if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
        return { valid: false, error: "Private key must contain only hex characters" };
    }
    
    try {
        const wallet = new ethers.Wallet(privateKey);
        if (!wallet.address) {
            return { valid: false, error: "Invalid private key" };
        }
    } catch {
        return { valid: false, error: "Invalid private key format" };
    }
    
    return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) {
        return { valid: false, error: "Password must be at least 8 characters" };
    }
    return { valid: true };
}

/**
 * Import a wallet from private key
 */
export async function importWallet(
    privateKey: string,
    password: string
): Promise<ImportResult> {
    // Validate private key
    const keyValidation = validatePrivateKey(privateKey);
    if (!keyValidation.valid) {
        return { success: false, error: keyValidation.error };
    }
    
    // Validate password
    const pwdValidation = validatePassword(password);
    if (!pwdValidation.valid) {
        return { success: false, error: pwdValidation.error };
    }
    
    try {
        // Create wallet from private key
        const wallet = new ethers.Wallet(privateKey);
        const address = wallet.address.toLowerCase();
        
        // Check if already exists
        const keystorePath = getKeystorePath(address);
        if (keystoreExists(keystorePath)) {
            return { success: false, error: "Wallet already imported" };
        }
        
        // Encrypt and save
        const encrypted = encryptPrivateKey(privateKey, password, address);
        ensureKeystoreDir();
        saveKeystore(keystorePath, encrypted);
        
        return { success: true, address };
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to import wallet" 
        };
    }
}

/**
 * Import multiple wallets
 */
export async function importWalletsBatch(
    privateKeys: string[],
    password: string
): Promise<{ successful: ImportResult[]; failed: ImportResult[] }> {
    const successful: ImportResult[] = [];
    const failed: ImportResult[] = [];
    
    for (const key of privateKeys) {
        const result = await importWallet(key.trim(), password);
        if (result.success) {
            successful.push(result);
        } else {
            failed.push(result);
        }
    }
    
    return { successful, failed };
}

/**
 * Unlock a wallet
 */
export async function unlockWallet(
    address: string,
    password: string
): Promise<UnlockResult> {
    try {
        // Load keystore
        const keystorePath = getKeystorePath(address);
        const keystoreData = loadKeystore(keystorePath);
        
        if (!keystoreData) {
            return { success: false, error: "Wallet not found" };
        }
        
        // Decrypt
        const privateKey = decryptPrivateKey(keystoreData, password);
        
        // Initialize wallet
        initializeWallet(privateKey);
        
        // Verify network
        const isPolygon = await verifyChainId();
        if (!isPolygon) {
            disconnectWallet();
            return { success: false, error: "Not connected to Polygon Mainnet" };
        }
        
        // Save as active wallet
        saveActiveWallet(address);
        
        return { success: true, address };
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to unlock wallet" 
        };
    }
}

/**
 * Save active wallet address
 */
function saveActiveWallet(address: string): void {
    const dir = path.dirname(ACTIVE_WALLET_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ACTIVE_WALLET_FILE, JSON.stringify({ address }));
}

/**
 * Get last active wallet
 */
export function getLastActiveWallet(): string | null {
    try {
        if (fs.existsSync(ACTIVE_WALLET_FILE)) {
            const data = JSON.parse(fs.readFileSync(ACTIVE_WALLET_FILE, "utf-8"));
            return data.address;
        }
    } catch {
        // Ignore
    }
    return null;
}

/**
 * Clear active wallet
 */
function clearActiveWallet(): void {
    try {
        if (fs.existsSync(ACTIVE_WALLET_FILE)) {
            fs.unlinkSync(ACTIVE_WALLET_FILE);
        }
    } catch {
        // Ignore
    }
}

/**
 * Logout / disconnect current wallet
 */
export function logout(): void {
    disconnectWallet();
    clearActiveWallet();
}

/**
 * Delete a wallet
 */
export function deleteWallet(address: string): { success: boolean; error?: string } {
    // Check if it's the current wallet
    const currentAddress = getCurrentWalletAddress();
    if (currentAddress?.toLowerCase() === address.toLowerCase()) {
        logout();
    }
    
    try {
        const keystorePath = getKeystorePath(address);
        deleteKeystore(keystorePath);
        return { success: true };
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to delete wallet" 
        };
    }
}

/**
 * Get wallet for signing (internal use)
 */
export function getSigningWallet(): ethers.Wallet | null {
    if (!isWalletInitialized()) {
        return null;
    }
    return getWallet();
}

/**
 * Check if address is valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
}

/**
 * Format address for display
 */
export function formatAddress(address: string, chars: number = 4): string {
    if (!address) return "";
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
